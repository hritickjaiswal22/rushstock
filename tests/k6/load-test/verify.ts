import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../../../src/lib/prisma";
import { Redis } from "ioredis";

async function main() {
  const fixtures = JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "tests/k6/fixtures.json"),
      "utf-8",
    ),
  );
  const { saleId, stock: initialStock } = fixtures;

  const redis = new Redis(process.env.REDIS_URL!);

  // 1. Redis stock must be exactly 0
  const redisStock = await redis.get(`${saleId}:stock`);
  console.log(`Redis stock: ${redisStock}`);
  if (redisStock !== "0") {
    throw new Error(`Expected Redis stock 0, got ${redisStock}`);
  }

  // 2. Postgres must have exactly 100 PENDING orders
  const pendingCount = await prisma.order.count({
    where: { saleId, status: "PENDING" },
  });
  console.log(`Postgres PENDING orders: ${pendingCount}`);
  if (pendingCount !== initialStock) {
    throw new Error(`Expected ${initialStock} PENDING, got ${pendingCount}`);
  }

  // 3. Postgres sale.stock_quantity must still be 100 (not decremented — that happens on confirm)
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { stockQuantity: true },
  });
  console.log(`Postgres sale.stock_quantity: ${sale?.stockQuantity}`);
  if (sale?.stockQuantity !== initialStock) {
    throw new Error(
      `Expected sale stock ${initialStock}, got ${sale?.stockQuantity}`,
    );
  }

  // 4. No negative stock anywhere
  if (Number(redisStock) < 0) {
    throw new Error(`Negative stock detected: ${redisStock}`);
  }

  console.log("\n✅ ALL ASSERTIONS PASSED");
  await redis.quit();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
