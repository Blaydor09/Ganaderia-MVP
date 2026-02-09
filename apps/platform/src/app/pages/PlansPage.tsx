import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { PlatformPlan } from "@/lib/types";

const PlansPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: async () => (await api.get("/plans")).data as PlatformPlan[],
  });

  if (isLoading) return <p className="text-sm text-infra-100/80">Cargando planes...</p>;
  if (isError || !data) {
    return <div className="platform-panel p-5 text-sm text-red-200">No se pudieron cargar los planes.</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-white">Planes y limites</h1>
        <p className="text-sm text-infra-100/80">Catalogo de planes SaaS y limites de consumo.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {data.map((plan) => (
          <div key={plan.id} className="platform-panel p-4">
            <h2 className="font-display text-xl text-white">{plan.name}</h2>
            <p className="text-xs uppercase tracking-wide text-infra-100/70">{plan.code}</p>
            <p className="mt-2 text-sm text-infra-100/80">{plan.description ?? "Sin descripcion"}</p>
            <div className="mt-4 space-y-2">
              {plan.limits.map((limit) => (
                <div key={limit.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <p className="font-semibold text-white">{limit.metricName}</p>
                  <p className="text-xs text-infra-100/70">
                    Soft: {limit.softLimit ?? "N/A"} | Hard: {limit.hardLimit ?? "N/A"} {limit.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlansPage;
