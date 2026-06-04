import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getMovementTypeLabel } from "@/lib/dashboard";
import { formatDateOnlyUtc } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { MovementRecentRow } from "@/lib/types";

const typeBadge: Record<string, string> = {
  INTERNAL: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  EXTERNAL: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  SALE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  SLAUGHTER: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

export const MovementsCompactTable = ({
  data,
  allLink,
}: {
  data: MovementRecentRow[];
  allLink?: string;
}) => {
  if (data.length === 0) {
    return (
      <div className="grid min-h-[80px] place-items-center text-sm text-slate-400 dark:text-slate-500">
        Sin movimientos recientes
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-left dark:border-slate-800">
            <th className="pb-2 pr-3 font-medium text-slate-400 dark:text-slate-500">Tipo</th>
            <th className="pb-2 pr-3 font-medium text-slate-400 dark:text-slate-500">Animal</th>
            <th className="hidden pb-2 pr-3 font-medium text-slate-400 sm:table-cell dark:text-slate-500">Ruta</th>
            <th className="pb-2 text-right font-medium text-slate-400 dark:text-slate-500">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr
              key={m.id}
              className="border-b border-slate-50 transition-colors hover:bg-slate-50/80 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
            >
              <td className="py-2 pr-3">
                <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", typeBadge[m.movementType] ?? typeBadge.INTERNAL)}>
                  {getMovementTypeLabel(m.movementType)}
                </span>
              </td>
              <td className="py-2 pr-3 font-medium text-slate-700 dark:text-slate-300">
                {m.animalTag || m.animalId.slice(0, 8)}
              </td>
              <td className="hidden py-2 pr-3 text-slate-500 sm:table-cell dark:text-slate-400">
                {m.originName || "—"}
                <ArrowRight className="mx-1 inline h-3 w-3 text-slate-300 dark:text-slate-600" />
                {m.destinationName || "—"}
              </td>
              <td className="py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                {formatDateOnlyUtc(m.occurredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {allLink ? (
        <div className="mt-3 text-center">
          <Link
            to={allLink}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Ver todos los movimientos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
};
