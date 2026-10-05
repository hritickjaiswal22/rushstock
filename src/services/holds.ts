import { uuidv7 } from "uuidv7";

import { PostHoldBody } from "../validators/holds";
import { prisma } from "../lib/prisma";
import { BadRequestError, ConflictError } from "../utils/ApiError";
import { redis } from "../lib/redis";
import {
  getStockKey,
  getSortedSetkey,
  getBoughtKey,
  getIdempotencyKey,
  getPendingKey,
  encodeZSetMember,
  decodeZSetMember,
} from "../utils/redis";
import { MAX_HOLD_INTERVAL_SECONDS } from "../utils/constants";

export type OrderScriptResult =
  | ["OK", string]
  | ["IDEMPOTENT", string]
  | ["ALREADY_BOUGHT"]
  | ["ALREADY_PENDING"]
  | ["NO_STOCK"];

export const ORDER_SCRIPT = `
-- KEYS[1]=idempotency KEYS[2]=bought KEYS[3]=pending KEYS[4]=stock KEYS[5]=zset
-- ARGV[1]=idempotencyId ARGV[2]=userId ARGV[3]=orderId
-- ARGV[4]=zsetMember ARGV[5]=expiresAtMs

local existing = redis.call('HGET', KEYS[1], ARGV[1]) 
if existing then return { 'IDEMPOTENT', existing } end

if redis.call('SISMEMBER', KEYS[2], ARGV[2]) == 1 then
  return { 'ALREADY_BOUGHT' }
end

if redis.call('HEXISTS', KEYS[3], ARGV[2]) == 1 then
  return { 'ALREADY_PENDING' }
end

local stock = redis.call('GET', KEYS[4])
if not stock or tonumber(stock) <= 0 then
  return { 'NO_STOCK' }
end

redis.call('DECR', KEYS[4])
redis.call('ZADD', KEYS[5], ARGV[5], ARGV[4])
redis.call('HSET', KEYS[3], ARGV[2], ARGV[3])
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])

return { 'OK', ARGV[3] }
`;

export const REVERT_ORDER_SCRIPT = `
-- KEYS[1]=idempotency KEYS[2]=pending KEYS[3]=stock KEYS[4]=zset
-- ARGV[1]=idempotencyId ARGV[2]=userId ARGV[3]=zsetMember

-- 1. Remove idempotency mapping
redis.call('HDEL', KEYS[1], ARGV[1])

-- 2. Remove user's pending status
redis.call('HDEL', KEYS[2], ARGV[2])

-- 3. Restore 1 item back to stock
redis.call('INCR', KEYS[3])

-- 4. Remove entry from expiration sorted set
redis.call('ZREM', KEYS[4], ARGV[3])

return 'OK'
`;

/*

# Logic

The logic is very simple 

- The api hits the server and the endpoint
- The request has saleId and frontend generated idempotencyId and userId from jwt auth
- Generate uuid v7 orderId (used uuid v7 because it is time wise generated and will help avoiding index fragmentation in SQL table)
- Executing redis lua script
  - Checking idempotency id
    - If match then exit redis and return idempotency state of the orderId from the stored orderId from SQL  
  - Check bought set if present throw error else continue
  - Check pending hash if present throw error else continue
  - Check stock if present continue else throw error
  - Store all the values in redis
  - Return success
- Start a transaction
  - Put a row lock on saleId and check if sale is live 
  - If no sale found throw error else continue
  - If stock is present if not found throw error else continue
  - Create a new order row with status 'PENDING' and expiresAt
  - Return that order
- Return order
- Handle redis cleanup of above operations if transaction fails


# Assumptions

- I am assuming that this implementation assumes Redis acts as the authority for hold creation, ensuring a hold is only created when inventory - sold - active_holds > 0 (and not putting those checks in SQL or should I ???)

# Gaps

- No Automatic Cleanup & Self-Healing for the case idempotent hit but no order row found (Split brain); Reason then worker would be the only identity responsible for stock increment 
- Returning `order` for success idempotent check which then will get converted to message successful hold created by controller
- Proper message and response for frontend is not handled at all
*/

async function getIdempotencyState(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        idempotencyId: true,
        expiresAt: true,
        quantity: true,
        saleId: true,
        status: true,
        userId: true,
      },
    });

    if (!order)
      throw new ConflictError(
        "Transaction state could not be finalized. Please retry with a new idempotency key.",
        "RETRY_WITH_NEW_IDEMPOTENCY_KEY",
        {
          retryable: true,
          action: "GENERATE_NEW_IDEMPOTENCY_KEY",
        },
      );

    switch (order.status) {
      case "SUCCESS":
        throw new ConflictError(
          "You have already purchased this item.",
          "ITEM_ALREADY_PURCHASED",
        );

      case "EXPIRED":
        // The hold or window expired before payment finished
        throw new ConflictError(
          "The hold for this order has expired. Please re-select your items and try again.",
          "RETRY_WITH_NEW_IDEMPOTENCY_KEY",
        );

      case "PENDING":
        const isExpired = Date.now() >= new Date(order.expiresAt).getTime();

        if (isExpired) {
          throw new ConflictError(
            "The hold for this order has expired. Please re-select your items and try again.",
            "RETRY_WITH_NEW_IDEMPOTENCY_KEY",
          );
        }
        // Prevent double charges while gateway/DB is working
        throw new ConflictError(
          "Payment processing is currently in progress. Please do not re-submit or complete payment.",
          "PAYMENT_IN_PROGRESS",
        );

      case "FAILED":
        // Permanent payment failure for this transaction attempt
        throw new ConflictError(
          "The previous payment attempt failed. Please try again with a new key or different payment method.",
          "RETRY_WITH_NEW_IDEMPOTENCY_KEY",
        );
    }
  } catch (error) {
    // TODO: Handle the case of `prisma.order` exception
    throw error;
  }
}

interface RevertRedisHoldParams {
  saleId: string;
  idempotencyId: string;
  userId: string;
  orderId: string;
}

async function revertRedisHold({
  saleId,
  idempotencyId,
  userId,
  orderId,
}: RevertRedisHoldParams) {
  // Re-construct the exact zset member string used in ORDER_SCRIPT: `${orderId}:${userId}`
  const zsetMember = `${orderId}:${userId}`;

  return await redis.eval(
    REVERT_ORDER_SCRIPT,
    // KEYS - matches key positions expected by REVERT_ORDER_SCRIPT
    [
      getIdempotencyKey(saleId), // KEYS[1]
      getPendingKey(saleId), // KEYS[2]
      getStockKey(saleId), // KEYS[3]
      getSortedSetkey(saleId), // KEYS[4]
    ],
    // ARGS
    [
      idempotencyId, // ARGV[1]
      userId, // ARGV[2]
      zsetMember, // ARGV[3]
    ],
  );
}

export async function postHold(body: PostHoldBody, userId: string) {
  const { idempotencyId, quantity, saleId } = body;
  const expiresAt = Date.now() + MAX_HOLD_INTERVAL_SECONDS * 1000;
  const orderId = uuidv7();

  const res = (await redis.eval(
    ORDER_SCRIPT,
    // KEYS
    [
      getIdempotencyKey(saleId),
      getBoughtKey(saleId),
      getPendingKey(saleId),
      getStockKey(saleId),
      getSortedSetkey(saleId),
    ],
    // ARGS
    [idempotencyId, userId, orderId, `${orderId}:${userId}`, expiresAt],
  )) as OrderScriptResult;

  const [status, payload] = res;

  if (status === "IDEMPOTENT") {
    return await getIdempotencyState(payload);
  } else if (status === "ALREADY_BOUGHT") {
    throw new ConflictError(
      "You have already purchased this item.",
      "ITEM_ALREADY_PURCHASED",
    );
  } else if (status === "ALREADY_PENDING") {
    throw new ConflictError(
      "A pending hold already exists for this item.",
      "PENDING_HOLD_EXISTS",
      { orderId },
    );
  } else if (status === "NO_STOCK") {
    throw new ConflictError(
      "The requested item is out of stock.",
      "OUT_OF_STOCK",
    );
  }

  try {
    const newOrder = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Fetch & lock the Sale row to check time validity
      // Using $queryRaw with FOR UPDATE prevents concurrent race conditions
      const sales = await tx.$queryRaw<
        Array<{ id: string; stockQuantity: number }>
      >`
      SELECT id, stock_quantity as "stockQuantity"
      FROM sales
      WHERE id = ${saleId}::uuid
        AND start_at <= ${now}
        AND end_at > ${now}
      FOR UPDATE
    `;

      const sale = sales[0];

      if (!sale) {
        throw new BadRequestError(
          "Sale is invalid, inactive, or has expired.",
          "INVALID_SALE",
        );
      }

      if (sale.stockQuantity < quantity) {
        throw new ConflictError(
          "Insufficient stock available for this sale.",
          "OUT_OF_STOCK",
        );
      }

      // Calculate order expiration time
      const expiresAt = new Date(
        now.getTime() + MAX_HOLD_INTERVAL_SECONDS * 1000,
      );

      // 2. Insert the PENDING Order
      const newOrder = await tx.order.create({
        data: {
          id: orderId,
          saleId,
          userId,
          idempotencyId,
          quantity,
          status: "PENDING",
          expiresAt,
        },
        select: {
          id: true,
          idempotencyId: true,
          expiresAt: true,
          quantity: true,
          saleId: true,
          status: true,
          userId: true,
        },
      });

      return newOrder;
    });

    return newOrder;
  } catch (dbError) {
    try {
      await revertRedisHold({
        saleId,
        idempotencyId,
        userId,
        orderId,
      });
    } catch (redisRollbackError) {
      // Log critical alert: Redis state out of sync if rollback itself fails
      console.error(
        `CRITICAL: Failed to rollback Redis state for order ${orderId}`,
        redisRollbackError,
      );
    }

    throw dbError;
  }
}
