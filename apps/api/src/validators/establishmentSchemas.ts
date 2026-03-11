import { z } from "zod";

export const establishmentCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["FINCA", "POTRERO"]),
  parentId: z.string().uuid().optional(),
});

export const establishmentUpdateSchema = establishmentCreateSchema.partial();

export const legacyCorralAnimalMigrationSchema = z.object({
  destinationId: z.string().uuid(),
});

