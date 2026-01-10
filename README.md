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

## Notas
- Las reglas criticas de retiro e inventario estan implementadas en servicios del backend.
- La ficha de animal es imprimible desde `/animals/:id/print`.
- La importacion CSV soporta columnas: tag, sex, breed, birth_date, birth_estimated, category, status, origin, establishment_id.
- Plantilla CSV: `docs/animals-template.csv`.
