import { z } from "zod";

export const eventCreateSchema = z.object({
  animalId: z.string().uuid(),
  type: z.enum([
    "PESO",
    "NACIMIENTO",
    "DESTETE",
    "CELO",
    "PRENEZ",
    "PARTO",
    "VACUNACION",
    "DESPARASITACION",
    "ENFERMEDAD",
    "MUERTE",
    "VENTA",
    "COMPRA",
    "OBSERVACION",
  ]),
  occurredAt: z.string().datetime(),
  establishmentId: z.string().uuid().optional(),
  valueNumber: z.number().optional(),
  valueText: z.string().optional(),
  notes: z.string().optional(),
});

export const eventUpdateSchema = eventCreateSchema.partial();
