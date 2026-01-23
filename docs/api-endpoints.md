# API Endpoints (REST /api/v1)

## Auth
- POST /auth/login
- POST /auth/register
- POST /auth/accept-invite
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me

## Organizations
- GET /organizations/me
- PATCH /organizations/me
- GET /organizations/members
- GET /organizations/invites
- POST /organizations/invites
- DELETE /organizations/invites/:id

## Users / Roles
- GET /users
- POST /users
- GET /users/:id
- PATCH /users/:id
- DELETE /users/:id
- GET /users/roles

## Animals
- GET /animals (filters, search)
- GET /animals/summary
- POST /animals
- GET /animals/:id
- PATCH /animals/:id
- DELETE /animals/:id
- POST /animals/import (CSV)
- GET /animals/:id/summary

## Events
- GET /events
- GET /events/lifecycle-summary
- POST /events
- GET /events/:id
- PATCH /events/:id
- DELETE /events/:id

## Movements
- GET /movements
- POST /movements
- GET /movements/:id
- PATCH /movements/:id
- DELETE /movements/:id

## Establishments
- GET /establishments
- POST /establishments
- GET /establishments/:id
- PATCH /establishments/:id
- DELETE /establishments/:id

## Products (medicamentos)
- GET /products
- POST /products
- GET /products/:id
- PATCH /products/:id
- DELETE /products/:id

## Suppliers
- GET /suppliers
- POST /suppliers

## Batches (lotes)
- GET /batches
- POST /batches
- GET /batches/:id
- PATCH /batches/:id
- DELETE /batches/:id

## Inventory
- GET /inventory
- POST /inventory/transactions
- GET /inventory/summary
- GET /inventory/alerts

## Treatments
- GET /treatments
- POST /treatments
- POST /treatments/:id/close
- GET /treatments/by-animal/:animalId

## Administrations
- GET /administrations
- POST /administrations

## Reports
- GET /reports/withdrawals-active
- GET /reports/inventory-expiring
- GET /reports/consumption
- GET /reports/weights

## Alerts / Tasks
- GET /alerts
- POST /alerts
- GET /tasks
- POST /tasks
- PATCH /tasks/:id

## Audit
- GET /audit

## Search
- GET /search

## Health
- GET /health

## Docs
- GET /docs
