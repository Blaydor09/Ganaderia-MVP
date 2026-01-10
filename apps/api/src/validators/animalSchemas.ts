import { z } from "zod";

export const animalCreateSchema = z.object({
  tag: z.string().min(1),
  sex: z.enum(["MALE", "FEMALE"]),
  breed: z.string().min(1),
  birthDate: z.string().datetime(),
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

export const animalUpdateSchema = animalCreateSchema.partial();
