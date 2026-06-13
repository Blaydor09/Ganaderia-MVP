import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Building2,
  User,
  Sliders,
  Activity,
  ArrowLeft,
  Edit2,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Calendar,
  Clock,
  Layers
} from "lucide-react";

const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  const [planCode, setPlanCode] = useState("FREE");
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isSuspending, setIsSuspending] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["platform-tenant-detail", id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get(`/tenants/${id}`)).data,
  });

  // Sync plan code and editing fields once data loads
  useEffect(() => {
    if (data) {
      if (data.usage?.subscription?.plan?.code) {
        setPlanCode(data.usage.subscription.plan.code);
      }
      setEditName(data.tenant.name || "");
      setEditSlug(data.tenant.slug || "");
    }
  }, [data]);

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!editName.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    setIsSavingGeneral(true);
    try {
      await api.patch(`/tenants/${id}`, {
        name: editName.trim(),
        slug: editSlug.trim() || null,
      });
      toast.success("Información general actualizada");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-detail", id] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al actualizar información");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const changePlan = async () => {
    if (!id) return;
    setIsUpdatingPlan(true);
    try {
      await api.post(`/tenants/${id}/plan`, { planCode });
      toast.success("Plan actualizado");
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-detail", id] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo actualizar el plan");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSuspending(true);
    try {
      await api.post(`/tenants/${id}/suspend`, { reason: suspensionReason.trim() });
      toast.success("Tenant suspendido correctamente");
      setShowSuspendModal(false);
      setSuspensionReason("");
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-detail", id] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo suspender el tenant");
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivate = async () => {
    if (!id) return;
    if (!window.confirm("¿Está seguro de que desea reactivar este tenant?")) return;
    setIsReactivating(true);
    try {
      await api.post(`/tenants/${id}/reactivate`, {});
      toast.success("Tenant reactivado correctamente");
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-detail", id] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo reactivar el tenant");
    } finally {
      setIsReactivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-infra-200">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Cargando tenant...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="platform-panel p-6 text-center text-sm text-red-200">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-red-400" />
        <p>No se pudo cargar el tenant o el identificador es inválido.</p>
        <Link to="/tenants" className="mt-4 inline-flex items-center gap-2 text-infra-300 hover:text-white underline text-xs">
          <ArrowLeft className="h-3 w-3" /> Volver a Tenants
        </Link>
      </div>
    );
  }

  const { tenant, usage, recentActivity } = data;
  const isSuspended = tenant.status === "SUSPENDED";

  return (
    <div className="space-y-6">
      {/* Volver y Título */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/tenants"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-infra-200 transition hover:bg-white/10 hover:text-white"
            title="Volver a la lista"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold text-white">{tenant.name}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
                  isSuspended
                    ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {tenant.status}
              </span>
            </div>
            <p className="text-xs text-infra-100/60 mt-1">
              ID: {tenant.id} | Creado: {new Date(tenant.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Botones de Acción Operativa */}
        <div className="flex items-center gap-2">
          {isSuspended ? (
            <button
              type="button"
              disabled={isReactivating}
              onClick={handleReactivate}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isReactivating ? "animate-spin" : ""}`} />
              Reactivar Tenant
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSuspendModal(true)}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
            >
              <ShieldAlert className="h-4 w-4" />
              Suspender Tenant
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Suspensión */}
      {isSuspended && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Este tenant se encuentra suspendido de forma manual</p>
            {tenant.suspensionReason && (
              <p className="mt-1 text-red-300/90">
                <span className="font-medium text-red-200">Razón:</span> {tenant.suspensionReason}
              </p>
            )}
            {tenant.suspendedAt && (
              <p className="mt-0.5 text-xs text-red-400">
                Fecha de suspensión: {new Date(tenant.suspendedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Grilla Principal */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna Izquierda - Info General y Plan */}
        <div className="space-y-6 lg:col-span-7">
          
          {/* Información General */}
          <div className="platform-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-5 w-5 text-infra-300" />
                <h2 className="font-display text-lg font-bold text-white">Información General</h2>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-infra-100 transition hover:bg-white/15 hover:text-white"
                >
                  <Edit2 className="h-3 w-3" />
                  Editar
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateGeneral} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-infra-100/70 mb-1.5">
                    Nombre del Tenant
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-infra-400 focus:outline-none focus:ring-1 focus:ring-infra-400"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-infra-100/70 mb-1.5">
                    Slug del Tenant
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-infra-400 focus:outline-none focus:ring-1 focus:ring-infra-400"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-infra-100/50">
                    Define la URL de acceso del cliente. Ej: mi-establecimiento
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingGeneral}
                    className="flex items-center gap-1.5 rounded-xl bg-infra-400 px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-infra-300 disabled:opacity-50"
                  >
                    {isSavingGeneral ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(tenant.name || "");
                      setEditSlug(tenant.slug || "");
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-infra-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-infra-100/50">Nombre</p>
                  <p className="mt-1 text-sm font-medium text-white">{tenant.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-infra-100/50">Slug / Ruta</p>
                  <p className="mt-1 text-sm font-medium text-white">{tenant.slug || "No asignado"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-infra-100/50">Fecha Creación</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {new Date(tenant.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-infra-100/50">Última Modificación</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {new Date(tenant.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Información del Propietario (Owner) */}
          <div className="platform-panel p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <User className="h-5 w-5 text-infra-300" />
              <h2 className="font-display text-lg font-bold text-white">Propietario de la Cuenta</h2>
            </div>
            {tenant.owner ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{tenant.owner.name}</p>
                  <p className="text-xs text-infra-100/70 mt-0.5">{tenant.owner.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      tenant.owner.isActive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {tenant.owner.isActive ? "Propietario Activo" : "Propietario Inactivo"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 p-4 text-sm text-infra-100/75">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p>No hay un propietario asignado a esta cuenta actualmente.</p>
              </div>
            )}
          </div>

          {/* Plan y Límites */}
          <div className="platform-panel p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <Sliders className="h-5 w-5 text-infra-300" />
              <h2 className="font-display text-lg font-bold text-white">Plan y Suscripción</h2>
            </div>

            <p className="text-sm text-infra-100/80 mb-3">
              Modifica la asignación del plan de suscripción actual. Este cambio impacta los límites del tenant de inmediato.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <select
                disabled={isUpdatingPlan}
                value={planCode}
                onChange={(event) => setPlanCode(event.target.value)}
                className="rounded-xl border border-white/20 bg-[#0f2247] px-3.5 py-2.5 text-sm text-white focus:border-infra-400 focus:outline-none"
              >
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
              <button
                type="button"
                disabled={isUpdatingPlan}
                onClick={changePlan}
                className="flex items-center gap-1.5 rounded-xl bg-infra-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-infra-300 disabled:opacity-50"
              >
                {isUpdatingPlan && <RefreshCw className="h-4 w-4 animate-spin" />}
                Actualizar Plan
              </button>
            </div>

            {/* Historial de suscripciones recientes */}
            {tenant.subscriptions && tenant.subscriptions.length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-infra-100/60 mb-3 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Historial de Planes Recientes
                </p>
                <div className="space-y-2">
                  {tenant.subscriptions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{sub.plan.name}</span>
                        <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          sub.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-infra-100/50"
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-infra-100/60 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(sub.startsAt).toLocaleDateString()}
                        {sub.endsAt ? ` - ${new Date(sub.endsAt).toLocaleDateString()}` : " (actual)"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha - Consumo y Actividad */}
        <div className="space-y-6 lg:col-span-5">
          
          {/* Métricas y Consumo */}
          <div className="platform-panel p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <Sliders className="h-5 w-5 text-infra-300" />
              <h2 className="font-display text-lg font-bold text-white">Consumo y Límites</h2>
            </div>
            <div className="space-y-4">
              {(usage?.metrics ?? []).length > 0 ? (
                (usage.metrics).map((metric: any) => {
                  const hard = metric.hardLimit;
                  const ratio = hard ? Math.min(100, (metric.current / hard) * 100) : 0;
                  return (
                    <div key={metric.metric} className="rounded-xl border border-white/5 bg-white/5 p-3.5">
                      <div className="flex items-center justify-between text-sm">
                        <p className="font-bold text-white">{metric.name}</p>
                        <p className="text-xs text-infra-100/80">
                          {metric.current} {metric.unit}
                          {hard ? ` / ${hard} ${metric.unit}` : " / sin límite"}
                        </p>
                      </div>
                      {hard ? (
                        <div className="mt-2.5">
                          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                metric.exceeded ? "bg-red-400" : ratio > 80 ? "bg-amber-400" : "bg-emerald-400"
                              }`}
                              style={{ width: `${Math.max(2, ratio)}%` }}
                            />
                          </div>
                          {ratio > 80 && (
                            <p className="mt-1.5 text-[11px] text-right text-amber-300 font-semibold">
                              Consumo cercano al límite ({Math.round(ratio)}%)
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-infra-100/50 text-center py-4">No hay métricas de consumo disponibles.</p>
              )}
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="platform-panel p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-infra-300" />
              <h2 className="font-display text-lg font-bold text-white">Actividad Reciente</h2>
            </div>
            <div className="relative border-l border-white/10 pl-4 ml-1 space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {(recentActivity ?? []).length > 0 ? (
                (recentActivity).map((row: any) => (
                  <div key={row.id} className="relative text-xs">
                    {/* Marcador de tiempo en la línea de tiempo */}
                    <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-infra-400 border border-slate-950" />
                    <div>
                      <span className="font-bold text-white uppercase">{row.action}</span>
                      <span className="text-infra-100/70"> en {row.resource ?? row.entity}</span>
                    </div>
                    {row.metadata && typeof row.metadata === 'object' && (
                      <p className="mt-1 text-[11px] text-infra-100/50 italic bg-white/5 rounded p-1">
                        {JSON.stringify(row.metadata)}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-infra-100/50 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(row.occurredAt ?? row.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-infra-100/50 text-center py-4">No se ha registrado actividad reciente.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal para Suspensión */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#102444] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-display text-lg font-bold text-white">Suspender Tenant</h3>
            </div>
            <p className="mt-2 text-sm text-infra-100/80">
              Esta acción bloqueará temporalmente el acceso de todos los usuarios de este tenant al sistema.
            </p>

            <form onSubmit={handleSuspend} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-infra-100/70 mb-1.5">
                  Motivo de la suspensión *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                  placeholder="Ej: Impago de suscripción, violación de términos de uso, etc."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspensionReason("");
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-infra-200 transition hover:bg-white/10 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSuspending}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
                >
                  {isSuspending && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Confirmar Suspensión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDetailPage;
