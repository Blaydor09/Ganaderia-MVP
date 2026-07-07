# Inventario Ganaderia

Sistema web para gestion e inventario bovino con trazabilidad sanitaria, control de medicamentos por lote y retiros automaticos.

## Stack
- Frontend: Vite + React + TypeScript + Tailwind + shadcn/ui.
- Frontend platform: Vite + React + TypeScript + Tailwind.
- Backend: Node.js + Express + TypeScript.
- DB: PostgreSQL + Prisma.

## Requisitos
- Node.js 18+
- Docker (opcional para DB)

## Inicio rapido

### 1) Base de datos (Docker)
```bash
docker compose up -d
```
La configuracion de desarrollo usa `localhost:5433` para evitar choques con instalaciones locales de PostgreSQL en `5432`.

Espera a que PostgreSQL quede listo antes de seguir. Si quieres verificarlo:
```bash
docker compose logs db --tail 20
```
Debes ver un mensaje parecido a `database system is ready to accept connections`.

### 2) Backend
```bash
cd apps/api
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```
Si `npm run dev` falla con `EADDRINUSE`, el puerto `4000` ya esta ocupado por otra instancia. Cierra ese proceso o cambia `PORT` en `apps/api/.env`. Si cambias el puerto, actualiza tambien `VITE_API_URL` en `apps/web/.env` y `apps/platform/.env`.

### 3) Frontend
```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:5173
API: http://localhost:4000/api/v1
Docs API: http://localhost:4000/api/v1/docs
PostgreSQL Docker: localhost:5433
Landing page: http://localhost:5173/landing

### 4) Frontend plataforma (Super Admin)
```bash
cd apps/platform
cp .env.example .env
npm install
npm run dev
```

Platform UI: http://localhost:5174

## Landing page
```bash
cd apps/web
npm run dev
```
Abrir: http://localhost:5173/landing

## Usuarios demo
- admin@demo.com / admin123
- vet@demo.com / vet12345
- oper@demo.com / oper12345
- audit@demo.com / audit123
- nuevo@demo.com / nuevo12345 (rol: OPERADOR)

## Scripts
### Backend
- `npm run dev` (TSX)
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run start`
- `npm run prisma:migrate`
- `npm run seed`

### Frontend
- `npm run dev`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run preview`

## Docs
- Arquitectura: `docs/architecture.md`
- Arquitectura SaaS: `docs/saas-multitenant-architecture.md`
- ERD: `docs/erd.mmd`
- Endpoints: `docs/api-endpoints.md`
- Rutas app: `docs/routes.md`
- Wireframe: `docs/wireframe.md`
- Guia rapida: `docs/guide.md`
- Deploy (systemd + nginx): `docs/deploy.md`

## Entornos dev/prod
- `APP_ENV` es obligatorio. `npm run dev` lo fija en `development`; los procesos desplegados deben definirlo explícitamente.
- Desarrollo: copia `apps/api/.env.example` -> `apps/api/.env` y `apps/web/.env.example` -> `apps/web/.env`.
- En desarrollo, usa `CORS_ORIGIN="http://localhost:5173,http://localhost:5174"` para permitir web + platform.
- Produccion: copia los ejemplos productivos y define simultáneamente `APP_ENV=production` y `NODE_ENV=production`.
- `CORS_ORIGIN` es obligatorio en prod (lista separada por coma, sin `*`).
- La API rechaza el arranque productivo si `ENABLE_DOCS` no está en `false` o la configuración de seguridad está incompleta.
- En prod, `VITE_API_URL` puede quedar en `"/api/v1"` si usas nginx como proxy.

## Notas
- Las reglas criticas de retiro e inventario estan implementadas en servicios del backend.
- La ficha de animal es imprimible desde `/animals/:id/print`.
- La importacion CSV soporta columnas: tag, sex, breed, birth_date, birth_estimated, category, status, origin, establishment_id.
- Plantilla CSV: `docs/animals-template.csv`.
