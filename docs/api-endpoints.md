# API Endpoints (REST /api/v1)

## Health and docs
- GET /health
- GET /docs

## Auth
- POST /auth/login
- POST /auth/register
- GET /auth/registration-status
- POST /auth/refresh
- POST /auth/logout
- POST /auth/switch-tenant
- GET /auth/me

Contract notes:
- `/auth/refresh` and `/auth/logout` accept `refreshToken` from JSON body or HttpOnly cookie.
- `/auth/refresh` rotates refresh token and returns a new `accessToken` + `refreshToken`.
- `/auth/refresh` and `/auth/logout` return `401` for invalid or expired refresh token.
- Inactive users (`isActive=false`) cannot refresh session (`401`).

## Tenants
- GET /tenants
- POST /tenants

## Users and roles
- GET /users
- POST /users
- PATCH /users/:id
- DELETE /users/:id
- GET /users/roles

## Animals
- GET /animals
- GET /animals/summary
- POST /animals
- POST /animals/quick
- POST /animals/import
- GET /animals/:id
- GET /animals/:id/summary
- PATCH /animals/:id
- DELETE /animals/:id

## Events
- GET /events
- GET /events/lifecycle-summary
- POST /events
- PATCH /events/:id
- DELETE /events/:id

## Movements
- GET /movements
- POST /movements
- DELETE /movements/:id

## Establishments
- GET /establishments
- GET /establishments/:id
- POST /establishments
- PATCH /establishments/:id
- DELETE /establishments/:id

## Products and suppliers
- GET /products
- POST /products
- PATCH /products/:id
- DELETE /products/:id
- GET /suppliers
- POST /suppliers

## Batches and inventory
- GET /batches
- POST /batches
- PATCH /batches/:id
- DELETE /batches/:id
- GET /inventory
- GET /inventory/summary
- GET /inventory/alerts
- POST /inventory/transactions

Contract notes:
- `POST /inventory/transactions` public contract accepts only `type: "IN" | "OUT"`.
- `type: "ADJUST"` is internal-only and not accepted by public API.
- `PATCH /batches/:id` updates metadata only (`batchNumber`, `expiresAt`, `supplierId`, `receivedAt`, `cost`).
- Public batch patch no longer accepts stock fields (`quantityInitial`, `quantityAvailable`).

## Treatments and administrations
- GET /treatments
- POST /treatments (individual)
- POST /treatments/group/preview
- POST /treatments/group
- POST /treatments/:id/close
- GET /treatments/by-animal/:animalId
- GET /administrations
- POST /administrations
- PATCH /administrations/:id

Contract notes:
- Treatment payload now uses `description` (replaces previous `diagnosis`).
- Grouped treatment creates a single treatment record and links multiple animals by filters.
- Grouped treatment creation also creates administrations and inventory OUT transactions atomically.

## Alerts and tasks
- GET /alerts
- POST /alerts
- GET /tasks
- POST /tasks
- PATCH /tasks/:id

## Reports
- GET /reports/withdrawals-active
- GET /reports/inventory-expiring
- GET /reports/consumption
- GET /reports/weights

## Dashboard
- GET /dashboard/overview

Contract notes:
- Query params:
  - `range=7d|30d|90d` (default `30d`)
  - `fincaId` (uuid, opcional)
  - `establishmentId` (uuid, opcional)
- Precedencia de filtros de ubicacion:
  - Si viene `establishmentId`, se ignora `fincaId`.
  - Si no viene ninguno, consulta a nivel tenant.
- Respuesta incluye:
  - `kpis`, `animalDistribution`, `treatmentsSeries`, `lifecycleSeries`
  - `inventoryTop`, `movementsRecent`
  - `appliedFilters`, `generatedAt`

## Audit and search
- GET /audit
- GET /search
