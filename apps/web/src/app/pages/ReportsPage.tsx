import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ReportsPage = () => {
  const { data: consumption } = useQuery({
    queryKey: ["reports", "consumption"],
    queryFn: async () => (await api.get("/reports/consumption")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" subtitle="Consumo, retiros e inventario" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Consumo de medicamentos</p>
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
              <p className="text-sm text-slate-500">Sin datos de consumo.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Pesajes</p>
            <h3 className="font-display text-lg font-semibold">Evolucion por animal</h3>
          </CardHeader>
          <CardContent className="text-sm text-slate-500">
            Usa el filtro por animal en el reporte de pesajes.
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
