import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const AuditPage = () => {
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => (await api.get("/audit?page=1&pageSize=50")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" subtitle="Cambios criticos y trazabilidad" />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Accion</TH>
              <TH>Entidad</TH>
              <TH>Fecha</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((log: any) => (
              <TR key={log.id}>
                <TD>{log.action}</TD>
                <TD>{log.entity}</TD>
                <TD>{new Date(log.createdAt).toLocaleString()}</TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={3} className="text-sm text-slate-500">
                  Sin registros de auditoria.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default AuditPage;
