import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: number;
  helper?: string;
  deltaPct?: number;
  icon?: ReactNode;
  to?: string;
};

const KpiDelta = ({ value }: { value: number }) => {
  const positive = value >= 0;
  const colorClass = positive
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-red-700 dark:text-red-300";
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={cn("inline-flex items-center gap-1 text-xs font-medium", colorClass)}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value)}%
    </div>
  );
};

const KpiInner = ({ label, value, helper, deltaPct, icon }: Omit<KpiCardProps, "to">) => (
  <>
    <CardHeader className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {icon ? <span className="text-slate-400 dark:text-slate-500">{icon}</span> : null}
      </div>
      <p className="font-display text-3xl font-semibold">{value}</p>
    </CardHeader>
    <CardContent className="flex items-center justify-between">
      {helper ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{helper}</p>
      ) : (
        <span />
      )}
      {typeof deltaPct === "number" ? <KpiDelta value={deltaPct} /> : null}
    </CardContent>
  </>
);

export const KpiCard = ({ to, ...props }: KpiCardProps) => {
  if (!to) {
    return (
      <Card>
        <KpiInner {...props} />
      </Card>
    );
  }

  return (
    <Card className="transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
      <Link to={to} className="block focus-visible:outline-none">
        <KpiInner {...props} />
      </Link>
    </Card>
  );
};
