import { z } from "zod";

export const inventoryTxSchema = z.object({
  batchId: z.string().uuid(),
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  occurredAt: z.string().datetime(),
  reason: z.string().trim().min(3).max(160),
}).strict();
