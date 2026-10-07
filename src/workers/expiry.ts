// src/workers/expiry.worker.ts
import { Worker } from "bullmq";
import connection from "../lib/redisIO";
import { EXPIRY_QUEUE_NAME } from "../queues/expiry";
import { prisma } from "../lib/prisma";
import { evalScript } from "../lib/redis";
import {
  getSortedSetkey,
  getStockKey,
  getPendingKey,
  getBoughtKey,
} from "../utils/redis";
import {
  FAIL_SCRIPT as RELEASE_SCRIPT,
  RESERVE_SCRIPT as PAID_CLEANUP_SCRIPT,
} from "../services/bookings";

const expiryWorker = new Worker(
  EXPIRY_QUEUE_NAME,
  async (job) => {
    const { orderId, userId, saleId } = job.data;
    console.log(`Processing expiry for order: ${orderId}`);

    // 1. The "Smart Update" against Postgres
    const result = await prisma.$executeRaw`
      UPDATE orders
      SET status = 'EXPIRED'
      WHERE id = ${orderId} AND status = 'PENDING'
    `;

    // 2. Logic to safely release stock in Redis
    if (result === 1) {
      // Postgres says we successfully expired a PENDING order.
      // Now, atomically remove from ZSET and return stock.
      console.log(`Order ${orderId} expired. Releasing stock.`);
      await evalScript(
        RELEASE_SCRIPT,
        [getSortedSetkey(saleId), getStockKey(saleId), getPendingKey(saleId)],
        [`${orderId}:${userId}`, userId],
      );
    } else {
      // Postgres did nothing. The order was already SUCCESS or FAILED.
      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (order?.status === "SUCCESS") {
        // The user paid. Clean up the ZSET, but DO NOT return stock.
        console.log(`Order ${orderId} was paid. Cleaning up Redis.`);
        await evalScript(
          PAID_CLEANUP_SCRIPT,
          [
            getSortedSetkey(saleId),
            getBoughtKey(saleId),
            getPendingKey(saleId),
          ],
          [`${orderId}:${userId}`, userId],
        );
      } else {
        // The order was already expired or failed or null. Just clean up Redis.
        console.log(`Order ${orderId} already handled. Cleaning up.`);
        await evalScript(
          RELEASE_SCRIPT,
          [getSortedSetkey(saleId), getStockKey(saleId), getPendingKey(saleId)],
          [`${orderId}:${userId}`, userId],
        );
      }
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
  },
);

expiryWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed.`);
});

expiryWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} has failed:`, err);
});

console.log("Expiry worker is running...");
