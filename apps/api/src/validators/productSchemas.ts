import { z } from "zod";

const productTypeSchema = z.enum(["VITAMINAS", "ANTIBIOTICOS", "DESPARASITANTE", "VACUNAS"]);
const vaccineTypesSchema = z.array(z.string().trim().min(1)).optional();

const baseProductSchema = z.object({
  name: z.string().min(1),
  type: productTypeSchema.optional(),
  vaccineTypes: vaccineTypesSchema,
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

const ensureVaccineTypes = (values: { type?: string; vaccineTypes?: string[] }, ctx: z.RefinementCtx) => {
  if (values.type === "VACUNAS" && (!values.vaccineTypes || values.vaccineTypes.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Requerido",
      path: ["vaccineTypes"],
    });
  }
};

export const productCreateSchema = baseProductSchema.superRefine(ensureVaccineTypes);
export const productUpdateSchema = baseProductSchema.partial().superRefine(ensureVaccineTypes);
