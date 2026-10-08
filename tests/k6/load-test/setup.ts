import "dotenv/config";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "../../../src/lib/prisma";
import { Redis } from "ioredis";

const NUM_USERS = 10_000;
const STOCK = 100;

async function main() {
  const redis = new Redis(process.env.REDIS_URL!);
  const runId = Date.now().toString(36);

  console.log(`runId: ${runId}`);

  // 1. Admin user (FK for sale.authorId)
  const admin = await prisma.user.create({
    data: {
      name: "load-test-admin",
      email: `admin-${runId}@test.local`,
      password: "x",
      role: "ADMIN",
    },
  });

  // 2. Product (FK for sale.productId)
  const product = await prisma.product.create({
    data: {
      title: "Load Test Product",
      description: "for k6 oversell test",
      price: 10,
    },
  });

  // 3. Sale — startAt in the PAST so it's live immediately.
  //    endAt 1 hour in the future so it doesn't end mid-test.
  const now = Date.now();
  const sale = await prisma.sale.create({
    data: {
      authorId: admin.id,
      productId: product.id,
      unitPrice: 10,
      stockQuantity: STOCK,
      startAt: new Date(now - 60_000),
      endAt: new Date(now + 60 * 60 * 1000),
    },
  });
  console.log(`saleId: ${sale.id}`);

  // 4. Seed the Redis stock key (this is what the Lua script reads)
  await redis.set(`${sale.id}:stock`, STOCK.toString());
  console.log(`seeded redis stock = ${STOCK}`);

  // 5. Bulk-create 10,000 users with pre-generated IDs so we know them
  const userIds = Array.from({ length: NUM_USERS }, () => randomUUID());
  await prisma.user.createMany({
    data: userIds.map((id, i) => ({
      id,
      name: `lt-user-${i}`,
      email: `lt-user-${i}-${runId}@test.local`,
      password: "x",
      role: "USER" as const,
    })),
  });
  console.log(`created ${userIds.length} users`);

  // 6. Sign one JWT + one idempotencyId per user
  const secret = process.env.JWT_ACCESS_SECRET!;
  const users = userIds.map((userId) => ({
    token: jwt.sign({ userId, role: "USER" }, secret, { expiresIn: "2h" }),
    idempotencyId: randomUUID(),
  }));

  // 7. Write fixtures.json for k6 to consume
  const fixturePath = path.resolve(process.cwd(), "tests/k6/fixtures.json");
  fs.writeFileSync(
    fixturePath,
    JSON.stringify({ saleId: sale.id, stock: STOCK, users }),
  );
  console.log(`wrote ${fixturePath}`);

  console.log("\n=== SETUP DONE ===");
  console.log(`SALE_ID=${sale.id}`);

  await redis.quit();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
