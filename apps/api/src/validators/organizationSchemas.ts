import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "VETERINARIO", "OPERADOR", "AUDITOR"]);

export const organizationUpdateSchema = z.object({
  name: z.string().min(2).optional(),
});

export const inviteCreateSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
});
