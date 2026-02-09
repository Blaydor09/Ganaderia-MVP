# Arquitectura tecnica

## Stack
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui.
- Estado y datos: TanStack Query.
- Formularios y validacion: React Hook Form + Zod.
- Backend: Node.js + Express + TypeScript.
- DB y ORM: PostgreSQL + Prisma.
- Auth: JWT access/refresh + RBAC por tenant.
- API docs: OpenAPI + Swagger UI.

## Estructura del monorepo
- `apps/api`
  - `src/config`, `src/middleware`, `src/routes`, `src/services`, `src/validators`, `src/utils`
  - `prisma/schema.prisma`
  - `tests`
  - `docs/openapi.yaml`
- `apps/web`
  - `src/app` (ruteo y paginas)
  - `src/components` (layout/UI)
  - `src/lib` (auth, api client, date helpers, access)
- `docs`
  - `architecture.md`, `api-endpoints.md`, `routes.md`, `guide.md`

## Patrones clave
- Validacion de payload en API con Zod.
- Reglas de negocio en servicios (tratamientos, inventario, movimientos).
- Auditoria para operaciones criticas (create/update/delete).
- Soft delete en entidades clave.
- Seguridad base: helmet, cors configurado, rate limit en auth.

## Decisiones recientes (P0/P1)
- Auth hardening:
  - `refresh/logout` invalido retorna `401`.
  - Usuario inactivo no puede renovar sesion (`401`).
- Integridad de inventario:
  - Ajustes manuales de stock solo por `POST /inventory/transactions` con `IN|OUT`.
  - `PATCH /batches/:id` solo para metadatos de lote.
- Fechas de calendario:
  - Helper unico para mostrar fecha en UTC (`formatDateOnlyUtc`).
  - Helpers de parseo para `date` y `datetime-local` (`parseDateInputToUtcIso`, `parseDateTimeInputToIso`).
- Flujo UI operativo:
  - Creacion de eventos y movimientos desde interfaz.
  - Registro de aplicaciones y cierre de tratamientos desde interfaz.
  - Topbar y busqueda global conectadas a datos reales.

## Performance frontend
- Paginas cargadas con lazy loading (`React.lazy` + `Suspense`).
- Split de chunks vendor desde Vite/Rollup.
- Logo migrado a SVG liviano para reducir tamano inicial.

## Calidad y validacion
- API: `npm run lint`, `npm test`, `npm run build`.
- WEB: `npm run lint`, `npm test`, `npm run build`.
- Cobertura inicial de pruebas para auth, reglas de inventario y helpers de fecha.

## Configuracion de ambientes
- API carga `.env` y admite variantes por ambiente.
- `ENABLE_DOCS` controla Swagger en runtime.
- Frontend usa `VITE_API_URL`.
