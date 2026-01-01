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
});

export const batchUpdateSchema = batchCreateSchema.partial();
