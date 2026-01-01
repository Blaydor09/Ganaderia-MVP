import { z } from "zod";

export const administrationCreateSchema = z.object({
  treatmentId: z.string().uuid(),
  batchId: z.string().uuid(),
  administeredAt: z.string().datetime(),
  dose: z.number().positive(),
  doseUnit: z.string().min(1),
  route: z.string().min(1),
  site: z.string().optional(),
  notes: z.string().optional(),
});

export const administrationUpdateSchema = z.object({
  administeredAt: z.string().datetime().optional(),
  dose: z.number().positive().optional(),
  doseUnit: z.string().min(1).optional(),
  route: z.string().min(1).optional(),
  site: z.string().optional(),
  notes: z.string().optional(),
});
