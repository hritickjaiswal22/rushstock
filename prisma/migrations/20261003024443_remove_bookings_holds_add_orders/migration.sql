/*
  Warnings:

  - You are about to drop the `bookings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `holds` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'EXPIRED', 'SUCCESS', 'FAILED');

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "holds" DROP CONSTRAINT "holds_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "holds" DROP CONSTRAINT "holds_user_id_fkey";

-- DropTable
DROP TABLE "bookings";

-- DropTable
DROP TABLE "holds";

-- DropEnum
DROP TYPE "HoldStatus";

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "idempotency_id" TEXT NOT NULL,
    "quantity" SMALLINT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_id_key" ON "orders"("idempotency_id");

-- CreateIndex
CREATE INDEX "orders_sale_id_user_id_idx" ON "orders"("sale_id", "user_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Manual: CHECK constraint Prisma can't express
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_quantity_positive" CHECK ("quantity" > 0);

-- Manual: at most one PENDING or SUCCESS order per (sale_id, user_id)
CREATE UNIQUE INDEX "orders_sale_id_user_id_active_key"
  ON "orders"("sale_id", "user_id")
  WHERE "status" IN ('PENDING', 'SUCCESS');

-- Manual: terminal status immutability
CREATE OR REPLACE FUNCTION prevent_terminal_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('EXPIRED', 'SUCCESS', 'FAILED') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Cannot change status from terminal state % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_prevent_terminal_order_status_change
BEFORE UPDATE ON "orders"
FOR EACH ROW
EXECUTE FUNCTION prevent_terminal_order_status_change();