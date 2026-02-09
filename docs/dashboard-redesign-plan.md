# Dashboard Redesign Plan (Baseline + Data Contract)

## Objetivo
Convertir el dashboard en un panel operativo con datos agregados reales, filtros coherentes y experiencia de uso consistente con el shell global del sistema.

## KPIs congelados (Fase 0)

| KPI | Fuente principal | Regla de calculo | Formato visual |
| --- | --- | --- | --- |
| Animales activos | `Animal` | Conteo de animales del tenant/filtro de ubicacion | Tarjeta KPI |
| Tratamientos en rango | `Treatment` | Conteo por `startedAt` dentro del rango | Tarjeta KPI + delta |
| Movimientos en rango | `Movement` | Conteo por `occurredAt` dentro del rango | Tarjeta KPI + delta |
| Retiros activos | `Administration` | Tratamientos unicos con `meatWithdrawalUntil > now` o `milkWithdrawalUntil > now` | Tarjeta KPI |
| Alertas inventario | `Batch`, `Product` | `expiringCount + lowStockCount` | Tarjeta KPI |

## Graficos congelados (Fase 0)

| Bloque | Fuente principal | Regla de calculo | Formato visual |
| --- | --- | --- | --- |
| Distribucion por categoria | `Animal` | `groupBy(category)` | Pie chart |
| Distribucion por sexo | `Animal` | `groupBy(sex)` | Pie chart |
| Ciclo de vida | `AnimalEvent` | Serie diaria de `NACIMIENTO`, `MUERTE`, `VENTA` | Bar chart |
| Aplicaciones por dia | `Administration` | Serie diaria por `administeredAt` | Area chart |
| Stock vs minimo | `Batch`, `Product` | Top por stock y comparacion contra `minStock` | Bar chart |
| Movimientos recientes | `Movement` | Ultimos movimientos por fecha descendente | Lista operativa |

## Contrato de agregados backend

- Endpoint: `GET /api/v1/dashboard/overview`
- Query params:
  - `range=7d|30d|90d` (default `30d`)
  - `fincaId` opcional
  - `establishmentId` opcional
- Precedencia de filtros:
  - Si existe `establishmentId`, se ignora `fincaId`
  - Si no existe ninguno, el alcance es todo el tenant
- Campos de respuesta:
  - `kpis`
  - `animalDistribution`
  - `treatmentsSeries`
  - `lifecycleSeries`
  - `inventoryTop`
  - `movementsRecent`
  - `appliedFilters`
  - `generatedAt`

## Estados UX requeridos

- `loading`: skeleton completo de dashboard.
- `error`: estado de error con accion de reintento.
- `empty`: mensaje util cuando no hay datos para el filtro actual.
- `stale`: indicador visual cuando React Query esta refrescando datos.

## Reglas de calidad para dashboard frontend

- No usar datos mock.
- Todos los bloques reaccionan a los mismos filtros.
- Widgets principales con navegacion contextual (drill-down).
- Tipado fuerte en DTOs de dashboard (`DashboardOverviewResponse` y tipos derivados).
