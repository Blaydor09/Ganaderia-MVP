import { z } from "zod";

const productTypeSchema = z.enum(["VITAMINAS", "ANTIBIOTICOS", "DESPARASITANTE", "VACUNAS"]);
const vaccineTypesSchema = z.array(z.string().trim().min(1)).optional();
const recommendedRouteSchema = z.enum(["subcutanea", "intramuscular"]);

const baseProductSchema = z.object({
  name: z.string().min(1),
  type: productTypeSchema.optional(),
  vaccineTypes: vaccineTypesSchema,
  unit: z.string().min(1).optional(),
  recommendedRoute: recommendedRouteSchema.optional(),
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
