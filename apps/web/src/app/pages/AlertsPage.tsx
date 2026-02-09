import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateOnlyUtc } from "@/lib/dates";
import type { AlertRow } from "@/lib/types";

const AlertsPage = () => {
  const { data } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => (await api.get("/alerts")).data as AlertRow[],
  });

  const alerts = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Alertas" subtitle="Calendario operativo y recordatorios sanitarios" />

      {alerts.length === 0 ? (
        <EmptyState
          title="Sin alertas programadas"
          description="Cuando se generen alertas de vencimiento o retiros apareceran aqui."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {alert.type}
                </p>
                <h3 className="font-display text-lg font-semibold">{alert.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{alert.message}</p>
                {alert.dueAt ? (
                  <p className="text-xs text-slate-400">{formatDateOnlyUtc(alert.dueAt)}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
