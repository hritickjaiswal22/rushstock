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
  encodeZSetMember,
  decodeZSetMember,
} from "../utils/redis";
import { MAX_HOLD_INTERVAL_SECONDS } from "../utils/constants";

export async function createHold(body: PostHoldBody, userId: string) {
  const { idempotencyId, quantity, saleId } = body;
  const expiresAt = Date.now() + MAX_HOLD_INTERVAL_SECONDS * 1000;

  await redis.zadd(getSortedSetkey(saleId), {
    score: Date.now() + 1 * 60 * 1000,
    member: encodeZSetMember("1", userId),
  });

  await redis.zadd(getSortedSetkey(saleId), {
    score: Date.now() + 2 * 60 * 1000,
    member: encodeZSetMember("2", userId),
  });

  await redis.zadd(getSortedSetkey(saleId), {
    score: Date.now() + 3 * 60 * 1000,
    member: encodeZSetMember("3", userId),
  });

  const res = await redis.zrange(
    getSortedSetkey(saleId),
    "-inf",
    Date.now() + 130_000,
    { byScore: true },
  );

  return res.map((val) => decodeZSetMember(val as string));
}
