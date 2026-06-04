import type { InventoryTopRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const gaugeColor = (stock: number, min: number) => {
  if (min <= 0) return "bg-brand-500";
  const ratio = stock / min;
  if (ratio < 1) return "bg-red-500";
  if (ratio < 1.5) return "bg-amber-500";
  return "bg-brand-500";
};

const gaugeWidth = (stock: number, maxStock: number) => {
  if (maxStock <= 0) return 0;
  return Math.min(100, Math.max(4, (stock / maxStock) * 100));
};

export const InventoryGaugeTable = ({ data }: { data: InventoryTopRow[] }) => {
  const maxStock = Math.max(...data.map((r) => Math.max(r.stock, r.minStock)), 1);

  if (data.length === 0) {
    return (
      <div className="grid h-full min-h-[140px] place-items-center text-sm text-slate-400 dark:text-slate-500">
        Sin productos en inventario
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((row) => {
        const belowMin = row.minStock > 0 && row.stock < row.minStock;
        return (
          <div
            key={row.productId}
            className={cn(
              "rounded-lg px-3 py-2 transition-colors",
              belowMin
                ? "bg-red-50/60 dark:bg-red-500/5"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
            )}
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className={cn(
                "flex-1 truncate font-medium",
                belowMin ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300"
              )}>
                {row.productName}
              </span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {row.stock}{row.unit ? ` ${row.unit}` : ""}
                <span className="text-slate-400 dark:text-slate-600"> / {row.minStock}</span>
              </span>
            </div>
            {/* Gauge bar */}
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn("h-1.5 rounded-full transition-all duration-500", gaugeColor(row.stock, row.minStock))}
                style={{ width: `${gaugeWidth(row.stock, maxStock)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
