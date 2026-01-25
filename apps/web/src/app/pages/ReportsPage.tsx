import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ReportsPage = () => {
  const { data: consumption } = useQuery({
    queryKey: ["reports", "consumption"],
    queryFn: async () => (await api.get("/reports/consumption")).data,
  });
  const { data: withdrawals } = useQuery({
    queryKey: ["reports", "withdrawals"],
    queryFn: async () => (await api.get("/reports/withdrawals-active")).data,
  });

  const withdrawalsItems = withdrawals?.items ?? [];
  const withdrawalsPreview = withdrawalsItems.slice(0, 5);
  const withdrawalsRemaining = Math.max(withdrawalsItems.length - withdrawalsPreview.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" subtitle="Consumo, retiros e inventario" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Consumo de medicamentos</p>
            <h3 className="font-display text-lg font-semibold">Top productos</h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(consumption?.items ?? []).map((row: any) => (
              <div key={row.product?.id} className="flex items-center justify-between">
                <span>{row.product?.name}</span>
                <span className="text-xs text-slate-400">{row.total}</span>
              </div>
            ))}
            {(consumption?.items ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos de consumo.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pesajes</p>
            <h3 className="font-display text-lg font-semibold">Evolucion por animal</h3>
          </CardHeader>
          <CardContent className="text-sm text-slate-500 dark:text-slate-400">
            Usa el filtro por animal en el reporte de pesajes.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Retiros activos</p>
            <h3 className="font-display text-lg font-semibold">
              Animales bloqueados ({withdrawals?.total ?? 0})
            </h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {withdrawalsPreview.map((row: any) => (
              <div key={row.animal.id} className="flex items-center justify-between">
                <span>{row.animal.tag || "Sin arete"}</span>
                <span className="text-xs text-slate-400">
                  Carne: {new Date(row.meatUntil).toLocaleDateString()} · Leche:{" "}
                  {new Date(row.milkUntil).toLocaleDateString()}
                </span>
              </div>
            ))}
            {withdrawalsRemaining > 0 ? (
              <p className="text-xs text-slate-400">Y {withdrawalsRemaining} mas...</p>
            ) : null}
            {withdrawalsItems.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sin retiros activos.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
