import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

const AlertsPage = () => {
  const { data } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => (await api.get("/alerts")).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas"
        subtitle="Calendario de vacunas y recordatorios"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {(data ?? []).map((alert: any) => (
          <Card key={alert.id}>
            <CardContent className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{alert.type}</p>
              <h3 className="font-display text-lg font-semibold">{alert.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{alert.message}</p>
              <p className="text-xs text-slate-400">
                {new Date(alert.dueAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
        {(data ?? []).length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-500 dark:text-slate-400">
              Sin alertas programadas.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default AlertsPage;
