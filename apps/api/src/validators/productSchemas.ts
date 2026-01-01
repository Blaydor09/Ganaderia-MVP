import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().min(1),
  activeIngredient: z.string().min(1),
  presentation: z.string().min(1),
  concentration: z.string().min(1),
  unit: z.string().min(1),
  meatWithdrawalDays: z.number().int().min(0),
  milkWithdrawalDays: z.number().int().min(0),
  requiresPrescription: z.boolean().optional(),
  recommendedRoute: z.string().optional(),
  typicalDose: z.string().optional(),
  notes: z.string().optional(),
  minStock: z.number().int().min(0).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();
