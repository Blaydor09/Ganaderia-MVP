import { EmptyState } from "@/components/ui/empty-state";

export const DashboardEmptyState = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    title="No hay datos para el periodo seleccionado"
    description="Ajusta filtros de tiempo o ubicacion para visualizar actividad operativa."
    action={
      onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Reintentar
        </button>
      ) : null
    }
  />
);
