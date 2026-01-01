import { z } from "zod";

export const treatmentCreateSchema = z.object({
  animalId: z.string().uuid(),
  diagnosis: z.string().min(1),
  vetId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  notes: z.string().optional(),
});

export const treatmentCloseSchema = z.object({
  endedAt: z.string().datetime(),
});
