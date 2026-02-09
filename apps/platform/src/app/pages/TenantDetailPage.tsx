import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";

const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [planCode, setPlanCode] = useState("FREE");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform-tenant-detail", id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get(`/tenants/${id}`)).data,
  });

  const changePlan = async () => {
    if (!id) return;
    try {
      await api.post(`/tenants/${id}/plan`, { planCode });
      toast.success("Plan actualizado");
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-detail", id] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo actualizar el plan");
    }
  };

  if (isLoading) return <p className="text-sm text-infra-100/80">Cargando tenant...</p>;
  if (isError || !data) {
    return <div className="platform-panel p-5 text-sm text-red-200">No se pudo cargar el tenant.</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-white">{data.tenant.name}</h1>
        <p className="text-sm text-infra-100/80">
          Estado: {data.tenant.status} | Plan actual: {data.usage.subscription.plan.code}
        </p>
      </div>

      <div className="platform-panel p-4">
        <h2 className="font-display text-lg text-white">Plan y limites</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={planCode}
            onChange={(event) => setPlanCode(event.target.value)}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
          <button
            type="button"
            onClick={changePlan}
            className="rounded-xl bg-infra-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Cambiar plan
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(data.usage.metrics ?? []).map((metric: any) => {
            const hard = metric.hardLimit;
            const ratio = hard ? Math.min(100, (metric.current / hard) * 100) : 0;
            return (
              <div key={metric.metric} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-sm font-semibold text-white">{metric.name}</p>
                <p className="text-xs text-infra-100/70">
                  {metric.current} {metric.unit}
                  {hard ? ` / ${hard} ${metric.unit}` : " / sin limite"}
                </p>
                {hard ? (
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className={`h-2 rounded-full ${
                        metric.exceeded ? "bg-red-400" : ratio > 80 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.max(2, ratio)}%` }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="platform-panel p-4">
        <h2 className="font-display text-lg text-white">Actividad reciente</h2>
        <div className="mt-3 space-y-2">
          {(data.recentActivity ?? []).map((row: any) => (
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
  );
};

export default TenantDetailPage;
