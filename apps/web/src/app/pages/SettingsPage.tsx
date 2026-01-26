import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { getTenantId, setTokens } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tenantName, setTenantName] = useState("");
  const { data } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => (await api.get("/tenants")).data,
  });

  const activeTenantId = data?.activeTenantId ?? getTenantId();
  const tenants = data?.items ?? [];

  const handleCreateTenant = async () => {
    const name = tenantName.trim();
    if (!name) {
      toast.error("Nombre de cuenta requerido");
      return;
    }

    try {
      const response = await api.post("/tenants", { name });
      setTokens(response.data.accessToken, response.data.refreshToken);
      toast.success("Cuenta creada");
      setTenantName("");
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo crear la cuenta");
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    try {
      const response = await api.post("/auth/switch-tenant", { tenantId });
      setTokens(response.data.accessToken, response.data.refreshToken);
      toast.success("Cuenta activa actualizada");
      queryClient.invalidateQueries();
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo cambiar la cuenta");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" subtitle="Configuracion general del sistema" />

      <Card>
        <CardHeader>
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Cuentas
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crea nuevas cuentas y cambia la cuenta activa.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Nombre de la cuenta
              </label>
              <Input
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                placeholder="Ej: Finca Los Sauces"
              />
            </div>
            <Button onClick={handleCreateTenant}>Crear cuenta</Button>
          </div>

          <div className="space-y-3">
            {tenants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                Aun no hay cuentas registradas.
              </div>
            ) : (
              tenants.map((tenant: { id: string; name: string; roles: string[] }) => (
                <div
                  key={tenant.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900/80"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {tenant.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Roles: {tenant.roles.join(", ")}
                    </p>
                  </div>
                  {tenant.id === activeTenantId ? (
                    <Badge variant="success">Activa</Badge>
                  ) : (
                    <Button variant="outline" onClick={() => handleSwitchTenant(tenant.id)}>
                      Usar cuenta
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
