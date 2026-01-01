import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const EstablishmentsPage = () => {
  const { data } = useQuery({
    queryKey: ["establishments"],
    queryFn: async () => (await api.get("/establishments")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Establecimientos" subtitle="Fincas, potreros y corrales" />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Tipo</TH>
              <TH>Direccion</TH>
            </TR>
          </THead>
          <TBody>
            {(data ?? []).map((est: any) => (
              <TR key={est.id}>
                <TD>{est.name}</TD>
                <TD>{est.type}</TD>
                <TD>{est.address ?? "-"}</TD>
              </TR>
            ))}
            {(data ?? []).length === 0 ? (
              <TR>
                <TD colSpan={3} className="text-sm text-slate-500">
                  Sin establecimientos registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default EstablishmentsPage;
