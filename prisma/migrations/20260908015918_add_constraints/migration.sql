-- Enable extension for exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Composite index (if not already created by Prisma)
-- CREATE INDEX "sales_product_id_start_at_end_at_idx" ON "sales"("product_id", "start_at", "end_at");

-- CHECK constraints
ALTER TABLE "sales" ADD CONSTRAINT "sales_start_before_end" CHECK ("start_at" < "end_at");
ALTER TABLE "sales" ADD CONSTRAINT "sales_stock_quantity_positive" CHECK ("stock_quantity" > 0);
ALTER TABLE "sales" ADD CONSTRAINT "sales_unit_price_positive" CHECK ("unit_price" > 0);

ALTER TABLE "products" ADD CONSTRAINT "products_price_positive" CHECK ("price" > 0);

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quantity_positive" CHECK ("quantity" > 0);

-- Exclusion constraint to prevent overlapping sales for the same product
ALTER TABLE "sales"
ADD CONSTRAINT "sales_no_overlap"
EXCLUDE USING gist (
  "product_id" WITH =,
  tstzrange("start_at", "end_at", '[)') WITH &&
);