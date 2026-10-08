import { Queue } from "bullmq";
import connection from "../lib/redisIO";

export const EXPIRY_QUEUE_NAME = "reservation-expiry";

export const expiryQueue = new Queue(EXPIRY_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: true, // Automatically clean up successful jobs
    removeOnFail: 100, // Keep the last 100 failed jobs for debugging
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
  },
});

export async function scheduleExpiry(
  orderId: string,
  data: { saleId: string; userId: string; orderId: string },
  ttlMs: number,
) {
  return expiryQueue.add("expire-reservation", data, {
    delay: ttlMs,
    // This is critical: using orderId as the jobId gives you idempotency for free.
    // BullMQ will not add a job if one with the same ID already exists.
    jobId: orderId,
  });
}
