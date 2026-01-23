# Inventario Ganaderia

Sistema web para gestion e inventario bovino con trazabilidad sanitaria, control de medicamentos por lote y retiros automaticos.

## Stack
- Frontend: Vite + React + TypeScript + Tailwind + shadcn/ui.
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
Landing page: http://localhost:5173/landing

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

## Acceso SaaS
- Crear organizacion: `http://localhost:5173/register`
- Invitar usuarios: `http://localhost:5173/users` (solo admin)
- Aceptar invitacion: `http://localhost:5173/invite?token=...`
- Las invitaciones expiran en 7 dias.

## Scripts
### Backend
- `npm run dev` (TSX)
- `npm run build`
- `npm run start`
- `npm run prisma:migrate`
- `npm run seed`
- `npm run test`

### Frontend
- `npm run dev`
- `npm run build`
- `npm run preview`

## Docs
- Arquitectura: `docs/architecture.md`
- ERD: `docs/erd.mmd`
- Endpoints: `docs/api-endpoints.md`
- Rutas app: `docs/routes.md`
- Wireframe: `docs/wireframe.md`
- Guia rapida: `docs/guide.md`
- Deploy (systemd + nginx): `docs/deploy.md`

## Entornos dev/prod
- La API carga `.env` y luego sobreescribe con `.env.<ambiente>` usando `APP_ENV` o `NODE_ENV` (por defecto `development`).
- Desarrollo: copia `apps/api/.env.example` -> `apps/api/.env` y `apps/web/.env.example` -> `apps/web/.env`.
- Produccion: copia `apps/api/.env.production.example` -> `apps/api/.env.production` y `apps/web/.env.production.example` -> `apps/web/.env.production`, con `NODE_ENV=production`.
- `CORS_ORIGIN` es obligatorio en prod (lista separada por coma, sin `*`).
- `ENABLE_DOCS` esta activo en dev y recomendado en `false` para prod.
- En prod, `VITE_API_URL` puede quedar en `"/api/v1"` si usas nginx como proxy.

## Notas
- Las reglas criticas de retiro e inventario estan implementadas en servicios del backend.
- La ficha de animal es imprimible desde `/animals/:id/print`.
- La importacion CSV soporta columnas: tag, sex, breed, birth_date, birth_estimated, category, status, origin, establishment_id.
- Plantilla CSV: `docs/animals-template.csv`.
