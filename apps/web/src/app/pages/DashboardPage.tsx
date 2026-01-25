import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { animalCategoryOptions, animalSexOptions } from "@/lib/animals";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const DashboardPage = () => {
  const canViewAnimals = hasAnyRole(Access.animals);
  const canViewWithdrawals = hasAnyRole(Access.withdrawals);
  const canViewInventory = hasAnyRole(Access.inventory);
  const canViewMovements = hasAnyRole(Access.movements);
  const canViewTreatments = hasAnyRole(Access.treatments);
  const canViewEvents = hasAnyRole(Access.events);
  const canManageAnimals = hasAnyRole(Access.animalsCreate);
  const canManageTreatments = hasAnyRole(Access.treatmentsCreate);
  const canManageBatches = hasAnyRole(Access.batchesCreate);

  const { data: animalSummary } = useQuery({
    queryKey: ["animals", "summary"],
    queryFn: async () => (await api.get("/animals/summary")).data,
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

  const lifecycleMonths = 12;
  const { data: lifecycleSummary } = useQuery({
    queryKey: ["events", "lifecycle", lifecycleMonths],
    queryFn: async () =>
      (await api.get(`/events/lifecycle-summary?months=${lifecycleMonths}`)).data,
    enabled: canViewEvents,
  });

  const { data: inventorySummary } = useQuery({
    queryKey: ["inventory", "summary"],
    queryFn: async () => (await api.get("/inventory/summary")).data,
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
    for (const row of animalSummary?.byCategory ?? []) {
      counts[row.category] = row.count ?? 0;
    }
    return counts;
  }, [animalSummary]);

  const categoryChartData = useMemo(
    () =>
      animalCategoryOptions.map((option) => ({
        name: option.label,
        value: categoryCounts[option.value] ?? 0,
      })),
    [categoryCounts]
  );

  const sexCounts = useMemo(() => {
    const counts = animalSexOptions.reduce<Record<string, number>>((acc, option) => {
      acc[option.value] = 0;
      return acc;
    }, {});
    for (const row of animalSummary?.bySex ?? []) {
      counts[row.sex] = row.count ?? 0;
    }
    return counts;
  }, [animalSummary]);

  const sexChartData = useMemo(
    () =>
      animalSexOptions.map((option) => ({
        name: option.label,
        value: sexCounts[option.value] ?? 0,
      })),
    [sexCounts]
  );

  const categoryTotal = useMemo(
    () => categoryChartData.reduce((sum, row) => sum + row.value, 0),
    [categoryChartData]
  );

  const sexTotal = useMemo(
    () => sexChartData.reduce((sum, row) => sum + row.value, 0),
    [sexChartData]
  );

  const lifecycleChartData = useMemo(() => {
    return (lifecycleSummary?.items ?? []).map((row: any) => {
      const [year, month] = String(row.month ?? "").split("-");
      const labelDate = new Date(Number(year), Number(month) - 1, 1);
      const label = Number.isNaN(labelDate.getTime())
        ? row.month
        : labelDate.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
      return {
        label,
        births: row.births ?? 0,
        deaths: row.deaths ?? 0,
        sales: row.sales ?? 0,
      };
    });
  }, [lifecycleSummary]);

  const stockChartData = useMemo(() => {
    const items = inventorySummary?.items ?? [];
    return items
      .map((row: any) => ({
        name: row.product?.name ?? "-",
        unit: row.product?.unit ?? "",
        stock: row.total ?? 0,
        min: row.product?.minStock ?? 0,
      }))
      .filter((row) => row.stock > 0 || row.min > 0)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 8);
  }, [inventorySummary]);

  const chartData = [
    { day: "Lun", value: 12 },
    { day: "Mar", value: 18 },
    { day: "Mie", value: 14 },
    { day: "Jue", value: 22 },
    { day: "Vie", value: 16 },
    { day: "Sab", value: 10 },
    { day: "Dom", value: 19 },
  ];

  const categoryColors = ["#4d7d66", "#6f9c7d", "#90b49a", "#8a9a8b", "#c2d5c7"];
  const sexColors = ["#4d7d66", "#64748b"];
  const lifecycleColors = { births: "#4d7d66", deaths: "#b91c1c", sales: "#2563eb" };
  const stockColors = { stock: "#2563eb", min: "#f59e0b" };

  const formatPieValue = (value: number, total: number) => {
    if (!total) return `${value}`;
    const pct = Math.round((value / total) * 100);
    return `${value} (${pct}%)`;
  };

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
              <p className="text-xs text-slate-500 dark:text-slate-400">Animales activos</p>
              <p className="font-display text-2xl font-semibold">
                {animalSummary?.total ?? 0}
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Retiros activos</p>
              <p className="font-display text-2xl font-semibold">
                {withdrawalsData?.total ?? 0}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Animales bloqueados para venta o faena.
              </p>
            </CardContent>
          </Card>
        ) : null}
        {canViewInventory ? (
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500 dark:text-slate-400">Alertas de inventario</p>
              <p className="font-display text-2xl font-semibold">
                {(inventoryAlerts?.expiring?.length ?? 0) +
                  (inventoryAlerts?.lowStock?.length ?? 0)}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Vencimientos proximos y stock minimo.
              </p>
            </CardContent>
          </Card>
        ) : null}
        {canViewMovements ? (
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500 dark:text-slate-400">Movimientos recientes</p>
              <p className="font-display text-2xl font-semibold">
                {movementsData?.items?.length ?? 0}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ultimos traslados.</p>
            </CardContent>
          </Card>
        ) : null}
        {canViewTreatments ? (
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tratamientos 7 dias</p>
              <p className="font-display text-2xl font-semibold">{treatmentsLast7}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">Actividad sanitaria reciente.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {canViewAnimals ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribucion por categoria</p>
              <p className="font-display text-xl font-semibold">Animales activos</p>
            </CardHeader>
            <CardContent className="h-64">
              {categoryTotal === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Sin datos para graficar.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(value: number | string) =>
                        formatPieValue(Number(value), categoryTotal)
                      }
                    />
                    <Legend verticalAlign="bottom" height={36} />
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell
                          key={`category-${entry.name}`}
                          fill={categoryColors[index % categoryColors.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribucion por sexo</p>
              <p className="font-display text-xl font-semibold">Animales activos</p>
            </CardHeader>
            <CardContent className="h-64">
              {sexTotal === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Sin datos para graficar.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(value: number | string) =>
                        formatPieValue(Number(value), sexTotal)
                      }
                    />
                    <Legend verticalAlign="bottom" height={36} />
                    <Pie
                      data={sexChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {sexChartData.map((entry, index) => (
                        <Cell
                          key={`sex-${entry.name}`}
                          fill={sexColors[index % sexColors.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {canViewEvents || canViewInventory ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {canViewEvents ? (
            <Card className={canViewInventory ? "lg:col-span-2" : "lg:col-span-3"}>
              <CardHeader>
                <p className="text-xs text-slate-500 dark:text-slate-400">Nacimientos vs muertes vs ventas</p>
                <p className="font-display text-xl font-semibold">
                  Ultimos {lifecycleMonths} meses
                </p>
              </CardHeader>
              <CardContent className="h-72">
                {lifecycleChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    Sin eventos en el periodo.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lifecycleChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="births"
                        name="Nacimientos"
                        fill={lifecycleColors.births}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="deaths"
                        name="Muertes"
                        fill={lifecycleColors.deaths}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="sales"
                        name="Ventas"
                        fill={lifecycleColors.sales}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ) : null}
          {canViewInventory ? (
            <Card className={canViewEvents ? "" : "lg:col-span-3"}>
              <CardHeader>
                <p className="text-xs text-slate-500 dark:text-slate-400">Stock total vs minimo</p>
                <p className="font-display text-xl font-semibold">
                  Productos con mayor volumen
                </p>
              </CardHeader>
              <CardContent className="h-72">
                {stockChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    Sin stock registrado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        formatter={(value: number | string, name: string, props: any) => {
                          const unit = props?.payload?.unit;
                          const label = name === "stock" ? "Stock" : "Minimo";
                          const amount = Number(value);
                          return [`${amount}${unit ? ` ${unit}` : ""}`, label];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="stock" name="Stock" fill={stockColors.stock} />
                      <Bar dataKey="min" name="Minimo" fill={stockColors.min} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {canViewTreatments ? (
          <Card className={canViewMovements ? "lg:col-span-2" : "lg:col-span-3"}>
            <CardHeader>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tratamientos ultimos 7 dias</p>
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Movimientos recientes</p>
              <p className="font-display text-xl font-semibold">Trazabilidad</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(movementsData?.items ?? []).map((move: any) => (
                <div key={move.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{move.movementType}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(move.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {(movementsData?.items ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sin movimientos recientes.</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default DashboardPage;
