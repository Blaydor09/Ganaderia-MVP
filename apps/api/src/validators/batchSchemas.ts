import { z } from "zod";

export const batchCreateSchema = z.object({
  productId: z.string().uuid(),
  batchNumber: z.string().min(1),
  expiresAt: z.string().datetime(),
  supplierId: z.string().uuid().optional(),
  receivedAt: z.string().datetime(),
  cost: z.number().optional(),
  quantityInitial: z.number().min(0),
  quantityAvailable: z.number().min(0),
}).strict();

export const batchUpdateSchema = z.object({
  batchNumber: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  supplierId: z.string().uuid().optional(),
  receivedAt: z.string().datetime().optional(),
  cost: z.number().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "At least one updatable field is required",
});
