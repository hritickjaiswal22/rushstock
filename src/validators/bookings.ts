import { z } from "zod";

export const postBookingSchema = z.object({
  body: z.object({
    saleId: z.uuid("Sale ID required"),
    orderId: z.uuid("orderId is required"),
    idempotencyId: z.uuid("Idempotency Key/Id is required"),
    paymentState: z.enum(["SUCCESS", "FAIL"], {
      error: "paymentState is required",
    }),
  }),
});

export type PostBookingBody = z.infer<typeof postBookingSchema>["body"];
