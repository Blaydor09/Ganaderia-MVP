import { z } from "zod";

export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  roles: z.array(z.enum(["ADMIN", "VETERINARIO", "OPERADOR", "AUDITOR"])).min(1),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roles: z.array(z.enum(["ADMIN", "VETERINARIO", "OPERADOR", "AUDITOR"])).optional(),
  isActive: z.boolean().optional(),
});
