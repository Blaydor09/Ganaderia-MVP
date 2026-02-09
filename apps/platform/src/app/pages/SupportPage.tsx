import { FormEvent, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

const SupportPage = () => {
  const [resetForm, setResetForm] = useState({
    tenantId: "",
    userId: "",
    temporaryPassword: "",
  });
  const [impersonationForm, setImpersonationForm] = useState({
    tenantId: "",
    targetUserId: "",
    reason: "",
    expiresInMinutes: 30,
  });
  const [impersonationSessionId, setImpersonationSessionId] = useState("");

  const onResetAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post("/support/reset-access", resetForm);
      toast.success("Reset de acceso ejecutado");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No fue posible resetear acceso");
    }
  };

  const onStartImpersonation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await api.post("/support/impersonations", {
        tenantId: impersonationForm.tenantId,
        targetUserId: impersonationForm.targetUserId || undefined,
        reason: impersonationForm.reason,
        expiresInMinutes: Number(impersonationForm.expiresInMinutes),
      });
      setImpersonationSessionId(response.data.sessionId);
      toast.success("Impersonacion iniciada y auditada");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No fue posible iniciar impersonacion");
    }
  };

  const onRevokeImpersonation = async () => {
    if (!impersonationSessionId) return;
    try {
      await api.post(`/support/impersonations/${impersonationSessionId}/revoke`, {
        reason: "Revoke manual desde consola de soporte",
      });
      toast.success("Impersonacion revocada");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No fue posible revocar");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-white">Soporte</h1>
        <p className="text-sm text-infra-100/80">
          Herramientas operativas: reset de acceso e impersonacion temporal auditada.
        </p>
      </div>

      <form onSubmit={onResetAccess} className="platform-panel grid gap-3 p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-display text-lg text-white">Reset seguro de acceso</h2>
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="tenantId"
          value={resetForm.tenantId}
          onChange={(event) => setResetForm((prev) => ({ ...prev, tenantId: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="userId"
          value={resetForm.userId}
          onChange={(event) => setResetForm((prev) => ({ ...prev, userId: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white md:col-span-2"
          placeholder="temporaryPassword"
          value={resetForm.temporaryPassword}
          onChange={(event) =>
            setResetForm((prev) => ({ ...prev, temporaryPassword: event.target.value }))
          }
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-infra-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Ejecutar reset
          </button>
        </div>
      </form>

      <form onSubmit={onStartImpersonation} className="platform-panel grid gap-3 p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 font-display text-lg text-white">Impersonacion temporal</h2>
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="tenantId"
          value={impersonationForm.tenantId}
          onChange={(event) =>
            setImpersonationForm((prev) => ({ ...prev, tenantId: event.target.value }))
          }
        />
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="targetUserId (opcional)"
          value={impersonationForm.targetUserId}
          onChange={(event) =>
            setImpersonationForm((prev) => ({ ...prev, targetUserId: event.target.value }))
          }
        />
        <input
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white md:col-span-2"
          placeholder="Motivo"
          value={impersonationForm.reason}
          onChange={(event) => setImpersonationForm((prev) => ({ ...prev, reason: event.target.value }))}
        />
        <input
          type="number"
          min={5}
          max={120}
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Expira en minutos"
          value={impersonationForm.expiresInMinutes}
          onChange={(event) =>
            setImpersonationForm((prev) => ({
              ...prev,
              expiresInMinutes: Number(event.target.value),
            }))
          }
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-xl bg-infra-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Iniciar impersonacion
          </button>
          <button
            type="button"
            onClick={onRevokeImpersonation}
            className="rounded-xl border border-red-300/40 px-4 py-2 text-sm text-red-200"
          >
            Revocar
          </button>
        </div>
        {impersonationSessionId ? (
          <p className="md:col-span-2 text-xs text-infra-100/70">
            Session activa: {impersonationSessionId}
          </p>
        ) : null}
      </form>
    </div>
  );
};

export default SupportPage;
