import { z } from "zod";

export const postBookingSchema = z.object({
  body: z.object({
    saleId: z.uuid("Sale ID required"),
    quantity: z.literal(1, { error: "Quantity must be 1" }),
    idempotencyId: z.uuid("Idempotency Key/Id is required"),
  }),
});

export type PostBookingBody = z.infer<typeof postBookingSchema>["body"];
