import { z } from "zod";

export const batchCreateSchema = z
  .object({
    productId: z.string().uuid(),
    batchNumber: z.string().min(1),
    expiresAt: z.string().datetime(),
    supplierId: z.string().uuid().optional(),
    receivedAt: z.string().datetime(),
    cost: z.number().min(0).optional(),
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
  batchNumber: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  supplierId: z.string().uuid().optional(),
  receivedAt: z.string().datetime().optional(),
  cost: z.number().min(0).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "At least one updatable field is required",
});
