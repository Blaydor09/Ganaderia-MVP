import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import { animalCategoryOptions } from "@/lib/animals";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const DashboardPage = () => {
  const canViewAnimals = hasAnyRole(Access.animals);
  const canViewWithdrawals = hasAnyRole(Access.withdrawals);
  const canViewInventory = hasAnyRole(Access.inventory);
  const canViewMovements = hasAnyRole(Access.movements);
  const canViewTreatments = hasAnyRole(Access.treatments);
  const canManageAnimals = hasAnyRole(Access.animalsCreate);
  const canManageTreatments = hasAnyRole(Access.treatmentsCreate);
  const canManageBatches = hasAnyRole(Access.batchesCreate);

  const { data: animalsData } = useQuery({
    queryKey: ["animals", "summary"],
    queryFn: async () => (await api.get("/animals?page=1&pageSize=200")).data,
    enabled: canViewAnimals,
  });

  const { data: withdrawalsData } = useQuery({
    queryKey: ["reports", "withdrawals"],
    queryFn: async () => (await api.get("/reports/withdrawals-active")).data,
    enabled: canViewWithdrawals,
  });

  const { data: inventoryAlerts } = useQuery({
    queryKey: ["inventory", "alerts"],
    queryFn: async () => (await api.get("/inventory/alerts")).data,
    enabled: canViewInventory,
  });

  const { data: movementsData } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => (await api.get("/movements?page=1&pageSize=6")).data,
    enabled: canViewMovements,
  });

  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments", "recent"],
    queryFn: async () => (await api.get("/treatments?page=1&pageSize=50")).data,
    enabled: canViewTreatments,
  });

  const categoryCounts = useMemo(() => {
    const counts = animalCategoryOptions.reduce<Record<string, number>>((acc, option) => {
      acc[option.value] = 0;
      return acc;
    }, {});
    if (!canViewAnimals) {
      return counts;
    }
    for (const animal of animalsData?.items ?? []) {
      counts[animal.category] = (counts[animal.category] ?? 0) + 1;
    }
    return counts;
  }, [animalsData, canViewAnimals]);

  const chartData = [
    { day: "Lun", value: 12 },
    { day: "Mar", value: 18 },
    { day: "Mie", value: 14 },
    { day: "Jue", value: 22 },
    { day: "Vie", value: 16 },
    { day: "Sab", value: 10 },
    { day: "Dom", value: 19 },
  ];

  const treatmentsLast7 = useMemo(() => {
    if (!canViewTreatments) return 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return (treatmentsData?.items ?? []).filter(
      (t: any) => new Date(t.startedAt) >= cutoff
    ).length;
  }, [treatmentsData, canViewTreatments]);

  const showActions =
    canManageAnimals || canManageTreatments || canManageBatches || canViewWithdrawals;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard operativo"
        subtitle="KPI diarios de animales, salud e inventario"
        actions={
          showActions ? (
            <div className="flex flex-wrap gap-2">
              {canManageAnimals ? (
                <Button asChild>
                  <Link to="/animals/new">Registrar animal</Link>
                </Button>
              ) : null}
              {canManageTreatments ? (
                <Button variant="secondary" asChild>
                  <Link to="/treatments">Registrar tratamiento</Link>
                </Button>
              ) : null}
              {canManageBatches ? (
                <Button variant="outline" asChild>
                  <Link to="/batches">Agregar lote</Link>
                </Button>
              ) : null}
              {canViewWithdrawals ? (
                <Button variant="ghost" asChild>
                  <Link to="/withdrawals">Ver retiros activos</Link>
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {canViewAnimals ? (
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500">Animales activos</p>
              <p className="font-display text-2xl font-semibold">
                {animalsData?.total ?? 0}
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {animalCategoryOptions.map((option) => (
                <Badge key={option.value}>
                  {option.label}: {categoryCounts[option.value] ?? 0}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : null}
        {canViewWithdrawals ? (
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500">Retiros activos</p>
              <p className="font-display text-2xl font-semibold">
                {withdrawalsData?.total ?? 0}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Animales bloqueados para venta o faena.
              </p>
            </CardContent>
          </Card>
        ) : null}
        {canViewInventory ? (
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500">Alertas de inventario</p>
              <p className="font-display text-2xl font-semibold">
                {(inventoryAlerts?.expiring?.length ?? 0) +
                  (inventoryAlerts?.lowStock?.length ?? 0)}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Vencimientos proximos y stock minimo.
              </p>
            </CardContent>
          </Card>
        ) : null}
        {canViewMovements ? (
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500">Movimientos recientes</p>
              <p className="font-display text-2xl font-semibold">
                {movementsData?.items?.length ?? 0}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Ultimos traslados.</p>
            </CardContent>
          </Card>
        ) : null}
        {canViewTreatments ? (
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500">Tratamientos 7 dias</p>
              <p className="font-display text-2xl font-semibold">{treatmentsLast7}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Actividad sanitaria reciente.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {canViewTreatments ? (
          <Card className={canViewMovements ? "lg:col-span-2" : "lg:col-span-3"}>
            <CardHeader>
              <p className="text-xs text-slate-500">Tratamientos ultimos 7 dias</p>
              <p className="font-display text-xl font-semibold">Actividad sanitaria</p>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4d7d66" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4d7d66" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#4d7d66"
                    fillOpacity={1}
                    fill="url(#colorHealth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}
        {canViewMovements ? (
          <Card className={canViewTreatments ? "" : "lg:col-span-3"}>
            <CardHeader>
              <p className="text-xs text-slate-500">Movimientos recientes</p>
              <p className="font-display text-xl font-semibold">Trazabilidad</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(movementsData?.items ?? []).map((move: any) => (
                <div key={move.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{move.movementType}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(move.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {(movementsData?.items ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">Sin movimientos recientes.</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default DashboardPage;
