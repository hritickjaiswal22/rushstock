import { z } from "zod";

export const postBookingSchema = z.object({
  body: z.object({
    saleId: z.uuid("Sale ID required"),
    quantity: z.number().int().positive("Quantity must be a positive integer"),
  }),
});

export type PostBookingBody = z.infer<typeof postBookingSchema>["body"];
