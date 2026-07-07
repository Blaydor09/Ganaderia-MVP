import { z } from "zod";

const managedPasswordSchema = z.string().min(12).max(128);

export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: managedPasswordSchema,
  roles: z.array(z.enum(["ADMIN", "VETERINARIO", "OPERADOR", "AUDITOR"])).min(1),
});

export const userUpdateSchema = z.object({
  roles: z.array(z.enum(["ADMIN", "VETERINARIO", "OPERADOR", "AUDITOR"])).min(1).optional(),
}).strict();
