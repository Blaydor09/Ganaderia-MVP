import { z } from "zod";

export const inventoryTxSchema = z.object({
  batchId: z.string().uuid(),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  occurredAt: z.string().datetime(),
  reason: z.string().optional(),
});
