import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const BatchesPage = () => {
  const canCreate = hasAnyRole(Access.batchesCreate);
  const { data } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => (await api.get("/batches?page=1&pageSize=50")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lotes"
        subtitle="Control por batch y vencimientos"
        actions={canCreate ? <Button>Agregar lote</Button> : undefined}
      />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH>Lote</TH>
              <TH>Vencimiento</TH>
              <TH>Stock</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((batch: any) => (
              <TR key={batch.id}>
                <TD>{batch.product?.name}</TD>
                <TD>{batch.batchNumber}</TD>
                <TD>{new Date(batch.expiresAt).toLocaleDateString()}</TD>
                <TD>{batch.quantityAvailable}</TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500">
                  Sin lotes registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default BatchesPage;
