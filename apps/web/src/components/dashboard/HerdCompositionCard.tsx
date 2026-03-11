import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DistributionDonutChart,
  type DistributionDonutDatum,
} from "@/components/dashboard/DistributionDonutChart";

const CompositionPanel = ({
  data,
  total,
  singular,
}: {
  data: DistributionDonutDatum[];
  total: number;
  singular: string;
}) => {
  const visibleData = [...data].filter((item) => item.value > 0).sort((left, right) => right.value - left.value);

  if (visibleData.length === 0) {
    return (
      <div className="grid h-72 place-items-center text-sm text-slate-500 dark:text-slate-400">
        Sin datos para graficar
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
      <div className="h-80">
        <DistributionDonutChart
          data={visibleData}
          total={total}
          centerLabel="Hato"
          totalSuffix="animales"
          showLegend={false}
          sizeClassName="max-w-[17rem]"
        />
      </div>

      <div className="space-y-3">
        {visibleData.map((item) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div
              key={`composition-${singular}-${item.name}`}
              className="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <p className="font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{percentage}%</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${Math.max(8, percentage)}%`, backgroundColor: item.color }}
                />
              </div>
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
  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0);
  const sexTotal = sexData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 dark:border-slate-800 dark:from-slate-950/95 dark:to-slate-900/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Composicion del hato
            </p>
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">
                Distribucion animal en una sola lectura
              </h2>
              <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Cambia entre categoria y sexo para comparar el peso de cada grupo dentro del inventario activo.
              </p>
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            Total visible: {Math.max(categoryTotal, sexTotal)} animales
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="category">
          <TabsList>
            <TabsTrigger value="category">Por categoria</TabsTrigger>
            <TabsTrigger value="sex">Por sexo</TabsTrigger>
          </TabsList>

          <TabsContent value="category">
            <CompositionPanel data={categoryData} total={categoryTotal} singular="categoria" />
          </TabsContent>

          <TabsContent value="sex">
            <CompositionPanel data={sexData} total={sexTotal} singular="sexo" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};