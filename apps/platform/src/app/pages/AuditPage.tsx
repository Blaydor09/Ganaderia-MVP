import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const AuditPage = () => {
  const [tenantId, setTenantId] = useState("");
  const [action, setAction] = useState("");
  const [actorType, setActorType] = useState("");

  const params = useMemo(
    () => ({
      page: 1,
      pageSize: 100,
      tenantId: tenantId.trim() || undefined,
      action: action.trim() || undefined,
      actorType: actorType || undefined,
    }),
    [tenantId, action, actorType]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform-audit", params],
    queryFn: async () => (await api.get("/audit", { params })).data,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-white">Auditoria global</h1>
        <p className="text-sm text-infra-100/80">
          Trazabilidad de login, cambio de plan, suspension y operaciones de soporte.
        </p>
      </div>

      <div className="platform-panel grid gap-3 p-4 md:grid-cols-3">
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Filtrar por tenantId"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        />
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Filtrar por accion"
          value={action}
          onChange={(event) => setAction(event.target.value)}
        />
        <select
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          value={actorType}
          onChange={(event) => setActorType(event.target.value)}
        >
          <option value="">Todos los actores</option>
          <option value="platform">platform</option>
          <option value="tenant">tenant</option>
          <option value="system">system</option>
        </select>
      </div>

      <div className="platform-panel p-4">
        {isLoading ? <p className="text-sm text-infra-100/80">Cargando logs...</p> : null}
        {isError ? <p className="text-sm text-red-200">No se pudieron cargar los logs.</p> : null}
        {!isLoading && !isError ? (
          <div className="space-y-2">
            {(data?.items ?? []).map((row: any) => (
              <div key={row.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{row.action}</p>
                  <span className="text-xs text-infra-100/70">
                    {new Date(row.occurredAt ?? row.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-infra-100/70">
                  actor={row.actorType} | tenant={row.tenantId ?? "n/a"} | recurso=
                  {row.resource ?? row.entity}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AuditPage;
