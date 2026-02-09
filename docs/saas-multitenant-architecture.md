# SaaS Multi-Tenant Architecture (Platform + Tenant)

## 1) Arquitectura objetivo
- `apps/web`: panel operativo del tenant (existente), conserva rutas actuales.
- `apps/platform`: panel Super Admin (nuevo), aislado por app y tokens propios.
- API:
  - Tenant: `/api/v1/*` (dominio ganadero)
  - Plataforma: `/api/v1/platform/*`
- JWT con `scope`:
  - `scope=tenant`: requiere `tenantId` en claim.
  - `scope=platform`: sin `tenantId`, roles de plataforma.
- RBAC separado:
  - Tenant: `ADMIN`, `VETERINARIO`, `OPERADOR`, `AUDITOR`
  - Platform: `platform_super_admin`, `platform_support`
- Seguridad de contexto:
  - `authenticateTenant` valida token, membresia real, estado del tenant y registra request usage.
  - `authenticatePlatform` valida token y rol de plataforma.
  - Deny-by-default en middleware RBAC.

## 2) Modelo de datos
- Nuevos enums:
  - `PlatformRoleName`, `TenantStatus`, `PlanCode`, `SubscriptionStatus`, `UsageMetricKey`, `ActorType`, `TokenScope`.
- Ajustes:
  - `Tenant`: `status`, `ownerId`, `suspendedAt`, `suspensionReason`, `reactivatedAt`, `lastLoginAt`, `slug`.
  - `RefreshToken`: `scope`, `tenantId`, `impersonationSessionId`.
  - `AuditLog`: `actorUserId`, `actorType`, `resource`, `resourceId`, `userAgent`, `metadata`, `occurredAt`.
- Nuevas tablas:
  - `PlatformRole`, `PlatformUserRole`
  - `Plan`, `PlanLimit`, `TenantSubscription`
  - `UsageMetric`, `UsageCounter`, `UsageEvent`
  - `ImpersonationSession`
- Índices y constraints críticos:
  - `PlanLimit(planId, usageMetricId)` unique
  - `UsageCounter(tenantId, usageMetricId, periodStart, periodEnd)` unique
  - índices por `tenantId`, `status`, `occurredAt`, `actorUserId`.

## 3) Endpoints
- Auth tenant:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/switch-tenant`
  - `GET /api/v1/auth/me`
- Tenant management (tenant scope):
  - `GET /api/v1/tenants`
  - `POST /api/v1/tenants`
  - `GET /api/v1/tenants/current/plan-usage`
- Auth platform:
  - `POST /api/v1/platform/auth/login`
  - `POST /api/v1/platform/auth/refresh`
  - `POST /api/v1/platform/auth/logout`
  - `GET /api/v1/platform/auth/me`
- Tenant management (platform):
  - `GET /api/v1/platform/tenants`
  - `POST /api/v1/platform/tenants`
  - `GET /api/v1/platform/tenants/:id`
  - `PATCH /api/v1/platform/tenants/:id`
  - `POST /api/v1/platform/tenants/:id/suspend`
  - `POST /api/v1/platform/tenants/:id/reactivate`
  - `POST /api/v1/platform/tenants/:id/plan`
- Planes/uso/auditoría/support:
  - `GET /api/v1/platform/plans`
  - `PATCH /api/v1/platform/plans/:code/limits`
  - `GET /api/v1/platform/usage`
  - `GET /api/v1/platform/audit`
  - `POST /api/v1/platform/support/reset-access`
  - `POST /api/v1/platform/support/impersonations`
  - `POST /api/v1/platform/support/impersonations/:id/revoke`
  - `GET /api/v1/platform/users`
  - `POST /api/v1/platform/users/:id/roles`

## 4) Pantallas UI
- Super Admin (`apps/platform`):
  - `Dashboard SaaS`
  - `Tenants list`
  - `Tenant detail`
  - `Planes y limites`
  - `Auditoria global`
  - `Soporte`
- Tenant Admin (`apps/web`):
  - `Ajustes` ahora incluye bloque `Plan y consumo` con límites/uso.

## 5) Reglas de acceso (resumen)
- `platform_super_admin`:
  - CRUD de tenant, suspensión/reactivación, cambio de plan.
  - roles de plataforma, reset de acceso, impersonación.
  - lectura global de auditoría/uso.
- `platform_support`:
  - lectura dashboard/tenants/auditoría/uso.
  - reset de acceso.
  - sin mutación de planes ni roles de plataforma.
- Tenant roles:
  - mantienen matriz actual.
  - no pueden invocar `/platform/*`.
  - no pueden mutar recursos fuera de su `tenantId`.

## 6) Tenant scoping implementado
- Contexto tenant:
  - `authenticateTenant` resuelve `tenantId` desde JWT (claim).
  - valida membresía real en `UserRole`.
  - valida estado de tenant (`ACTIVE`), bloquea `SUSPENDED`.
- Anti-IDOR:
  - patrón general en rutas: `where: { id, tenantId }`.
  - helper base `withTenantScope` / `findTenantResourceOrThrow`.
  - nunca se usa `tenantId` del frontend.
- Enforcement SaaS:
  - `assertTenantLimit` + `getCurrentUsageValue`.
  - `TENANT_LIMIT_EXCEEDED` para sobreuso.
  - tracking mensual API requests via `UsageCounter`/`UsageEvent`.

## 7) Checklist de pruebas
- Aislamiento tenant A/B:
  - lectura/edición por ID sin matching `tenantId` => 404/403.
- Role enforcement:
  - tenant token no accede `/platform/*`.
  - soporte sin permiso de mutación crítica.
- Límites:
  - creación de usuarios/animales/productos/lotes bloquea al exceder.
  - código de error `TENANT_LIMIT_EXCEEDED`.
- Suspensión:
  - tenant suspendido no consume endpoints operativos.
- Switch tenant:
  - solo con membresía real.
- Impersonación:
  - solo `platform_super_admin`, temporal, revocable.
- Auditoría:
  - login/logout/switch tenant
  - create/edit tenant
  - cambios de plan/límites
  - suspensión/reactivación
  - soporte e impersonación
