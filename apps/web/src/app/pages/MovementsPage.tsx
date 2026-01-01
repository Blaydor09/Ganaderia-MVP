import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const MovementsPage = () => {
  const { data } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => (await api.get("/movements?page=1&pageSize=50")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Movimientos" subtitle="Trazabilidad interna y externa" />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Animal</TH>
              <TH>Tipo</TH>
              <TH>Fecha</TH>
              <TH>Transportista</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((move: any) => (
              <TR key={move.id}>
                <TD>{move.animalId}</TD>
                <TD>{move.movementType}</TD>
                <TD>{new Date(move.occurredAt).toLocaleDateString()}</TD>
                <TD>{move.transporter ?? "-"}</TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500">
                  Sin movimientos registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default MovementsPage;
