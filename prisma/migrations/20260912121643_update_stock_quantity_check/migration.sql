-- Drop the old constraint
ALTER TABLE "sales" DROP CONSTRAINT "sales_stock_quantity_positive";

-- Add the new constraint with >= 0
ALTER TABLE "sales" ADD CONSTRAINT "sales_stock_quantity_positive" CHECK ("stock_quantity" >= 0);