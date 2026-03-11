import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardMetricCardProps = {
  label: string;
  value: number;
  helper: string;
  detail?: string;
  deltaPct?: number;
  icon?: ReactNode;
  to?: string;
  tone?: "emerald" | "sky" | "amber" | "rose" | "slate";
};

const toneStyles = {
  emerald: {
    accent: "bg-emerald-500",
    iconWrap: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  sky: {
    accent: "bg-sky-500",
    iconWrap: "bg-sky-500/12 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
  amber: {
    accent: "bg-amber-500",
    iconWrap: "bg-amber-500/12 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  rose: {
    accent: "bg-rose-500",
    iconWrap: "bg-rose-500/12 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
  slate: {
    accent: "bg-slate-500",
    iconWrap: "bg-slate-500/12 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  },
};

const DeltaPill = ({ value }: { value: number }) => {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        positive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value)}%
    </span>
  );
};

const MetricContent = ({
  label,
  value,
  helper,
  detail,
  deltaPct,
  icon,
  to,
  tone = "slate",
}: DashboardMetricCardProps) => (
  <>
    <div className={cn("h-1 w-full", toneStyles[tone].accent)} />
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <div className="space-y-1">
            <p className="font-display text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {value}
            </p>
            {detail ? (
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{detail}</p>
            ) : null}
          </div>
        </div>
        {icon ? (
          <span
            className={cn(
              "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
              toneStyles[tone].iconWrap
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p className="mt-3 min-h-[40px] text-sm leading-5 text-slate-500 dark:text-slate-400">{helper}</p>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        {typeof deltaPct === "number" ? (
          <DeltaPill value={deltaPct} />
        ) : (
          <span className="font-medium uppercase tracking-[0.2em] text-slate-400">Seguimiento</span>
        )}
        {to ? <span className="font-medium text-slate-600 dark:text-slate-300">Ver detalle</span> : null}
      </div>
    </CardContent>
  </>
);

export const DashboardMetricCard = ({ to, ...props }: DashboardMetricCardProps) => {
  const card = (
    <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:from-slate-950/95 dark:to-slate-900/80 dark:hover:border-slate-700">
      <MetricContent {...props} to={to} />
    </Card>
  );

  if (!to) return card;

  return (
    <Link to={to} className="block focus-visible:outline-none">
      {card}
    </Link>
  );
};