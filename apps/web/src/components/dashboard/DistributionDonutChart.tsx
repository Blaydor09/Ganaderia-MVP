import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type DistributionDonutDatum = {
  name: string;
  value: number;
  color: string;
};

export const DistributionDonutChart = ({
  data,
  total,
  centerLabel = "Total",
  totalSuffix = "animales",
  showLegend = true,
  sizeClassName,
}: {
  data: DistributionDonutDatum[];
  total: number;
  centerLabel?: string;
  totalSuffix?: string;
  showLegend?: boolean;
  sizeClassName?: string;
}) => {
  const visibleData = data.filter((item) => item.value > 0);

  if (visibleData.length === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-slate-500 dark:text-slate-400">
        Sin datos para graficar
      </div>
    );
  }

  return (
    <div className={cn("grid h-full gap-4", showLegend ? "grid-rows-[minmax(0,1fr)_auto]" : "items-center")}>
      <div className={cn("relative mx-auto h-full w-full max-w-[18rem]", sizeClassName)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Tooltip
              formatter={(value: number | string, _name: string, item) => {
                const numericValue = Number(value);
                const percentage = total > 0 ? Math.round((numericValue / total) * 100) : 0;
                const payload = item?.payload as { name?: string } | undefined;
                const label = typeof payload?.name === "string" ? payload.name : "Cantidad";

                return [`${numericValue} ${totalSuffix} (${percentage}%)`, label];
              }}
              contentStyle={{
                borderRadius: "1rem",
                borderColor: "rgba(148, 163, 184, 0.24)",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
              }}
            />
            <Pie
              data={visibleData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={0}
              stroke="none"
            >
              {visibleData.map((entry) => (
                <Cell key={`distribution-${entry.name}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
            {centerLabel}
          </span>
          <span className="font-display text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {total}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{totalSuffix}</span>
        </div>
      </div>

      {showLegend ? (
        <div className="flex flex-wrap justify-center gap-2">
          {visibleData.map((entry) => (
            <div
              key={`legend-${entry.name}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};