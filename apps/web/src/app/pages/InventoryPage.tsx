import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const InventoryPage = () => {
  const { data: batches } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => (await api.get("/inventory")).data,
  });

  const { data: alerts } = useQuery({
    queryKey: ["inventory", "alerts"],
    queryFn: async () => (await api.get("/inventory/alerts")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" subtitle="Stock por producto y lote" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Vencimientos proximos</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>7 dias: {alerts?.expiring7?.length ?? 0}</span>
              <span>15 dias: {alerts?.expiring15?.length ?? 0}</span>
              <span>30 dias: {alerts?.expiring?.length ?? 0}</span>
            </div>
            {(alerts?.expiring ?? []).map((batch: any) => (
              <div key={batch.id} className="flex items-center justify-between">
                <span>{batch.product?.name}</span>
                <span className="text-xs text-slate-400">
                  {new Date(batch.expiresAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(alerts?.expiring ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin vencimientos cercanos.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Stock minimo</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(alerts?.lowStock ?? []).map((row: any) => (
              <div key={row.product.id} className="flex items-center justify-between">
                <span>{row.product.name}</span>
                <span className="text-xs text-slate-400">{row.total}</span>
              </div>
            ))}
            {(alerts?.lowStock ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin productos en minimo.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
        <Table>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH>Lote</TH>
              <TH>Vencimiento</TH>
              <TH>Disponible</TH>
            </TR>
          </THead>
          <TBody>
            {(batches ?? []).map((batch: any) => (
              <TR key={batch.id}>
                <TD>{batch.product?.name}</TD>
                <TD>{batch.batchNumber}</TD>
                <TD>{new Date(batch.expiresAt).toLocaleDateString()}</TD>
                <TD>{batch.quantityAvailable}</TD>
              </TR>
            ))}
            {(batches ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500 dark:text-slate-400">
                  Sin stock registrado.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default InventoryPage;
