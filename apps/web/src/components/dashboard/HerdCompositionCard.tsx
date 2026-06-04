import { useState } from "react";
import {
  DistributionDonutChart,
  type DistributionDonutDatum,
} from "@/components/dashboard/DistributionDonutChart";
import { cn } from "@/lib/utils";

const CompositionPanel = ({
  data,
  total,
}: {
  data: DistributionDonutDatum[];
  total: number;
}) => {
  const visible = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  if (visible.length === 0) {
    return (
      <div className="grid h-48 place-items-center text-sm text-slate-400 dark:text-slate-500">
        Sin datos
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <div className="mx-auto h-44 w-44">
        <DistributionDonutChart
          data={visible}
          total={total}
          centerLabel="Hato"
          totalSuffix="cab."
          showLegend={false}
          sizeClassName="max-w-[11rem]"
        />
      </div>

      <div className="space-y-1.5">
        {visible.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{item.name}</span>
              <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-100">{item.value}</span>
              <span className="w-8 text-right tabular-nums text-slate-400 dark:text-slate-500">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const HerdCompositionCard = ({
  categoryData,
  sexData,
}: {
  categoryData: DistributionDonutDatum[];
  sexData: DistributionDonutDatum[];
}) => {
  const [tab, setTab] = useState<"category" | "sex">("category");
  const categoryTotal = categoryData.reduce((s, d) => s + d.value, 0);
  const sexTotal = sexData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="dash-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
        <h3 className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
          Composicion del hato
        </h3>
        {/* Inline pill tabs */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {(["category", "sex"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
                tab === t
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {t === "category" ? "Categoria" : "Sexo"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        {tab === "category" ? (
          <CompositionPanel data={categoryData} total={categoryTotal} />
        ) : (
          <CompositionPanel data={sexData} total={sexTotal} />
        )}
      </div>
    </div>
  );
};