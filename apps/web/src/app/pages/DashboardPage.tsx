import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Boxes,
  ClipboardList,
  PawPrint,
  Truck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardFiltersBar } from "@/components/dashboard/DashboardFiltersBar";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DistributionDonutChart } from "@/components/dashboard/DistributionDonutChart";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Access } from "@/lib/access";
import { animalCategoryOptions, animalSexOptions } from "@/lib/animals";
import { hasAnyRole } from "@/lib/auth";
import {
  getMovementTypeLabel,
  normalizeDashboardRange,
  useDashboardOverview,
} from "@/lib/dashboard";
import { formatDateOnlyUtc } from "@/lib/dates";
import type {
  DashboardRange,
  EstablishmentNode,
  LifecycleSeriesPoint,
} from "@/lib/types";

const categoryColors = ["#4d7d66", "#6f9c7d", "#90b49a", "#8a9a8b", "#c2d5c7"];
const sexColors = ["#4d7d66", "#64748b"];

const formatChartDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

const sumLifecycle = (rows: LifecycleSeriesPoint[]) =>
  rows.reduce((sum, row) => sum + row.births + row.deaths + row.sales, 0);

const DashboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const range = normalizeDashboardRange(searchParams.get("range"));
  const fincaId = searchParams.get("fincaId") ?? undefined;
  const establishmentId = searchParams.get("establishmentId") ?? undefined;

  const canViewAnimals = hasAnyRole(Access.animals);
  const canViewWithdrawals = hasAnyRole(Access.withdrawals);
  const canViewInventory = hasAnyRole(Access.inventory);
  const canViewMovements = hasAnyRole(Access.movements);
  const canViewTreatments = hasAnyRole(Access.treatments);
  const canViewEvents = hasAnyRole(Access.events);
  const canManageAnimals = hasAnyRole(Access.animalsCreate);
  const canManageTreatments = hasAnyRole(Access.treatmentsCreate);
  const canManageBatches = hasAnyRole(Access.batchesCreate);

  const { data: establishments } = useQuery({
    queryKey: ["establishments", "dashboard-filters"],
    queryFn: async () => (await api.get("/establishments?tree=true")).data as EstablishmentNode[],
  });

  const overviewQuery = useDashboardOverview({ range, fincaId, establishmentId });
  const overview = overviewQuery.data;

  const fincas = useMemo(() => establishments ?? [], [establishments]);

  const filteredEstablishments = useMemo(() => {
    if (!fincas.length) return [] as EstablishmentNode[];
    if (fincaId) {
      const selected = fincas.find((finca) => finca.id === fincaId);
      return (selected?.children ?? []).filter((node) => node.type !== "FINCA");
    }
    return fincas
      .flatMap((finca) => finca.children ?? [])
      .filter((node) => node.type !== "FINCA");
  }, [fincas, fincaId]);

  const categoryChartData = useMemo(() => {
    const byCategory = new Map(
      (overview?.animalDistribution.byCategory ?? []).map((item) => [item.category, item.count])
    );
    return animalCategoryOptions.map((option, index) => ({
      name: option.label,
      value: byCategory.get(option.value) ?? 0,
      color: categoryColors[index % categoryColors.length],
    }));
  }, [overview]);

  const sexChartData = useMemo(() => {
    const bySex = new Map(
      (overview?.animalDistribution.bySex ?? []).map((item) => [item.sex, item.count])
    );
    return animalSexOptions.map((option, index) => ({
      name: option.label,
      value: bySex.get(option.value) ?? 0,
      color: sexColors[index % sexColors.length],
    }));
  }, [overview]);

  const categoryTotal = useMemo(
    () => categoryChartData.reduce((sum, row) => sum + row.value, 0),
    [categoryChartData]
  );
  const sexTotal = useMemo(
    () => sexChartData.reduce((sum, row) => sum + row.value, 0),
    [sexChartData]
  );

  const hasData = useMemo(() => {
    if (!overview) return false;
    return (
      overview.kpis.animalsActive.value > 0 ||
      overview.kpis.treatmentsInRange.value > 0 ||
      overview.kpis.movementsInRange.value > 0 ||
      overview.kpis.withdrawalsActive.value > 0 ||
      overview.kpis.inventoryAlerts.value > 0 ||
      overview.treatmentsSeries.some((item) => item.count > 0) ||
      sumLifecycle(overview.lifecycleSeries) > 0 ||
      overview.inventoryTop.some((item) => item.stock > 0) ||
      overview.movementsRecent.length > 0
    );
  }, [overview]);

  const updateFilters = (next: {
    range?: DashboardRange;
    fincaId?: string;
    establishmentId?: string;
  }) => {
    const params = new URLSearchParams(searchParams);
    params.set("range", next.range ?? range);

    const nextFincaId = next.fincaId ?? fincaId;
    const nextEstablishmentId = next.establishmentId ?? establishmentId;

    if (nextFincaId) params.set("fincaId", nextFincaId);
    else params.delete("fincaId");

    if (nextEstablishmentId) params.set("establishmentId", nextEstablishmentId);
    else params.delete("establishmentId");

    setSearchParams(params);
  };

  const resetFilters = () => {
    const params = new URLSearchParams();
    params.set("range", "30d");
    setSearchParams(params);
  };

  const withCurrentFilters = (path: string) => {
    const params = new URLSearchParams();
    params.set("range", range);
    if (fincaId) params.set("fincaId", fincaId);
    if (establishmentId) params.set("establishmentId", establishmentId);
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  };

  const showActions =
    canManageAnimals || canManageTreatments || canManageBatches || canViewWithdrawals;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard operativo"
        subtitle="Panel de control dinamico para salud, inventario y movimientos"
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
            </div>
          ) : undefined
        }
      />

      <DashboardFiltersBar
        range={range}
        fincaId={fincaId}
        establishmentId={establishmentId}
        fincas={fincas}
        establishmentsByFinca={filteredEstablishments}
        onChangeRange={(nextRange) => updateFilters({ range: nextRange })}
        onChangeFinca={(nextFincaId) =>
          updateFilters({ fincaId: nextFincaId, establishmentId: undefined })
        }
        onChangeEstablishment={(nextEstablishmentId) =>
          updateFilters({ establishmentId: nextEstablishmentId })
        }
        onReset={resetFilters}
      />

      {overviewQuery.isLoading ? <DashboardSkeleton /> : null}

      {overviewQuery.isError ? (
        <EmptyState
          title="No se pudo cargar el dashboard"
          description="Ocurrio un error al consultar los agregados del panel. Intenta nuevamente."
          action={
            <Button variant="outline" onClick={() => overviewQuery.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : null}

      {!overviewQuery.isLoading && !overviewQuery.isError && overview ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
            Datos generados: {formatDateOnlyUtc(overview.generatedAt)}{" "}
            {overviewQuery.isFetching ? "(actualizando...)" : ""}
          </div>

          {!hasData ? <DashboardEmptyState onRetry={() => overviewQuery.refetch()} /> : null}

          {hasData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {canViewAnimals ? (
                  <KpiCard
                    label="Animales activos"
                    value={overview.kpis.animalsActive.value}
                    helper="Inventario animal vigente"
                    icon={<PawPrint className="h-4 w-4" />}
                    to={withCurrentFilters("/animals")}
                  />
                ) : null}
                {canViewTreatments ? (
                  <KpiCard
                    label={`Tratamientos ${range}`}
                    value={overview.kpis.treatmentsInRange.value}
                    helper="Actividad sanitaria por periodo"
                    deltaPct={overview.kpis.treatmentsInRange.deltaPct}
                    icon={<Activity className="h-4 w-4" />}
                    to={withCurrentFilters("/treatments")}
                  />
                ) : null}
                {canViewMovements ? (
                  <KpiCard
                    label={`Movimientos ${range}`}
                    value={overview.kpis.movementsInRange.value}
                    helper="Traslados internos y externos"
                    deltaPct={overview.kpis.movementsInRange.deltaPct}
                    icon={<Truck className="h-4 w-4" />}
                    to={withCurrentFilters("/movements")}
                  />
                ) : null}
                {canViewWithdrawals ? (
                  <KpiCard
                    label="Retiros activos"
                    value={overview.kpis.withdrawalsActive.value}
                    helper="Animales bloqueados por retiro"
                    icon={<ClipboardList className="h-4 w-4" />}
                    to={withCurrentFilters("/reports")}
                  />
                ) : null}
                {canViewInventory ? (
                  <KpiCard
                    label="Alertas de inventario"
                    value={overview.kpis.inventoryAlerts.value}
                    helper={`Vencen: ${overview.kpis.inventoryAlerts.expiring} | Minimo: ${overview.kpis.inventoryAlerts.lowStock}`}
                    icon={<Boxes className="h-4 w-4" />}
                    to={withCurrentFilters("/inventory")}
                  />
                ) : null}
              </div>

              {canViewAnimals ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <ChartCard eyebrow="Distribucion" title="Animales por categoria">
                    <div className="h-72">
                      {categoryTotal === 0 ? (
                        <div className="grid h-full place-items-center text-sm text-slate-500 dark:text-slate-400">
                          Sin datos para graficar
                        </div>
                      ) : (
                        <DistributionDonutChart data={categoryChartData} total={categoryTotal} />
                      )}
                    </div>
                  </ChartCard>

                  <ChartCard eyebrow="Distribucion" title="Animales por sexo">
                    <div className="h-72">
                      {sexTotal === 0 ? (
                        <div className="grid h-full place-items-center text-sm text-slate-500 dark:text-slate-400">
                          Sin datos para graficar
                        </div>
                      ) : (
                        <DistributionDonutChart data={sexChartData} total={sexTotal} />
                      )}
                    </div>
                  </ChartCard>
                </div>
              ) : null}

              {canViewEvents || canViewInventory ? (
                <div className="grid gap-6 lg:grid-cols-3">
                  {canViewEvents ? (
                    <ChartCard
                      className={canViewInventory ? "lg:col-span-2" : "lg:col-span-3"}
                      eyebrow="Ciclo de vida"
                      title={`Nacimientos, muertes y ventas (${range})`}
                    >
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={overview.lifecycleSeries}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickFormatter={formatChartDate}
                              stroke="#94a3b8"
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                              labelFormatter={(label: string) =>
                                formatDateOnlyUtc(`${label}T00:00:00.000Z`)
                              }
                            />
                            <Legend />
                            <Bar dataKey="births" name="Nacimientos" fill="#4d7d66" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="deaths" name="Muertes" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="sales" name="Ventas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                  ) : null}

                  {canViewInventory ? (
                    <ChartCard
                      className={canViewEvents ? "" : "lg:col-span-3"}
                      eyebrow="Inventario"
                      title="Stock total vs minimo"
                    >
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={overview.inventoryTop}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="productName"
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
                              formatter={(value: number | string, name: string, item) => {
                                const payload = item?.payload as { unit?: string } | undefined;
                                const label = name === "stock" ? "Stock" : "Minimo";
                                return [`${value}${payload?.unit ? ` ${payload.unit}` : ""}`, label];
                              }}
                            />
                            <Legend />
                            <Bar dataKey="stock" name="Stock" fill="#2563eb" />
                            <Bar dataKey="minStock" name="Minimo" fill="#f59e0b" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-3">
                {canViewTreatments ? (
                  <ChartCard
                    className={canViewMovements ? "lg:col-span-2" : "lg:col-span-3"}
                    eyebrow="Salud"
                    title={`Aplicaciones por dia (${range})`}
                  >
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overview.treatmentsSeries}>
                          <defs>
                            <linearGradient id="treatments-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4d7d66" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#4d7d66" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tickFormatter={formatChartDate} stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip
                            labelFormatter={(label: string) =>
                              formatDateOnlyUtc(`${label}T00:00:00.000Z`)
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#4d7d66"
                            fillOpacity={1}
                            fill="url(#treatments-gradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                ) : null}

                {canViewMovements ? (
                  <ChartCard
                    className={canViewTreatments ? "" : "lg:col-span-3"}
                    eyebrow="Trazabilidad"
                    title="Movimientos recientes"
                  >
                    <div className="space-y-2">
                      {overview.movementsRecent.map((movement) => (
                        <div
                          key={movement.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {getMovementTypeLabel(movement.movementType)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {movement.animalTag || movement.animalId}
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            <p>{formatDateOnlyUtc(movement.occurredAt)}</p>
                            <p>
                              {movement.originName || "Sin origen"}
                              {" -> "}
                              {movement.destinationName || "Sin destino"}
                            </p>
                          </div>
                        </div>
                      ))}
                      {overview.movementsRecent.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Sin movimientos recientes para este filtro.
                        </p>
                      ) : null}
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={withCurrentFilters("/movements")}>Ver todos</Link>
                      </Button>
                    </div>
                  </ChartCard>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {overviewQuery.isLoading || overviewQuery.isError ? null : !overview ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No se recibieron datos del dashboard.
          </CardContent>
        </Card>
      ) : null}

      {canViewInventory && overview ? (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            Alertas activas: {overview.kpis.inventoryAlerts.value}. Revisa vencimientos y stock minimo.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default DashboardPage;
