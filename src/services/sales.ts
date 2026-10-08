import { PostSaleBody } from "../validators/sales";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";
import { redis } from "../lib/redis";
import { getStockKey } from "../utils/redis";
import { ConflictError } from "../utils/ApiError";

export async function postSale(body: PostSaleBody) {
  try {
    const newSale = await prisma.sale.create({
      data: {
        ...body,
      },
      select: {
        id: true,
        authorId: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        productId: true,
        unitPrice: true,
        stockQuantity: true,
      },
    });

    const res = await redis.set(getStockKey(newSale.id), newSale.stockQuantity);

    return newSale;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2039"
    ) {
      throw new ConflictError(
        "Overlapping sale for same product cannot be created",
        "SALE_OVERLAP",
      );
    }

    throw error;
  }
}
