import { PostBookingBody } from "../validators/bookings";
import { prisma } from "../lib/prisma";

export async function postBooking(body: PostBookingBody, userId: string) {
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

      const newBooking = await tx.booking.create({
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
        },
      });

      return {
        sale,
        booking: newBooking,
      };
    });

    return result;
  } catch (error) {
    // TODO: Handle various cases of errors while testing

    throw error;
  }
}
