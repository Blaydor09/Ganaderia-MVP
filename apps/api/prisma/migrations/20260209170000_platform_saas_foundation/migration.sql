-- Create enums
CREATE TYPE "PlatformRoleName" AS ENUM ('platform_super_admin', 'platform_support');
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED');
CREATE TYPE "UsageMetricKey" AS ENUM ('USERS', 'ACTIVE_ANIMALS', 'PRODUCTS', 'ACTIVE_BATCHES', 'API_REQUESTS_MONTHLY', 'STORAGE_MB');
CREATE TYPE "ActorType" AS ENUM ('platform', 'tenant', 'system');
CREATE TYPE "TokenScope" AS ENUM ('tenant', 'platform');

-- Alter tenant
ALTER TABLE "Tenant" ADD COLUMN "slug" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Tenant" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "suspensionReason" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "reactivatedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Alter refresh token
ALTER TABLE "RefreshToken" ADD COLUMN "scope" "TokenScope" NOT NULL DEFAULT 'tenant';
ALTER TABLE "RefreshToken" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "impersonationSessionId" TEXT;

-- Alter audit log
ALTER TABLE "AuditLog" ADD COLUMN "actorUserId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "actorType" "ActorType" NOT NULL DEFAULT 'tenant';
ALTER TABLE "AuditLog" ADD COLUMN "resource" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "metadata" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "AuditLog"
SET
  "actorUserId" = COALESCE("actorUserId", "userId"),
  "resource" = COALESCE("resource", "entity"),
  "resourceId" = COALESCE("resourceId", "entityId"),
  "occurredAt" = COALESCE("occurredAt", "createdAt");

-- Create tables
CREATE TABLE "PlatformRole" (
  "id" TEXT NOT NULL,
  "name" "PlatformRoleName" NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformUserRole" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platformRoleId" TEXT NOT NULL,
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformUserRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "code" "PlanCode" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageMetric" (
  "id" TEXT NOT NULL,
  "key" "UsageMetricKey" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanLimit" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "usageMetricId" TEXT NOT NULL,
  "softLimit" INTEGER,
  "hardLimit" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanLimit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "renewedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageCounter" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "usageMetricId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "usageMetricId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "currentValue" INTEGER,
  "source" TEXT NOT NULL,
  "resourceId" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImpersonationSession" (
  "id" TEXT NOT NULL,
  "platformUserId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "reason" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastAccessAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_ownerId_idx" ON "Tenant"("ownerId");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

CREATE INDEX "RefreshToken_scope_idx" ON "RefreshToken"("scope");
CREATE INDEX "RefreshToken_tenantId_idx" ON "RefreshToken"("tenantId");

CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");
CREATE INDEX "AuditLog_actorUserId_occurredAt_idx" ON "AuditLog"("actorUserId", "occurredAt");
CREATE INDEX "AuditLog_action_occurredAt_idx" ON "AuditLog"("action", "occurredAt");
CREATE INDEX "AuditLog_tenantId_occurredAt_idx" ON "AuditLog"("tenantId", "occurredAt");

CREATE UNIQUE INDEX "PlatformRole_name_key" ON "PlatformRole"("name");
CREATE UNIQUE INDEX "PlatformUserRole_userId_platformRoleId_key" ON "PlatformUserRole"("userId", "platformRoleId");
CREATE INDEX "PlatformUserRole_platformRoleId_idx" ON "PlatformUserRole"("platformRoleId");

CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE UNIQUE INDEX "UsageMetric_key_key" ON "UsageMetric"("key");
CREATE UNIQUE INDEX "PlanLimit_planId_usageMetricId_key" ON "PlanLimit"("planId", "usageMetricId");
CREATE INDEX "PlanLimit_usageMetricId_idx" ON "PlanLimit"("usageMetricId");

CREATE INDEX "TenantSubscription_tenantId_status_idx" ON "TenantSubscription"("tenantId", "status");
CREATE INDEX "TenantSubscription_planId_idx" ON "TenantSubscription"("planId");
CREATE INDEX "TenantSubscription_createdById_idx" ON "TenantSubscription"("createdById");

CREATE UNIQUE INDEX "UsageCounter_tenantId_usageMetricId_periodStart_periodEnd_key" ON "UsageCounter"("tenantId", "usageMetricId", "periodStart", "periodEnd");
CREATE INDEX "UsageCounter_tenantId_periodStart_idx" ON "UsageCounter"("tenantId", "periodStart");

CREATE INDEX "UsageEvent_tenantId_occurredAt_idx" ON "UsageEvent"("tenantId", "occurredAt");
CREATE INDEX "UsageEvent_usageMetricId_occurredAt_idx" ON "UsageEvent"("usageMetricId", "occurredAt");

CREATE INDEX "ImpersonationSession_tenantId_startedAt_idx" ON "ImpersonationSession"("tenantId", "startedAt");
CREATE INDEX "ImpersonationSession_platformUserId_startedAt_idx" ON "ImpersonationSession"("platformUserId", "startedAt");

-- Foreign keys
ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RefreshToken"
  ADD CONSTRAINT "RefreshToken_impersonationSessionId_fkey" FOREIGN KEY ("impersonationSessionId") REFERENCES "ImpersonationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformUserRole"
  ADD CONSTRAINT "PlatformUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformUserRole"
  ADD CONSTRAINT "PlatformUserRole_platformRoleId_fkey" FOREIGN KEY ("platformRoleId") REFERENCES "PlatformRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlanLimit"
  ADD CONSTRAINT "PlanLimit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanLimit"
  ADD CONSTRAINT "PlanLimit_usageMetricId_fkey" FOREIGN KEY ("usageMetricId") REFERENCES "UsageMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UsageCounter"
  ADD CONSTRAINT "UsageCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageCounter"
  ADD CONSTRAINT "UsageCounter_usageMetricId_fkey" FOREIGN KEY ("usageMetricId") REFERENCES "UsageMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UsageEvent"
  ADD CONSTRAINT "UsageEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageEvent"
  ADD CONSTRAINT "UsageEvent_usageMetricId_fkey" FOREIGN KEY ("usageMetricId") REFERENCES "UsageMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed platform roles
INSERT INTO "PlatformRole" ("id", "name", "description", "createdAt", "updatedAt")
VALUES
  ('platform-role-super-admin', 'platform_super_admin', 'Super admin de plataforma SaaS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('platform-role-support', 'platform_support', 'Soporte operativo de plataforma', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Seed plans
INSERT INTO "Plan" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES
  ('plan-free', 'FREE', 'Free', 'Plan de entrada con limites operativos', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan-pro', 'PRO', 'Pro', 'Plan para operacion media y crecimiento', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan-enterprise', 'ENTERPRISE', 'Enterprise', 'Plan corporativo con limites altos y soporte', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Seed usage metrics
INSERT INTO "UsageMetric" ("id", "key", "name", "description", "unit", "createdAt", "updatedAt")
VALUES
  ('metric-users', 'USERS', 'Usuarios por tenant', 'Cantidad de usuarios habilitados en un tenant', 'count', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('metric-active-animals', 'ACTIVE_ANIMALS', 'Animales activos', 'Animales con estado ACTIVO', 'count', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('metric-products', 'PRODUCTS', 'Productos', 'Productos farmacologicos activos', 'count', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('metric-active-batches', 'ACTIVE_BATCHES', 'Lotes activos', 'Lotes sin eliminar logicamente', 'count', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('metric-api-requests-monthly', 'API_REQUESTS_MONTHLY', 'Requests API mensuales', 'Consumo mensual de requests autenticadas', 'count', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('metric-storage-mb', 'STORAGE_MB', 'Almacenamiento', 'Uso de almacenamiento en MB para fotos y documentos', 'mb', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Seed plan limits
INSERT INTO "PlanLimit" ("id", "planId", "usageMetricId", "softLimit", "hardLimit", "createdAt", "updatedAt")
VALUES
  ('limit-free-users', 'plan-free', 'metric-users', 2, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-free-animals', 'plan-free', 'metric-active-animals', 150, 200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-free-products', 'plan-free', 'metric-products', 40, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-free-batches', 'plan-free', 'metric-active-batches', 80, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-free-api', 'plan-free', 'metric-api-requests-monthly', 40000, 50000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-free-storage', 'plan-free', 'metric-storage-mb', 800, 1024, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-pro-users', 'plan-pro', 'metric-users', 12, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-pro-animals', 'plan-pro', 'metric-active-animals', 2500, 3000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-pro-products', 'plan-pro', 'metric-products', 250, 300, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-pro-batches', 'plan-pro', 'metric-active-batches', 700, 800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-pro-api', 'plan-pro', 'metric-api-requests-monthly', 400000, 500000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-pro-storage', 'plan-pro', 'metric-storage-mb', 8192, 10240, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-ent-users', 'plan-enterprise', 'metric-users', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-ent-animals', 'plan-enterprise', 'metric-active-animals', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-ent-products', 'plan-enterprise', 'metric-products', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-ent-batches', 'plan-enterprise', 'metric-active-batches', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-ent-api', 'plan-enterprise', 'metric-api-requests-monthly', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('limit-ent-storage', 'plan-enterprise', 'metric-storage-mb', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("planId", "usageMetricId") DO NOTHING;

-- Seed default subscriptions for existing tenants
INSERT INTO "TenantSubscription" ("id", "tenantId", "planId", "status", "startsAt", "createdAt", "updatedAt")
SELECT
  'sub-' || t."id",
  t."id",
  'plan-free',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE NOT EXISTS (
  SELECT 1
  FROM "TenantSubscription" s
  WHERE s."tenantId" = t."id" AND s."status" IN ('ACTIVE', 'TRIALING')
);
