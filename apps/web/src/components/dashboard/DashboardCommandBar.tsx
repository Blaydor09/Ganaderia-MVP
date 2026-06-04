import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardRangeOptions } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import type { DashboardRange, EstablishmentNode } from "@/lib/types";

type DashboardCommandBarProps = {
  range: DashboardRange;
  fincaId?: string;
  establishmentId?: string;
  fincas: EstablishmentNode[];
  establishments: EstablishmentNode[];
  onChangeRange: (next: DashboardRange) => void;
  onChangeFinca: (next?: string) => void;
  onChangeEstablishment: (next?: string) => void;
  onReset: () => void;
  generatedAt?: string;
  isFetching?: boolean;
};

export const DashboardCommandBar = ({
  range,
  fincaId,
  establishmentId,
  fincas,
  establishments,
  onChangeRange,
  onChangeFinca,
  onChangeEstablishment,
  onReset,
  generatedAt,
  isFetching,
}: DashboardCommandBarProps) => (
  <div className="dash-card flex flex-wrap items-center gap-3 px-4 py-2.5">
    {/* Period pills */}
    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
      {dashboardRangeOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChangeRange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
            range === opt.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>

    {/* Divider */}
    <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />

    {/* Finca select */}
    <select
      className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      value={fincaId ?? ""}
      onChange={(e) => onChangeFinca(e.target.value || undefined)}
    >
      <option value="">Todas las fincas</option>
      {fincas.map((f) => (
        <option key={f.id} value={f.id}>{f.name}</option>
      ))}
    </select>

    {/* Establishment select */}
    <select
      className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      value={establishmentId ?? ""}
      onChange={(e) => onChangeEstablishment(e.target.value || undefined)}
    >
      <option value="">Todos los establecimientos</option>
      {establishments.map((n) => (
        <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
      ))}
    </select>

    {/* Reset */}
    <Button
      variant="ghost"
      size="sm"
      className="h-8 rounded-lg px-3 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      onClick={onReset}
    >
      Limpiar
    </Button>

    {/* Spacer + timestamp */}
    <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
      {isFetching ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : null}
      {generatedAt ? <span>Datos: {generatedAt}</span> : null}
    </div>
  </div>
);
