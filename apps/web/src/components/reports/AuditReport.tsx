import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExportButton } from "./ExportButton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export function AuditReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "audit"],
    queryFn: async () => (await api.get("/reports/audit")).data,
    retry: false, // If 403, don't retry
  });

  if (isLoading) return <div className="p-4 text-sm text-slate-500">Cargando...</div>;

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500">
        No tienes permisos suficientes para ver el reporte de auditoría. Requerido: ADMIN o AUDITOR.
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-display">Auditoría del Sistema</h2>
          <p className="text-sm text-slate-500">Total registros (últimos 1000): {data?.total}</p>
        </div>
        <ExportButton endpoint="/reports/audit" filename="auditoria.csv" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Fecha y Hora</TH>
                <TH>Usuario</TH>
                <TH>Acción</TH>
                <TH>Entidad</TH>
              </TR>
            </THead>
            <TBody>
              {items.length > 0 ? (
                items.map((log: any) => (
                  <TR key={log.id}>
                    <TD className="text-xs text-slate-500">
                      {new Date(log.occurredAt).toLocaleString()}
                    </TD>
                    <TD>{log.user?.name || log.actorUserId}</TD>
                    <TD>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                        {log.action}
                      </span>
                    </TD>
                    <TD>{log.entity}</TD>
                  </TR>
                ))
              ) : (
                <TR>
                  <TD colSpan={4} className="h-24 text-center text-sm text-slate-500">
                    No hay registros de auditoría.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
