-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED');

-- CreateTable
CREATE TABLE "holds" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "quantity" SMALLINT NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT now() + interval '5 minutes',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "holds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "holds_sale_id_user_id_idx" ON "holds"("sale_id", "user_id");

-- Partial unique index: a user can have at most ONE active hold per sale
CREATE UNIQUE INDEX "holds_user_sale_active_key"
    ON "holds" ("user_id", "sale_id")
    WHERE "status" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
