import { PostHoldBody } from "../validators/holds";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../utils/ApiError";
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

export async function createHold(body: PostHoldBody, userId: string) {
  const { idempotencyId, quantity, saleId } = body;
  const expiresAt = Date.now() + MAX_HOLD_INTERVAL_SECONDS * 1000;
  const orderId = "1";

  const res = await redis.eval(
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
  );

  return res;
}
