import { useState } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";

type DashboardAlertStripProps = {
  inventoryAlerts?: {
    value: number;
    expiring: number;
    lowStock: number;
  };
  withdrawalsActive?: number;
  inventoryLink?: string;
  withdrawalsLink?: string;
};

export const DashboardAlertStrip = ({
  inventoryAlerts,
  withdrawalsActive,
  inventoryLink,
  withdrawalsLink,
}: DashboardAlertStripProps) => {
  const [dismissed, setDismissed] = useState(false);
  const total = (inventoryAlerts?.value ?? 0) + (withdrawalsActive ?? 0);

  if (total === 0 || dismissed) return null;

  const parts: string[] = [];
  if (inventoryAlerts && inventoryAlerts.lowStock > 0)
    parts.push(`${inventoryAlerts.lowStock} bajo stock minimo`);
  if (inventoryAlerts && inventoryAlerts.expiring > 0)
    parts.push(`${inventoryAlerts.expiring} lotes por vencer`);
  if (withdrawalsActive && withdrawalsActive > 0)
    parts.push(`${withdrawalsActive} retiros activos`);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/8">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

      <p className="flex-1 text-xs font-medium text-amber-800 dark:text-amber-200">
        <span className="font-semibold">{total} alerta{total > 1 ? "s" : ""} activa{total > 1 ? "s" : ""}</span>
        {parts.length > 0 ? <span className="text-amber-700 dark:text-amber-300"> — {parts.join(", ")}</span> : null}
      </p>

      <div className="flex shrink-0 items-center gap-2">
        {inventoryLink ? (
          <Link
            to={inventoryLink}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-700"
          >
            Inventario <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
        {withdrawalsLink ? (
          <Link
            to={withdrawalsLink}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10"
          >
            Retiros
          </Link>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-amber-500 transition hover:bg-amber-200/60 hover:text-amber-700 dark:hover:bg-amber-500/15"
        aria-label="Cerrar alerta"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
