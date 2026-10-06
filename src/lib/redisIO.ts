// src/config/redis.ts
import IORedis from "ioredis";
import "dotenv/config";

if (!process.env.UPSTASH_REDIS_URL) {
  throw new Error("REDIS_URL is missing from environment variables");
}

// Use the TLS-enabled connection string from Upstash.
// It should look like: rediss://default:YOUR_PASSWORD@your-endpoint.upstash.io:6379
const connection = new IORedis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Upstash uses a valid certificate, so we don't need to disable TLS verification.
  // This is the recommended setup for security.
});

connection.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export default connection;
