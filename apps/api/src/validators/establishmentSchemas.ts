import { z } from "zod";

const establishmentCreateSchemaBase = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["FINCA", "POTRERO"]),
  parentId: z.string().uuid().optional(),
  potreros: z.array(z.string().trim()).optional(),
});

export const establishmentCreateSchema = establishmentCreateSchemaBase.superRefine(
  (values, ctx) => {
    const potreroNames = (values.potreros ?? []).filter(Boolean);

    if (values.type === "FINCA") {
      if (values.parentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parentId"],
          message: "Finca cannot have parent",
        });
      }

      if (potreroNames.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["potreros"],
          message: "At least one potrero is required",
        });
      }
    }

    if (values.type === "POTRERO") {
      if (!values.parentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parentId"],
          message: "Parent finca is required",
        });
      }

      if (potreroNames.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["potreros"],
          message: "Potreros are only supported when creating a finca",
        });
      }
    }
  }
);

export const establishmentUpdateSchema = establishmentCreateSchemaBase
  .omit({ potreros: true })
  .partial();

export const legacyCorralAnimalMigrationSchema = z.object({
  destinationId: z.string().uuid(),
});
