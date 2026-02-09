# Rutas de la aplicacion (frontend)

## Publicas
- /landing
- /login
- /register

## Privadas
- / (dashboard)
- /onboarding
- /animals
- /animals/new
- /animals/quick
- /animals/import
- /animals/:id
- /animals/:id/print
- /events
- /movements
- /establishments
- /products
- /batches
- /inventory
- /treatments
- /withdrawals
- /reports
- /alerts
- /tasks
- /users
- /audit
- /settings

## Notas operativas
- Todas las rutas privadas usan auth JWT y control de roles (RBAC).
- Si el usuario no tiene rol permitido, la vista muestra `AccessDeniedPage`.
- El flujo de primer uso esperado es: `/register` -> `/onboarding` -> rutas operativas.

## Componentes globales
- Topbar con tenant y usuario reales desde `GET /auth/me`.
- Busqueda global navegable para animales, lotes y productos.
- Sidebar y navegacion movil con acceso segun rol.
