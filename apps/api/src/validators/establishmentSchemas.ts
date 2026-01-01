import { z } from "zod";

export const establishmentCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const establishmentUpdateSchema = establishmentCreateSchema.partial();
