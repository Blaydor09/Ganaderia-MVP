# Arquitectura tecnica

## Stack
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui.
- Estado/datos: TanStack Query.
- Formularios: React Hook Form + Zod.
- Tablas: TanStack Table.
- Graficos: Recharts.
- Backend: Node.js + Express + TypeScript.
- DB: PostgreSQL (mejor para datos relacionales, indices y reportes).
- ORM: Prisma.
- Auth: JWT + refresh tokens + RBAC.
- Docs API: OpenAPI (Swagger UI).

## Estructura de carpetas (monorepo)
- apps/api
  - src
    - config
    - middleware
    - routes
    - controllers
    - services
    - validators
    - utils
  - prisma
    - schema.prisma
    - seed.ts
  - tests
  - docs/openapi.yaml
- apps/web
  - src
    - app (rutas y layouts)
    - components
    - features
    - lib
    - hooks
    - styles
  - public
- docs
  - architecture.md
  - erd.mmd
  - routes.md
  - api-endpoints.md
  - wireframe.md
  - guide.md

## Modulos backend
- Auth y RBAC (login, refresh, logout, me, roles/usuarios)
- Animales
- Eventos
- Movimientos
- Establecimientos
- Productos (medicamentos)
- Lotes e inventario
- Tratamientos y aplicaciones
- Reportes
- Alertas y tareas
- Auditoria

## Principios
- Validacion en backend con Zod.
- Reglas criticas en servicios con transacciones Prisma.
- Auditoria para cambios criticos.
- Soft delete en entidades clave.
- Seguridad: bcrypt, rate limit, helmet, CORS.
