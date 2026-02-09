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
- POST /treatments
- POST /treatments/:id/close
- GET /treatments/by-animal/:animalId
- GET /administrations
- POST /administrations
- PATCH /administrations/:id

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

## Audit and search
- GET /audit
- GET /search
