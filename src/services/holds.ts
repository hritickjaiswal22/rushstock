import { PostHoldBody } from "../validators/holds";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../utils/ApiError";

export async function postHold(body: PostHoldBody, userId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const sale = await tx.sale.update({
        data: {
          stockQuantity: { decrement: body.quantity },
        },
        where: {
          id: body.saleId,
          stockQuantity: {
            gte: body.quantity,
          },
          startAt: {
            lte: now, // equivalent to startAt <= NOW()
          },
          endAt: {
            gt: now, // equivalent to endAt > NOW()
          },
        },
        select: {
          authorId: true,
          endAt: true,
          id: true,
          productId: true,
          startAt: true,
          stockQuantity: true,
          unitPrice: true,
        },
      });

      const newHold = await tx.hold.create({
        data: {
          quantity: body.quantity,
          saleId: sale.id,
          userId,
        },
        select: {
          id: true,
          quantity: true,
          saleId: true,
          userId: true,
          status: true,
          expiresAt: true,
        },
      });

      return {
        hold: newHold,
        expiresAt: newHold.expiresAt,
      };
    });

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      const sale = await prisma.sale.findUnique({
        where: {
          id: body.saleId,
        },
      });
      const now = new Date();

      if (!sale)
        throw new NotFoundError(
          "Sale not found - Invalid Sale Id provided",
          "SALE_NOT_FOUND",
        );

      if (sale.stockQuantity < body.quantity)
        throw new BadRequestError(
          "The requested item is currently out of stock.",
          "OUT_OF_STOCK",
        );

      if (now < sale.startAt || now > sale.endAt) {
        throw new BadRequestError("The sale is not live", "SALE_NOT_LIVE");
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError(
        "The requested item is currently in active hold state. Please complete payment",
        "ACTIVE_HOLD",
      );
    }

    throw error;
  }
}
