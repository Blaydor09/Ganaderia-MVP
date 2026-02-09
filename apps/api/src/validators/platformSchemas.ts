import { z } from "zod";

export const platformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const platformTenantCreateSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(60)
    .optional(),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8),
  planCode: z.enum(["FREE", "PRO", "ENTERPRISE"]).default("FREE"),
});

export const platformTenantUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(60)
    .optional(),
  ownerId: z.string().uuid().optional(),
});

export const platformTenantStatusSchema = z.object({
  reason: z.string().min(4).max(240).optional(),
});

export const platformAssignPlanSchema = z.object({
  planCode: z.enum(["FREE", "PRO", "ENTERPRISE"]),
});

export const platformPlanLimitsUpdateSchema = z.object({
  limits: z
    .array(
      z.object({
        metric: z.enum([
          "USERS",
          "ACTIVE_ANIMALS",
          "PRODUCTS",
          "ACTIVE_BATCHES",
          "API_REQUESTS_MONTHLY",
          "STORAGE_MB",
        ]),
        softLimit: z.coerce.number().int().min(0).nullable().optional(),
        hardLimit: z.coerce.number().int().min(0).nullable().optional(),
      })
    )
    .min(1),
});

export const platformAuditQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  actorType: z.enum(["platform", "tenant", "system"]).optional(),
  action: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const platformImpersonationStartSchema = z.object({
  tenantId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  reason: z.string().min(4).max(240),
  expiresInMinutes: z.coerce.number().int().min(5).max(120).default(30),
});

export const platformImpersonationStopSchema = z.object({
  reason: z.string().min(4).max(240).optional(),
});

export const platformResetAccessSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  temporaryPassword: z.string().min(8),
});

export const platformUserRolesSchema = z.object({
  roles: z
    .array(z.enum(["platform_super_admin", "platform_support"]))
    .min(1),
});
