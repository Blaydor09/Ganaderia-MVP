import { z } from "zod";

export const batchCreateSchema = z
  .object({
    productId: z.string().uuid(),
    expiresAt: z.string().datetime(),
    receivedAt: z.string().datetime(),
    quantityInitial: z.number().min(0),
    quantityAvailable: z.number().min(0),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.quantityAvailable > value.quantityInitial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantityAvailable"],
        message: "quantityAvailable must be less than or equal to quantityInitial",
      });
    }
  });

export const batchUpdateSchema = z.object({
  expiresAt: z.string().datetime().optional(),
  receivedAt: z.string().datetime().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "At least one updatable field is required",
});
