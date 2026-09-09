import { z } from "zod";

export const postSaleSchema = z.object({
  body: z
    .object({
      authorId: z.uuid("Admin ID required"),
      productId: z.uuid("Product ID required"),
      startAt: z.coerce.date({ message: "Invalid startAt timestamp" }),
      endAt: z.coerce.date({ message: "Invalid endAt timestamp" }),
      stockQuantity: z
        .number()
        .int()
        .positive("Stock quantity must be a positive integer"),
      unitPrice: z.number().positive("Unit price must be a positive number"),
    })
    .superRefine((data, ctx) => {
      const now = new Date();

      if (data.startAt <= now) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "startAt must be in the future",
          path: ["startAt"],
        });
      }

      if (data.endAt <= now) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endAt must be in the future",
          path: ["endAt"],
        });
      }

      if (data.endAt.getTime() - data.startAt.getTime() < 30 * 60 * 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endAt must be at least 30 minutes after startAt",
          path: ["endAt"],
        });
      }
    }),
});

export type PostSaleBody = z.infer<typeof postSaleSchema>["body"];
