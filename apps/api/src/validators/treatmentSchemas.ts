import { z } from "zod";

const treatmentFiltersSchema = z
  .object({
    category: z.enum(["TERNERO", "VAQUILLA", "VACA", "TORO", "TORILLO"]).optional(),
    sex: z.enum(["MALE", "FEMALE"]).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.category && value.category !== "TERNERO" && value.sex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sex"],
        message: "sex is only allowed for TERNERO or when category is omitted",
      });
    }
  });

const treatmentGroupScopeSchema = z.enum(["ALL_FILTERED", "LIMIT"]);

const treatmentGroupMedicationSchema = z.object({
  batchId: z.string().uuid(),
  dose: z.number().positive(),
  doseUnit: z.string().min(1),
  route: z.string().min(1),
  administeredAt: z.string().datetime(),
  site: z.string().optional(),
  notes: z.string().optional(),
});

export const treatmentCreateSchema = z.object({
  animalId: z.string().uuid(),
  description: z.string().min(1),
  vetId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  notes: z.string().optional(),
});

export const treatmentGroupPreviewSchema = z
  .object({
    filters: treatmentFiltersSchema,
    scope: treatmentGroupScopeSchema,
    limit: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "LIMIT" && value.limit === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "limit is required when scope is LIMIT",
        path: ["limit"],
      });
    }
    if (value.scope === "ALL_FILTERED" && value.limit !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "limit is not allowed when scope is ALL_FILTERED",
        path: ["limit"],
      });
    }
  });

export const treatmentGroupCreateSchema = z
  .object({
    description: z.string().min(1),
    vetId: z.string().uuid().optional(),
    startedAt: z.string().datetime(),
    notes: z.string().optional(),
    filters: treatmentFiltersSchema,
    scope: treatmentGroupScopeSchema,
    limit: z.number().int().positive().optional(),
    medications: z.array(treatmentGroupMedicationSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "LIMIT" && value.limit === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "limit is required when scope is LIMIT",
        path: ["limit"],
      });
    }
    if (value.scope === "ALL_FILTERED" && value.limit !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "limit is not allowed when scope is ALL_FILTERED",
        path: ["limit"],
      });
    }
  });

export const treatmentCloseSchema = z.object({
  endedAt: z.string().datetime(),
});
