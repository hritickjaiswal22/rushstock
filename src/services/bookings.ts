import { PostBookingBody } from "../validators/bookings";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { ConflictError, BadRequestError } from "../utils/ApiError";
import { getSortedSetkey, getBoughtKey, getPendingKey } from "../utils/redis";

export type ReserveScriptResult = ["OK"] | ["ALREADY_BOUGHT"] | ["EXPIRED"];

export const RESERVE_SCRIPT = `
-- KEYS[1]=zset KEYS[2]=bought KEYS[3]=pending
-- ARGV[1]=zsetMember ARGV[2]=userId

local removed = redis.call('ZREM', KEYS[1], ARGV[1])

if removed == 1 then
  redis.call('SADD', KEYS[2], ARGV[2])
  redis.call('HDEL', KEYS[3], ARGV[2])
  -- no INCR
  return { 'OK' }
end

-- Duplicate confirm: already marked as bought
if redis.call('SISMEMBER', KEYS[2], ARGV[2]) == 1 then
  return { 'ALREADY_BOUGHT' }
end

return { 'EXPIRED' }
`;

async function successfulReservation(
  { idempotencyId, orderId, saleId }: PostBookingBody,
  userId: string,
) {
  const order = await prisma.$transaction(async (tx) => {
    const now = new Date();

    const sales = await tx.$queryRaw<
      Array<{ id: string; stockQuantity: number }>
    >`
      SELECT id, stock_quantity as "stockQuantity"
      FROM sales
      WHERE id = ${saleId}::uuid
        AND stock_quantity > 0
      FOR UPDATE
    `;

    const sale = sales[0];

    if (!sale) {
      throw new BadRequestError(
        "Sale is invalid, inactive, or has expired.",
        "INVALID_SALE",
      );
    }

    const order = await tx.order.update({
      where: {
        saleId,
        userId,
        id: orderId,
        expiresAt: {
          gt: now,
        },
        idempotencyId,
        status: "PENDING",
      },
      data: {
        status: "SUCCESS",
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

    await tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        stockQuantity: {
          decrement: 1,
        },
      },
    });

    return order;
  });

  const res = (await redis.eval(
    RESERVE_SCRIPT,
    // KEYS
    [getSortedSetkey(saleId), getBoughtKey(saleId), getPendingKey(saleId)],
    // ARGS
    [`${orderId}:${userId}`, userId],
  )) as ReserveScriptResult;

  if (res[0] === "OK") return order;
}

async function failReservation(body: PostBookingBody, userId: string) {}

export async function postBooking(body: PostBookingBody, userId: string) {
  if (body.paymentState === "SUCCESS")
    return await successfulReservation(body, userId);

  return await failReservation(body, userId);
}
