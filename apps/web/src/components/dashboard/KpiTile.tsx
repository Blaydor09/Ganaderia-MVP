import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type KpiTileProps = {
  label: string;
  value: number;
  deltaPct?: number;
  icon?: ReactNode;
  to?: string;
  tone?: "emerald" | "sky" | "amber" | "rose" | "slate";
  detail?: string;
};

const accentColor: Record<string, string> = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

const iconBg: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  sky: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  slate: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

const DeltaBadge = ({ value }: { value: number }) => {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
        positive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
      )}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
};

const TileContent = ({ label, value, deltaPct, icon, tone = "slate", detail }: KpiTileProps) => (
  <div className="dash-card group flex min-h-[96px] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-kpi-hover">
    {/* Accent bar */}
    <div className={cn("w-[3px] shrink-0 rounded-l-[var(--dash-card-radius)]", accentColor[tone])} />

    <div className="flex flex-1 items-start justify-between gap-3 p-4">
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {value.toLocaleString("es-ES")}
          </p>
          {typeof deltaPct === "number" ? <DeltaBadge value={deltaPct} /> : null}
        </div>
        {detail ? (
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{detail}</p>
        ) : null}
      </div>

      {icon ? (
        <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconBg[tone])}>
          {icon}
        </span>
      ) : null}
    </div>
  </div>
);

export const KpiTile = ({ to, ...props }: KpiTileProps) => {
  const tile = <TileContent {...props} to={to} />;
  if (!to) return tile;
  return (
    <Link to={to} className="block focus-visible:outline-none">
      {tile}
    </Link>
  );
};
