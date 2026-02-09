import { Button } from "@/components/ui/button";
import { dashboardRangeOptions } from "@/lib/dashboard";
import type { DashboardRange, EstablishmentNode } from "@/lib/types";

type DashboardFiltersBarProps = {
  range: DashboardRange;
  fincaId?: string;
  establishmentId?: string;
  fincas: EstablishmentNode[];
  establishmentsByFinca: EstablishmentNode[];
  onChangeRange: (next: DashboardRange) => void;
  onChangeFinca: (next?: string) => void;
  onChangeEstablishment: (next?: string) => void;
  onReset: () => void;
};

export const DashboardFiltersBar = ({
  range,
  fincaId,
  establishmentId,
  fincas,
  establishmentsByFinca,
  onChangeRange,
  onChangeFinca,
  onChangeEstablishment,
  onReset,
}: DashboardFiltersBarProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-soft backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
    <div className="grid gap-3 md:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Periodo</label>
        <select
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          value={range}
          onChange={(event) => onChangeRange(event.target.value as DashboardRange)}
        >
          {dashboardRangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Finca</label>
        <select
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          value={fincaId ?? ""}
          onChange={(event) => onChangeFinca(event.target.value || undefined)}
        >
          <option value="">Todas</option>
          {fincas.map((finca) => (
            <option key={finca.id} value={finca.id}>
              {finca.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Establecimiento
        </label>
        <select
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          value={establishmentId ?? ""}
          onChange={(event) => onChangeEstablishment(event.target.value || undefined)}
        >
          <option value="">Todos</option>
          {establishmentsByFinca.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name} ({node.type})
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <Button variant="outline" className="w-full" onClick={onReset}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  </div>
);
