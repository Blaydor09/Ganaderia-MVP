import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const registerSchema = z.object({
  organizationName: z.string().min(2),
  organizationSlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(32),
  name: z.string().min(2),
  password: z.string().min(6),
});
