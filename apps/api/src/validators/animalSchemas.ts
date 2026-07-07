import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return value;
  },
  z.union([z.string().min(1), z.null()]).optional()
);

const optionalDateTimeString = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return value;
  },
  z.union([z.string().datetime(), z.null()]).optional()
);

export const animalCreateSchema = z.object({
  tag: optionalTrimmedString,
  sex: z.enum(["MALE", "FEMALE"]),
  breed: z.string().min(1),
  birthDate: optionalDateTimeString,
  birthEstimated: z.boolean().optional(),
  category: z.enum(["TERNERO", "VAQUILLA", "VACA", "TORO", "TORILLO"]),
  status: z.enum(["ACTIVO", "VENDIDO", "MUERTO", "FAENADO", "PERDIDO"]).optional(),
  origin: z.enum(["BORN", "BOUGHT"]),
  supplierId: z.string().uuid().optional(),
  motherId: z.string().uuid().optional(),
  fatherId: z.string().uuid().optional(),
  establishmentId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const animalQuickCreateSchema = z.object({
  items: z
    .array(
      z.object({
        category: z.enum(["TERNERO", "VAQUILLA", "VACA", "TORO", "TORILLO"]),
        sex: z.enum(["MALE", "FEMALE"]),
        count: z.number().int().min(1).max(100),
      })
    )
    .min(1)
    .max(20),
  breed: z.string().min(1),
  registrationDate: optionalDateTimeString,
  origin: z.enum(["BORN", "BOUGHT"]),
  establishmentId: z.string().uuid(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const total = data.items.reduce((sum, item) => sum + item.count, 0);
  if (total > 500) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "A maximum of 500 animals can be created per request",
    });
  }
});

export const animalUpdateSchema = animalCreateSchema.partial();
