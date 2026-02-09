import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const DashboardPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform-dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });

  if (isLoading) {
    return <div className="text-sm text-infra-100/80">Cargando dashboard SaaS...</div>;
  }
  if (isError || !data) {
    return (
      <div className="platform-panel p-5 text-sm text-red-200">
        No se pudo cargar el dashboard de plataforma.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-white">Dashboard SaaS</h1>
        <p className="text-sm text-infra-100/80">
          Vista global de tenants, actividad y salud operativa de la plataforma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="platform-panel p-4">
          <p className="text-xs uppercase tracking-wide text-infra-100/70">Tenants activos</p>
          <p className="mt-2 font-display text-3xl text-white">{data.kpis.activeTenants}</p>
        </div>
        <div className="platform-panel p-4">
          <p className="text-xs uppercase tracking-wide text-infra-100/70">Tenants suspendidos</p>
          <p className="mt-2 font-display text-3xl text-white">{data.kpis.suspendedTenants}</p>
        </div>
        <div className="platform-panel p-4">
          <p className="text-xs uppercase tracking-wide text-infra-100/70">Usuarios activos</p>
          <p className="mt-2 font-display text-3xl text-white">{data.kpis.totalUsers}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="platform-panel p-4">
          <h2 className="font-display text-lg text-white">Top tenants por animales</h2>
          <div className="mt-3 space-y-2">
            {(data.topTenantsByAnimals ?? []).map((row: any) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-white">{row.name}</p>
                  <p className="text-xs text-infra-100/70">Estado: {row.status}</p>
                </div>
                <div className="text-right text-infra-100/85">
                  <p>{row.animals} animales</p>
                  <p className="text-xs">{row.users} usuarios</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="platform-panel p-4">
          <h2 className="font-display text-lg text-white">Actividad reciente</h2>
          <div className="mt-3 space-y-2">
            {(data.recentAudit ?? []).map((row: any) => (
              <div key={row.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <p className="font-semibold text-white">{row.action}</p>
                <p className="text-xs text-infra-100/70">
                  {row.resource ?? row.entity} | {new Date(row.occurredAt ?? row.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
