# Plan de refactorizacion a monolito modular

## 1. Resumen ejecutivo

El proyecto debe evolucionar desde su estructura actual de tres aplicaciones dentro de un mismo repositorio hacia un monolito modular con limites internos claros, manteniendo el modelo de despliegue actual: una API principal, una base de datos PostgreSQL, una app web para tenants y una app web para administracion de plataforma.

La recomendacion no es migrar a microservicios ni reescribir el sistema. La refactorizacion debe ordenar el codigo existente, reducir acoplamiento, mejorar pruebas, centralizar contratos y preparar el crecimiento sin aumentar innecesariamente la complejidad operativa.

Objetivo principal:

- Mantener la simplicidad de despliegue del monolito.
- Separar dominios funcionales dentro de la API.
- Convertir el repositorio en un monorepo real con paquetes compartidos.
- Reducir duplicacion entre `apps/web` y `apps/platform`.
- Fortalecer contratos, pruebas, observabilidad y rendimiento.

Decision arquitectonica:

- Arquitectura destino: monolito modular en monorepo.
- Despliegue destino inicial: igual al actual, sin dividir servicios.
- Base de datos: una sola base PostgreSQL con Prisma.
- API publica: mantener compatibilidad con `/api/v1/*` y `/api/v1/platform/*`.
- Migracion: incremental, modulo por modulo.

## 2. Estado actual resumido

El sistema actualmente esta organizado en:

- `apps/api`: API Node.js, Express, TypeScript, Prisma y PostgreSQL.
- `apps/web`: frontend operativo tenant con React, Vite, TypeScript y TanStack Query.
- `apps/platform`: frontend de administracion SaaS con React, Vite y TypeScript.
- `docs`: documentacion tecnica, despliegue, rutas, endpoints y arquitectura.
- `docker-compose.yml`: PostgreSQL local para desarrollo.

La API usa una separacion por carpetas tecnicas:

- `src/routes`
- `src/services`
- `src/validators`
- `src/middleware`
- `src/utils`
- `src/config`

Esta estructura funciona para el MVP, pero con crecimiento sostenido tiende a concentrar demasiada logica en rutas, servicios grandes y tipos manuales.

Principales sintomas actuales:

- Rutas backend grandes con mezcla de HTTP, reglas, consultas Prisma y auditoria.
- Paginas frontend grandes con estado, consultas, formularios y presentacion en un mismo archivo.
- Tipos de API definidos manualmente en frontend.
- Duplicacion de patrones entre `web` y `platform`.
- Falta de un workspace raiz para coordinar dependencias, scripts y paquetes compartidos.
- CI con validacion desigual entre apps.
- Documentacion de despliegue incompleta para `apps/platform`.

## 3. Objetivos de la refactorizacion

### Objetivos funcionales

- Mantener todas las funcionalidades actuales.
- Mantener rutas publicas y contratos existentes durante la transicion.
- Evitar interrupciones en flujos criticos: login, refresh, animales, inventario, tratamientos, administraciones, dashboard, reportes, tenants y plataforma.
- Permitir que cada fase pueda desplegarse por separado.

### Objetivos tecnicos

- Reorganizar la API por dominios.
- Encapsular acceso a datos por modulo.
- Mover reglas de negocio fuera de rutas HTTP.
- Centralizar contratos compartidos.
- Reducir duplicacion entre frontends.
- Mejorar pruebas por modulo.
- Preparar observabilidad de rendimiento.
- Mantener bajo costo operativo.

### No objetivos

- No separar en microservicios.
- No dividir la base de datos.
- No cambiar autenticacion JWT/RBAC salvo ajustes internos.
- No reescribir los frontends.
- No cambiar Prisma por otro ORM.
- No introducir colas externas salvo evidencia posterior de necesidad.

## 4. Arquitectura destino

La arquitectura destino sera:

```text
apps/
  api/
    src/
      core/
      modules/
      app.ts
      index.ts
  web/
    src/
      app/
      features/
      shared/
  platform/
    src/
      app/
      features/
      shared/
packages/
  contracts/
  api-client/
  ui/
  config/
docs/
```

### Principios

- La API sigue siendo un solo proceso Express.
- Cada dominio tiene su propio modulo.
- Las rutas solo reciben HTTP, validan entrada, llaman casos de uso y devuelven respuesta.
- Los servicios contienen reglas de negocio.
- Los repositorios encapsulan Prisma.
- Los contratos compartidos se consumen desde frontend y backend.
- El codigo compartido se mueve a `packages`, no se duplica entre apps.
- La plataforma SaaS y el dominio tenant comparten infraestructura, pero mantienen limites de autorizacion separados.

## 5. Estructura propuesta del backend

```text
apps/api/src/
  core/
    config/
      env.ts
      prisma.ts
    http/
      asyncHandler.ts
      errors.ts
      pagination.ts
    auth/
      jwt.ts
      cookies.ts
      tenantAuth.middleware.ts
      platformAuth.middleware.ts
      rbac.middleware.ts
    logging/
      logger.ts
      requestLogger.ts
    audit/
      audit.service.ts
    usage/
      usage.service.ts
  modules/
    auth/
      auth.routes.ts
      auth.service.ts
      auth.schemas.ts
      auth.types.ts
      auth.test.ts
    animals/
      animals.routes.ts
      animals.service.ts
      animals.repository.ts
      animals.schemas.ts
      animals.types.ts
      animals.import.service.ts
      animals.test.ts
    establishments/
      establishments.routes.ts
      establishments.service.ts
      establishments.repository.ts
      establishments.schemas.ts
      establishments.types.ts
    inventory/
      inventory.routes.ts
      inventory.service.ts
      inventory.repository.ts
      inventory.schemas.ts
      inventory.types.ts
    treatments/
      treatments.routes.ts
      treatments.service.ts
      treatments.repository.ts
      treatments.schemas.ts
      treatments.types.ts
    reports/
      reports.routes.ts
      reports.service.ts
      reports.types.ts
    dashboard/
      dashboard.routes.ts
      dashboard.service.ts
      dashboard.schemas.ts
    tenants/
      tenants.routes.ts
      tenants.service.ts
      tenants.repository.ts
      tenants.schemas.ts
    platform/
      platform.routes.ts
      auth/
      tenants/
      plans/
      usage/
      support/
      audit/
```

### Reglas de dependencia backend

Permitido:

- `routes` importa `schemas`, `service`, `core/http`, `core/auth`.
- `service` importa `repository`, otros servicios del mismo dominio o servicios core.
- `repository` importa Prisma desde `core/config/prisma`.
- `modules/*` puede usar `core/*`.
- `core/*` no debe importar `modules/*`.

No permitido:

- Un `repository` no debe importar rutas.
- Un modulo no debe acceder directamente a archivos internos de otro modulo salvo por su API publica.
- Las rutas no deben tener transacciones complejas ni consultas Prisma extensas.
- Los frontends no deben importar tipos desde `apps/api/src`.

## 6. Estructura propuesta del frontend tenant

```text
apps/web/src/
  app/
    App.tsx
    routes.tsx
    providers.tsx
  features/
    auth/
    dashboard/
    animals/
    establishments/
    inventory/
    treatments/
    reports/
    users/
    settings/
  shared/
    components/
    layout/
    hooks/
    utils/
```

Cada feature debe agrupar:

```text
feature/
  api.ts
  components/
  hooks.ts
  pages/
  types.ts
  utils.ts
```

Reglas:

- Las paginas deben componer componentes, no contener toda la logica.
- Las llamadas HTTP deben vivir en `feature/api.ts` o en `packages/api-client`.
- Los tipos deben provenir de `packages/contracts` cuando representen respuestas del backend.
- Los helpers realmente compartidos deben estar en `shared` o `packages`.

## 7. Estructura propuesta del frontend platform

```text
apps/platform/src/
  app/
    App.tsx
    routes.tsx
    providers.tsx
  features/
    auth/
    dashboard/
    tenants/
    plans/
    support/
    audit/
  shared/
    components/
    layout/
    hooks/
    utils/
```

La app platform debe compartir:

- Cliente HTTP base.
- Manejo de refresh token.
- Tipos de errores.
- Componentes UI reutilizables cuando aplique.
- Utilidades de fechas, tablas y formularios.

Debe mantenerse separada de `apps/web` en experiencia de producto, rutas y permisos.

## 8. Paquetes compartidos propuestos

### `packages/contracts`

Responsabilidad:

- Definir contratos de request/response.
- Exponer tipos compartidos entre API y frontends.
- Centralizar enums publicos.
- Evitar drift entre backend y frontend.

Contenido inicial:

```text
packages/contracts/src/
  auth.ts
  animals.ts
  inventory.ts
  treatments.ts
  dashboard.ts
  tenants.ts
  platform.ts
  errors.ts
  pagination.ts
```

Regla:

- Debe contener tipos y esquemas puros, sin dependencias de Express, React ni Prisma Client.

### `packages/api-client`

Responsabilidad:

- Crear clientes HTTP para tenant y platform.
- Compartir interceptores de refresh donde sea seguro.
- Normalizar errores de API.
- Evitar duplicacion entre `apps/web/src/lib/api.ts` y `apps/platform/src/lib/api.ts`.

Contenido inicial:

```text
packages/api-client/src/
  createApiClient.ts
  tenantClient.ts
  platformClient.ts
  errors.ts
  authRefresh.ts
```

### `packages/ui`

Responsabilidad:

- Componentes UI verdaderamente compartidos.
- Botones, inputs, tablas, badges, dialogos y empty states.

Regla:

- No debe contener logica de dominio.
- No debe depender de `apps/web` ni `apps/platform`.

### `packages/config`

Responsabilidad:

- Configuracion compartida de TypeScript, Vite, Tailwind o reglas comunes.
- Reducir duplicacion de configuraciones.

## 9. Workspaces y scripts raiz

Crear un `package.json` raiz con npm workspaces:

```json
{
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "audit:prod": "npm audit --omit=dev --audit-level=high --workspaces"
  }
}
```

Consideraciones:

- Mantener lockfiles existentes durante una fase corta si se busca bajo riesgo.
- Luego consolidar hacia un lockfile raiz si el equipo acepta el cambio operativo.
- Documentar el nuevo flujo de instalacion en `README.md`.

## 10. Orden recomendado de refactorizacion

El orden debe minimizar riesgo y maximizar aprendizaje.

### Orden de backend

1. `core`: mover helpers transversales sin cambiar comportamiento.
2. `dashboard`: modulo pequeno y aislado.
3. `inventory`: reglas criticas pero relativamente delimitadas.
4. `treatments`: reglas de salud e inventario.
5. `animals`: modulo grande, dejar para cuando el patron este validado.
6. `establishments`: jerarquia y migracion legacy.
7. `auth`: alta criticidad, mover cuando existan pruebas suficientes.
8. `platform`: refactor por submodulos despues de estabilizar tenant.

### Orden de frontend tenant

1. Extraer `shared` y rutas.
2. Extraer `dashboard`.
3. Extraer `inventory`.
4. Extraer `treatments`.
5. Extraer `animals`.
6. Extraer `establishments`.
7. Extraer `reports`.

### Orden de frontend platform

1. Extraer cliente API compartido.
2. Extraer auth.
3. Extraer tenants.
4. Extraer plans.
5. Extraer support.
6. Extraer audit.

## 11. Plan por fases

## Fase 0: inventario y documentacion

Objetivo:

- Crear una linea base clara antes de mover codigo.

Actividades:

- Listar rutas reales de Express.
- Comparar rutas reales contra `docs/api-endpoints.md` y `apps/api/docs/openapi.yaml`.
- Marcar endpoints activos, legacy, incompletos y documentados pero no montados.
- Registrar modulos por criticidad.
- Registrar tablas de Prisma usadas por cada modulo.
- Documentar dependencias entre dominios.

Archivos afectados:

- Documentacion en `docs`.
- No se cambia comportamiento.

Criterios de aceptacion:

- Existe mapa ruta -> modulo -> pruebas -> tablas.
- Existe lista de endpoints desalineados.
- Existe decision documentada sobre endpoints legacy.

Pruebas:

- No requiere pruebas funcionales.
- Ejecutar `npm run lint` por app para confirmar linea base.

Rollback:

- Revertir solo documentacion.

## Fase 1: estabilizacion de pruebas y CI

Objetivo:

- Asegurar que los siguientes movimientos tengan red de seguridad.

Actividades:

- Ajustar CI para ejecutar `lint` en `api`, `web` y `platform`.
- Ejecutar tests de `web`.
- Agregar tests minimos de `platform` para auth client, roles y render basico si aplica.
- Aislar tests de API con `DATABASE_URL` de test claramente documentado.
- Agregar script raiz cuando existan workspaces.
- Agregar pruebas de contrato para endpoints criticos.

Criterios de aceptacion:

- CI valida build de las tres apps.
- CI valida typecheck de las tres apps.
- Tests existentes siguen verdes.
- Tests de API no apuntan accidentalmente a base local productiva o de desarrollo.

Pruebas necesarias:

- `npm run lint` en las tres apps.
- `npm test` en `apps/api` con DB de test.
- `npm test` en `apps/web`.
- Build de `apps/api`, `apps/web`, `apps/platform`.

Rollback:

- Revertir cambios de workflow o scripts sin tocar codigo funcional.

## Fase 2: crear core compartido dentro del API

Objetivo:

- Separar infraestructura transversal antes de mover dominios.

Actividades:

- Crear `apps/api/src/core`.
- Mover configuracion, errores, logging, auth, cookies, pagination, audit y usage de forma incremental.
- Mantener reexports temporales desde rutas antiguas para reducir cambios por fase.
- No cambiar nombres publicos de endpoints.

Modulos incluidos:

- Configuracion de env.
- Prisma client.
- Error handler.
- Auth tenant/platform.
- RBAC.
- JWT.
- Cookies de refresh token.
- Logging.
- Auditoria.
- Usage service.

Criterios de aceptacion:

- API compila sin cambios de comportamiento.
- Imports antiguos pueden seguir funcionando temporalmente si se necesita.
- No hay ciclos de dependencias.
- `core` no importa `modules`.

Pruebas necesarias:

- Auth login/refresh/logout.
- Health ready/live.
- Seguridad CORS/docs/env.
- Tests de usage limits.

Rollback:

- Mantener archivos originales hasta completar validacion.
- Revertir alias/reexports si aparece regresion.

## Fase 3: modularizar backend por dominio

Objetivo:

- Mover rutas, validaciones, servicios y acceso a datos a modulos con limites claros.

Patron de modulo:

```text
modules/<domain>/
  <domain>.routes.ts
  <domain>.service.ts
  <domain>.repository.ts
  <domain>.schemas.ts
  <domain>.types.ts
  <domain>.test.ts
  index.ts
```

Actividades:

- Empezar con un modulo de bajo riesgo.
- Mover solo un dominio por PR o por cambio controlado.
- Mantener exactamente las mismas rutas HTTP.
- Mover queries Prisma repetidas a repositorios.
- Mover reglas desde rutas hacia servicios.
- Dejar rutas como capa HTTP delgada.
- Registrar auditoria desde servicios cuando sea parte de la regla de negocio.
- Mantener transacciones en servicios, no en rutas.

Criterios de aceptacion:

- Rutas tienen poca logica: parseo, auth, llamada a caso de uso y respuesta.
- Servicios expresan casos de uso.
- Repositorios encapsulan consultas Prisma.
- Pruebas del modulo pasan.
- No cambia contrato de respuesta salvo decision documentada.

Pruebas necesarias:

- Pruebas actuales del dominio.
- Pruebas de errores 400/401/403/404/409.
- Pruebas anti-IDOR por `tenantId`.
- Pruebas de auditoria en operaciones criticas.

Rollback:

- Como cada modulo se migra aislado, revertir el cambio del modulo afectado.
- Mantener `routes/index.ts` como punto unico de montaje para activar/desactivar modulos.

## Fase 4: contratos compartidos

Objetivo:

- Reducir inconsistencias entre API, `web` y `platform`.

Actividades:

- Crear `packages/contracts`.
- Mover tipos publicos de respuestas y requests.
- Exponer tipos para paginacion, errores, roles, planes y metricas.
- Definir si los contratos salen de Zod, OpenAPI o tipos TS mantenidos manualmente.
- Reemplazar gradualmente tipos duplicados en `apps/web/src/lib/types.ts`.
- Reemplazar tipos duplicados en `apps/platform/src/lib/types.ts`.

Decision recomendada:

- En el corto plazo, usar tipos TS y Zod compartidos en `packages/contracts`.
- En una fase posterior, generar OpenAPI desde esos contratos o validar OpenAPI contra ellos.

Criterios de aceptacion:

- `web` y `platform` consumen tipos desde `packages/contracts` para endpoints migrados.
- No se importa codigo desde `apps/api/src` en frontend.
- Contratos no dependen de Prisma Client ni Express.

Pruebas necesarias:

- Typecheck de todas las apps.
- Tests de helpers frontend.
- Tests de contrato para endpoints migrados.

Rollback:

- Mantener tipos locales hasta que cada feature migre.
- Revertir por feature si un contrato queda incompleto.

## Fase 5: cliente API compartido

Objetivo:

- Eliminar duplicacion de axios, refresh token y manejo de errores.

Actividades:

- Crear `packages/api-client`.
- Implementar factory para cliente tenant.
- Implementar factory para cliente platform.
- Mantener base URLs configurables con `VITE_API_URL`.
- Unificar normalizacion de errores.
- Mantener diferencias de rutas auth tenant/platform.

Criterios de aceptacion:

- `apps/web` conserva comportamiento actual de refresh y redirect.
- `apps/platform` conserva comportamiento actual de refresh y redirect.
- No se mezclan cookies ni scopes tenant/platform.
- Los interceptores evitan multiples refresh simultaneos.

Pruebas necesarias:

- Refresh exitoso.
- Refresh fallido limpia sesion.
- 401 en login no dispara refresh.
- Tenant token no accede platform.
- Platform token no accede tenant.

Rollback:

- Mantener clientes locales hasta completar migracion.
- Habilitar uso del cliente compartido por app, no al mismo tiempo si hay riesgo.

## Fase 6: modularizacion frontend

Objetivo:

- Reducir paginas grandes y separar UI, estado, API y reglas de presentacion.

Actividades:

- Crear `features`.
- Mover paginas grandes a subcomponentes.
- Extraer hooks de queries y mutations.
- Extraer formularios y tablas.
- Reemplazar `any` por contratos compartidos.
- Mantener rutas existentes.
- Mantener lazy loading.

Criterios de aceptacion:

- Una pagina debe coordinar flujo, no contener toda la implementacion.
- Queries y mutations viven en hooks o API de feature.
- Tipos de dominio vienen de contracts.
- Componentes UI compartidos no conocen reglas de negocio.

Pruebas necesarias:

- Tests de helpers y hooks criticos.
- Smoke de rutas principales.
- Build de `web` y `platform`.
- Revision visual manual en flujos criticos.

Rollback:

- Migrar una feature por vez.
- Mantener pagina anterior hasta que la nueva pase smoke si el cambio es grande.

## Fase 7: observabilidad y rendimiento

Objetivo:

- Medir antes de optimizar y detectar cuellos reales.

Actividades:

- Registrar latencia por endpoint.
- Registrar errores por endpoint.
- Revisar queries lentas en PostgreSQL.
- Medir p50, p95 y p99 de endpoints criticos.
- Medir crecimiento de tablas `AuditLog`, `UsageEvent`, `AnimalEvent`, `InventoryTransaction`.
- Revisar uso de indices por `tenantId`, fechas y estado.
- Definir estrategia para `UsageEvent` si crece demasiado.

Riesgos conocidos:

- Escritura de usage por cada request tenant.
- Reportes y dashboard con agregaciones sobre tablas grandes.
- Importaciones CSV con transacciones grandes.
- Auditoria creciendo sin retencion.

Acciones recomendadas:

- Agregar limites de paginacion estrictos.
- Optimizar indices compuestos por modulo.
- Evaluar batch interno para usage events.
- Evaluar preagregados para dashboard si p95 supera objetivo.
- Definir politica de retencion/archivo para auditoria y usage.

Criterios de aceptacion:

- Existen metricas basicas de latencia y errores.
- Existen consultas lentas identificables.
- Hay umbrales definidos para decidir optimizaciones.

Pruebas necesarias:

- Smoke de endpoints criticos.
- Pruebas de carga basicas con dataset representativo.
- Revision de explain/analyze en consultas lentas.

Rollback:

- Observabilidad debe ser no invasiva.
- Cualquier cambio de performance debe poder apagarse o revertirse.

## Fase 8: despliegue y documentacion operativa

Objetivo:

- Alinear documentacion y despliegue con la nueva estructura.

Actividades:

- Actualizar `README.md`.
- Actualizar `docs/deploy.md`.
- Documentar build de `apps/platform`.
- Documentar comandos con workspaces.
- Documentar variables de entorno por app.
- Documentar estrategia de migraciones Prisma.
- Documentar rollback por release.

Criterios de aceptacion:

- Un nuevo desarrollador puede levantar todo con el README.
- Produccion tiene instrucciones para API, web y platform.
- CI refleja los mismos comandos documentados.

Pruebas necesarias:

- Ejecutar flujo local desde cero.
- Build de las tres apps.
- Health checks documentados.

Rollback:

- Mantener comandos antiguos documentados durante una fase de transicion.

## 12. Criterios globales de aceptacion

La refactorizacion se considera exitosa cuando:

- El sistema conserva todas las rutas publicas actuales.
- La API esta organizada por modulos de dominio.
- Las rutas backend son delgadas.
- Prisma esta encapsulado por repositorios o servicios de dominio.
- `web` y `platform` comparten contratos.
- La duplicacion de API client/auth client se reduce.
- CI valida las tres apps de forma consistente.
- El despliegue documenta API, web y platform.
- No existen ciclos de dependencias relevantes.
- Los endpoints criticos tienen pruebas.
- Hay medicion basica de latencia y errores.

## 13. Pruebas minimas por dominio

### Auth tenant

- Login exitoso.
- Login invalido.
- Refresh exitoso.
- Refresh invalido retorna 401.
- Logout invalido retorna 401.
- Usuario inactivo no refresca sesion.
- Cambio de tenant solo con membresia real.

### Auth platform

- Login platform exitoso.
- Token tenant no accede a platform.
- Token platform no accede a tenant.
- Roles platform aplican permisos correctos.
- MFA mantiene comportamiento actual.

### Animals

- Listado por tenant.
- Creacion respeta limite de animales activos.
- Edicion no cruza tenant.
- Eliminacion soft delete.
- Import CSV valida tamano, tipo y filas maximas.
- Import CSV rechaza establecimientos invalidos.

### Inventory

- Entradas y salidas actualizan stock correctamente.
- API publica no acepta `ADJUST` si sigue siendo interno.
- No permite stock negativo.
- Alertas de vencimiento y bajo stock.

### Treatments

- Tratamiento individual.
- Tratamiento grupal.
- Preview de grupo.
- Administracion descuenta inventario.
- Cierre de tratamiento.
- Retiros carne/leche calculados correctamente.

### Establishments

- Arbol finca/potrero.
- Conteos por establecimiento.
- Migracion legacy de corrales.
- Rechazo de asignacion a ubicacion no operativa.

### Platform tenants

- Listado con filtros.
- Creacion de tenant con owner.
- Suspension.
- Reactivacion.
- Cambio de plan.
- Auditoria de acciones platform.

### Dashboard/reportes

- Filtros por rango.
- Precedencia `establishmentId > fincaId > tenant`.
- Respuesta estable sin datos.
- Respuesta eficiente con dataset grande.

## 14. Rendimiento esperado y controles

La refactorizacion por si sola no hace que la API sea mas rapida automaticamente. Su beneficio principal es permitir optimizar con menor riesgo.

Controles recomendados:

- Medir p95 por endpoint.
- Medir tiempo de queries Prisma.
- Revisar tablas con mayor crecimiento.
- Agregar indices solo con evidencia.
- Evitar endpoints sin paginacion.
- Evitar cargar relaciones grandes sin necesidad.
- Evitar que dashboard haga agregaciones costosas en cada render si el volumen crece.

Umbrales iniciales recomendados:

- API p95 menor a 500 ms en endpoints comunes.
- Dashboard p95 menor a 1500 ms con dataset operativo.
- Login/refresh p95 menor a 700 ms.
- Import CSV ejecutado como operacion controlada, no como request masivo ilimitado.
- Ningun endpoint listado debe devolver mas de `pageSize` maximo permitido.

Si se superan los umbrales:

- Primero optimizar query e indices.
- Luego cachear o preagregar.
- Luego desacoplar escrituras secundarias.
- Solo despues evaluar colas externas o servicios separados.

## 15. Riesgos y mitigaciones

### Riesgo: regresiones por mover codigo

Mitigacion:

- Mover un modulo por vez.
- Mantener contratos HTTP.
- Ejecutar pruebas del dominio.
- Usar PRs pequenos.

### Riesgo: sobredisenar el monolito

Mitigacion:

- No introducir interfaces abstractas sin necesidad.
- No aplicar Clean Architecture completa de forma dogmatica.
- Usar repositorios solo donde simplifiquen queries o pruebas.

### Riesgo: drift entre contratos y API

Mitigacion:

- `packages/contracts`.
- Tests de contrato.
- OpenAPI validado o generado desde fuente unica en fase posterior.

### Riesgo: impacto en rendimiento por usage/audit

Mitigacion:

- Medir escrituras.
- Batch interno si crece el trafico.
- Retencion para eventos historicos.
- Indices por `tenantId` y fecha.

### Riesgo: confusion operativa por workspaces

Mitigacion:

- Documentar comandos nuevos.
- Mantener comandos antiguos temporalmente.
- Migrar scripts de CI despues de validar localmente.

### Riesgo: mezcla de tenant y platform

Mitigacion:

- Mantener middlewares separados.
- Mantener cookies separadas.
- Mantener clientes API separados.
- Pruebas explicitas de scope.

## 16. Plan de rollback general

Cada fase debe poder revertirse sin afectar datos productivos.

Reglas:

- No cambiar schema de DB durante refactor estructural salvo que sea estrictamente necesario.
- Si hay migraciones Prisma, deben ir en PR separado.
- Mantener endpoints antiguos hasta que los nuevos pasen pruebas.
- No cambiar simultaneamente backend y frontend si no es necesario.
- Publicar cambios por modulo.

Rollback tecnico:

- Revertir PR del modulo afectado.
- Mantener montaje central de rutas para volver a handler anterior.
- Mantener tipos locales hasta que contracts este completamente validado.
- Mantener clientes API locales hasta que `packages/api-client` este estable.

## 17. Secuencia recomendada de entregables

1. Documento de inventario ruta-modulo-tabla-test.
2. CI homogeneo para API, web y platform.
3. `core` backend creado con reexports temporales.
4. Primer modulo migrado: `dashboard`.
5. Segundo modulo migrado: `inventory`.
6. `packages/contracts` inicial.
7. `packages/api-client` inicial.
8. Migracion de `platform` a cliente compartido.
9. Migracion de `web` a cliente compartido.
10. Modularizacion de `treatments`.
11. Modularizacion de `animals`.
12. Modularizacion de `establishments`.
13. Refactor frontend por features.
14. Observabilidad basica.
15. Documentacion final de despliegue y desarrollo.

## 18. Reglas de implementacion

- No mezclar refactor con cambios funcionales grandes.
- No cambiar contratos publicos sin documentarlo.
- No tocar multiples dominios grandes en el mismo cambio.
- No introducir microservicios.
- No duplicar tipos nuevos entre frontend y backend.
- No acceder a datos de otro tenant sin `tenantId`.
- No aceptar `tenantId` del frontend como fuente de verdad para operaciones tenant.
- No mover auth al final sin pruebas suficientes.
- No remover codigo antiguo hasta que la nueva estructura este validada.

## 19. Resultado esperado

Al terminar, el sistema seguira siendo un monolito, pero con estructura interna preparada para crecimiento.

Beneficios esperados:

- Menor tiempo para agregar funcionalidades.
- Menos regresiones por cambios de dominio.
- Menor duplicacion entre frontends.
- Contratos mas confiables.
- CI mas representativo.
- Mejor base para optimizaciones reales de rendimiento.
- Despliegue simple conservado.
- Camino abierto para evolucionar a colas o servicios separados solo si los datos lo justifican.

Conclusion:

El proyecto no necesita una migracion disruptiva. Necesita convertir el monolito actual en un monolito modular disciplinado, con paquetes compartidos y medicion operativa. Esa ruta conserva la simplicidad actual y prepara el sistema para escalar con menor riesgo.
