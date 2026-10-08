// Production

// import { Redis } from "@upstash/redis";

// export const redis = Redis.fromEnv();

// For local testing

import IORedis from "ioredis";
import "dotenv/config";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is missing from environment variables");
}

export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

/**
 * Wrapper around ioredis.eval that uses the same calling convention as
 * Upstash's eval — (script, keys[], args[]) — so our service code stays clean.
 *
 * ioredis internally wants:  eval(script, numKeys, ...keys, ...args)
 */
export async function evalScript(
  script: string,
  keys: string[],
  args: (string | number)[],
): Promise<unknown> {
  return redis.eval(script, keys.length, ...keys, ...args.map(String));
}
