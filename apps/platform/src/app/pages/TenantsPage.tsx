import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import type { PlatformTenantListResponse } from "@/lib/types";

const TenantsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    planCode: "FREE",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["platform-tenants", search],
    queryFn: async () =>
      (
        await api.get("/tenants", {
          params: {
            page: 1,
            pageSize: 50,
            search: search.trim() || undefined,
          },
        })
      ).data as PlatformTenantListResponse,
  });

  const createTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post("/tenants", {
        ...createForm,
        name: createForm.name.trim(),
        slug: createForm.slug.trim() || undefined,
        ownerName: createForm.ownerName.trim(),
        ownerEmail: createForm.ownerEmail.trim(),
      });
      toast.success("Tenant creado");
      setCreateForm({
        name: "",
        slug: "",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
        planCode: "FREE",
      });
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo crear el tenant");
    }
  };

  const updateTenantStatus = async (tenantId: string, status: "ACTIVE" | "SUSPENDED") => {
    try {
      if (status === "ACTIVE") {
        await api.post(`/tenants/${tenantId}/reactivate`, {});
      } else {
        await api.post(`/tenants/${tenantId}/suspend`, { reason: "Suspension operativa manual" });
      }
      toast.success(status === "ACTIVE" ? "Tenant reactivado" : "Tenant suspendido");
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No fue posible cambiar estado");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-white">Tenants</h1>
        <p className="text-sm text-infra-100/80">Alta, estado y detalle operativo de clientes SaaS.</p>
      </div>

      <form onSubmit={createTenant} className="platform-panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Nombre tenant"
          value={createForm.name}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Slug (opcional)"
          value={createForm.slug}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, slug: event.target.value }))}
        />
        <select
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          value={createForm.planCode}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, planCode: event.target.value }))}
        >
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
        </select>
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Nombre owner"
          value={createForm.ownerName}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, ownerName: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Email owner"
          value={createForm.ownerEmail}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, ownerEmail: event.target.value }))}
        />
        <input
          type="password"
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Clave owner"
          value={createForm.ownerPassword}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, ownerPassword: event.target.value }))
          }
        />
        <div className="md:col-span-2 xl:col-span-3">
          <button
            type="submit"
            className="rounded-xl bg-infra-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-infra-300"
          >
            Crear tenant + owner
          </button>
        </div>
      </form>

      <div className="platform-panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white md:max-w-sm"
            placeholder="Buscar tenant"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {isLoading ? (
          <p className="text-sm text-infra-100/80">Cargando tenants...</p>
        ) : (
          <div className="space-y-2">
            {(data?.items ?? []).map((tenant) => (
              <div
                key={tenant.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-white">{tenant.name}</p>
                  <p className="text-xs text-infra-100/70">
                    {tenant.plan?.code ?? "N/A"} | usuarios: {tenant.usage.users} | animales:{" "}
                    {tenant.usage.animals}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      tenant.status === "ACTIVE"
                        ? "bg-emerald-400/20 text-emerald-200"
                        : "bg-amber-400/20 text-amber-200"
                    }`}
                  >
                    {tenant.status}
                  </span>
                  <Link
                    to={`/tenants/${tenant.id}`}
                    className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white hover:bg-white/10"
                  >
                    Ver detalle
                  </Link>
                  {tenant.status === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => updateTenantStatus(tenant.id, "SUSPENDED")}
                      className="rounded-lg border border-amber-300/40 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-400/10"
                    >
                      Suspender
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateTenantStatus(tenant.id, "ACTIVE")}
                      className="rounded-lg border border-emerald-300/40 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-400/10"
                    >
                      Reactivar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantsPage;
