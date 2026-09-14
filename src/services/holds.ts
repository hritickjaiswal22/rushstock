import { PostHoldBody } from "../validators/holds";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";

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
    throw error;
  }
}
