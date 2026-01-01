import { z } from "zod";

export const movementCreateSchema = z.object({
  animalId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  originId: z.string().uuid().optional(),
  destinationId: z.string().uuid().optional(),
  movementType: z.enum(["INTERNAL", "EXTERNAL", "SALE", "SLAUGHTER"]),
  transporter: z.string().optional(),
  notes: z.string().optional(),
});
