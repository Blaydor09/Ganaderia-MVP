import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { dashboardRangeOptions } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import type { DashboardRange, EstablishmentNode } from "@/lib/types";

type DashboardHeroProps = {
  range: DashboardRange;
  fincaId?: string;
  establishmentId?: string;
  fincas: EstablishmentNode[];
  establishmentsByFinca: EstablishmentNode[];
  onChangeRange: (next: DashboardRange) => void;
  onChangeFinca: (next?: string) => void;
  onChangeEstablishment: (next?: string) => void;
  onReset: () => void;
  actions?: ReactNode;
  generatedAt?: string;
  isFetching?: boolean;
  alertCount: number;
  animalsActive: number;
  treatmentsInRange: number;
  movementsInRange: number;
};

const buildChipLabel = (label: string, value: string) => `${label}: ${value}`;

export const DashboardHero = ({
  range,
  fincaId,
  establishmentId,
  fincas,
  establishmentsByFinca,
  onChangeRange,
  onChangeFinca,
  onChangeEstablishment,
  onReset,
  actions,
  generatedAt,
  isFetching,
  alertCount,
  animalsActive,
  treatmentsInRange,
  movementsInRange,
}: DashboardHeroProps) => {
  const activeRangeLabel =
    dashboardRangeOptions.find((option) => option.value === range)?.label ?? dashboardRangeOptions[1].label;
  const activeFincaLabel = fincaId
    ? fincas.find((item) => item.id === fincaId)?.name ?? "Finca seleccionada"
    : "Todas las fincas";
  const activeEstablishmentLabel = establishmentId
    ? establishmentsByFinca.find((item) => item.id === establishmentId)?.name ?? "Establecimiento seleccionado"
    : "Todos los establecimientos";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 text-white shadow-soft dark:border-slate-700">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.18),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.15),rgba(15,23,42,0.55))]" />
      <div className="absolute -left-16 top-20 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative grid gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-emerald-100">
              Centro operativo
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Dashboard operativo
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Supervisa el estado del hato, prioriza riesgos y entra a la accion desde una sola vista.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-slate-200">
            {[buildChipLabel("Periodo", activeRangeLabel), buildChipLabel("Finca", activeFincaLabel), buildChipLabel("Ubicacion", activeEstablishmentLabel)].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 backdrop-blur-sm"
              >
                {chip}
              </span>
            ))}
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}

          <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-1 backdrop-blur-sm">
              <div className="flex flex-wrap gap-1">
                {dashboardRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeRange(option.value)}
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm font-medium transition",
                      range === option.value
                        ? "bg-white text-slate-950 shadow-soft"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <select
                className="h-11 rounded-2xl border border-white/12 bg-white/8 px-4 text-sm text-white outline-none backdrop-blur-sm transition focus:border-emerald-300/60"
                value={fincaId ?? ""}
                onChange={(event) => onChangeFinca(event.target.value || undefined)}
              >
                <option value="">Todas las fincas</option>
                {fincas.map((finca) => (
                  <option key={finca.id} value={finca.id} className="text-slate-900">
                    {finca.name}
                  </option>
                ))}
              </select>

              <select
                className="h-11 rounded-2xl border border-white/12 bg-white/8 px-4 text-sm text-white outline-none backdrop-blur-sm transition focus:border-emerald-300/60"
                value={establishmentId ?? ""}
                onChange={(event) => onChangeEstablishment(event.target.value || undefined)}
              >
                <option value="">Todos los establecimientos</option>
                {establishmentsByFinca.map((node) => (
                  <option key={node.id} value={node.id} className="text-slate-900">
                    {node.name} ({node.type})
                  </option>
                ))}
              </select>

              <Button
                variant="secondary"
                className="h-11 rounded-2xl bg-white text-slate-900 hover:bg-slate-100"
                onClick={onReset}
              >
                Limpiar vista
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5 backdrop-blur-md">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Estado actual</p>
              <h2 className="font-display text-2xl font-semibold text-white">
                {alertCount > 0 ? "Atencion operativa" : "Operacion estable"}
              </h2>
              <p className="text-sm text-slate-300">
                {alertCount > 0
                  ? "Hay focos de inventario o retiro que conviene atender hoy."
                  : "No hay alertas activas para los filtros seleccionados."}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Alertas activas</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="font-display text-4xl font-semibold text-white">{alertCount}</p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                  {alertCount > 0 ? "Requiere seguimiento" : "Sin pendientes"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Animales</p>
                <p className="mt-1 text-2xl font-semibold text-white">{animalsActive}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tratamientos</p>
                <p className="mt-1 text-2xl font-semibold text-white">{treatmentsInRange}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Movimientos</p>
                <p className="mt-1 text-2xl font-semibold text-white">{movementsInRange}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-300">
              {generatedAt ? `Datos generados: ${generatedAt}` : "Cargando agregados del dashboard..."}
              {isFetching ? " (actualizando...)" : ""}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};