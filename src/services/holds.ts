import { PostHoldBody } from "../validators/holds";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../utils/ApiError";
import { redis } from "../lib/redis";
import { getStockKey } from "../utils/redisKeys";

export async function createHold(body: PostHoldBody, userId: string) {
  const res = await redis.decrby(getStockKey(body.saleId), body.quantity);

  return await redis.get(getStockKey(body.saleId));
}
