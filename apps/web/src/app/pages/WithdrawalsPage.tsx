import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const WithdrawalsPage = () => {
  const { data } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => (await api.get("/reports/withdrawals-active")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retiros activos"
        subtitle="Animales bloqueados por retiro de carne o leche"
      />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Arete</TH>
              <TH>Productos</TH>
              <TH>Retiro carne</TH>
              <TH>Retiro leche</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((row: any) => (
              <TR key={row.animal.id}>
                <TD>{row.animal.tag || "Sin arete"}</TD>
                <TD>{row.products.join(", ")}</TD>
                <TD>{new Date(row.meatUntil).toLocaleDateString()}</TD>
                <TD>{new Date(row.milkUntil).toLocaleDateString()}</TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500">
                  Sin retiros activos.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default WithdrawalsPage;
