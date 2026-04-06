import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Boxes, ClipboardList, PawPrint, Truck } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardFocusPanel } from "@/components/dashboard/DashboardFocusPanel";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardMetricCard } from "@/components/dashboard/DashboardMetricCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { HerdCompositionCard } from "@/components/dashboard/HerdCompositionCard";
import { Access } from "@/lib/access";
import { animalCategoryOptions, animalSexOptions } from "@/lib/animals";
import { hasAnyRole } from "@/lib/auth";
import {
  getMovementTypeLabel,
  normalizeDashboardRange,
  useDashboardOverview,
} from "@/lib/dashboard";
import { formatDateOnlyUtc } from "@/lib/dates";
import { cn } from "@/lib/utils";
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
  const sexTotal = useMemo(() => sexChartData.reduce((sum, row) => sum + row.value, 0), [sexChartData]);

  const lifecycleTotals = useMemo(
    () =>
      overview?.lifecycleSeries.reduce(
        (accumulator, row) => ({
          births: accumulator.births + row.births,
          deaths: accumulator.deaths + row.deaths,
          sales: accumulator.sales + row.sales,
        }),
        { births: 0, deaths: 0, sales: 0 }
      ) ?? { births: 0, deaths: 0, sales: 0 },
    [overview]
  );

  const treatmentsTotal = useMemo(
    () => overview?.treatmentsSeries.reduce((sum, row) => sum + row.count, 0) ?? 0,
    [overview]
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

  const heroAlertCount = useMemo(() => {
    if (!overview) return 0;
    return (canViewInventory ? overview.kpis.inventoryAlerts.value : 0) +
      (canViewWithdrawals ? overview.kpis.withdrawalsActive.value : 0);
  }, [overview, canViewInventory, canViewWithdrawals]);

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
  const showFocusPanel = canViewInventory || canViewWithdrawals;

  const metricCards = [
    canViewAnimals
      ? {
          label: "Animales activos",
          value: overview?.kpis.animalsActive.value ?? 0,
          helper: "Base vigente del hato disponible para seguimiento diario.",
          detail: "Inventario animal actual",
          icon: <PawPrint className="h-5 w-5" />,
          to: withCurrentFilters("/animals"),
          tone: "emerald" as const,
        }
      : null,
    canViewTreatments
      ? {
          label: `Tratamientos ${range}`,
          value: overview?.kpis.treatmentsInRange.value ?? 0,
          helper: "Actividad sanitaria aplicada dentro del periodo filtrado.",
          detail: `${treatmentsTotal} aplicaciones acumuladas`,
          deltaPct: overview?.kpis.treatmentsInRange.deltaPct,
          icon: <Activity className="h-5 w-5" />,
          to: withCurrentFilters("/treatments"),
          tone: "sky" as const,
        }
      : null,
    canViewMovements
      ? {
          label: `Movimientos ${range}`,
          value: overview?.kpis.movementsInRange.value ?? 0,
          helper: "Traslados internos, externos y eventos de salida del periodo.",
          detail: "Pulso de trazabilidad",
          deltaPct: overview?.kpis.movementsInRange.deltaPct,
          icon: <Truck className="h-5 w-5" />,
          to: withCurrentFilters("/movements"),
          tone: "slate" as const,
        }
      : null,
    canViewInventory
      ? {
          label: "Alertas activas",
          value: overview?.kpis.inventoryAlerts.value ?? 0,
          helper: "Cruza vencimientos y productos por debajo del stock minimo.",
          detail: overview
            ? `Vencen ${overview.kpis.inventoryAlerts.expiring} | Minimo ${overview.kpis.inventoryAlerts.lowStock}`
            : "Sin datos cargados",
          icon: <Boxes className="h-5 w-5" />,
          to: withCurrentFilters("/inventory"),
          tone: "amber" as const,
        }
      : canViewWithdrawals
        ? {
            label: "Retiros activos",
            value: overview?.kpis.withdrawalsActive.value ?? 0,
            helper: "Animales con restriccion vigente por tratamiento o retiro.",
            detail: "Revisar cumplimiento de retiro",
            icon: <ClipboardList className="h-5 w-5" />,
            to: withCurrentFilters("/reports"),
            tone: "rose" as const,
          }
        : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: number;
    helper: string;
    detail: string;
    deltaPct?: number;
    icon: JSX.Element;
    to: string;
    tone: "emerald" | "sky" | "amber" | "rose" | "slate";
  }>;

  return (
    <div className="space-y-6">
      <DashboardHero
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
        generatedAt={overview ? formatDateOnlyUtc(overview.generatedAt) : undefined}
        isFetching={overviewQuery.isFetching}
        alertCount={heroAlertCount}
        animalsActive={overview?.kpis.animalsActive.value ?? 0}
        treatmentsInRange={overview?.kpis.treatmentsInRange.value ?? 0}
        movementsInRange={overview?.kpis.movementsInRange.value ?? 0}
        actions={
          showActions ? (
            <>
              {canManageAnimals ? (
                <Button asChild className="rounded-2xl">
                  <Link to="/animals/quick">Registro animal</Link>
                </Button>
              ) : null}
              {canManageTreatments ? (
                <Button variant="secondary" asChild className="rounded-2xl bg-white text-slate-900 hover:bg-slate-100">
                  <Link to="/treatments">Registrar tratamiento</Link>
                </Button>
              ) : null}
              {canManageBatches ? (
                <Button variant="ghost" asChild className="rounded-2xl border border-white/12 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/batches">Agregar lote</Link>
                </Button>
              ) : null}
            </>
          ) : undefined
        }
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
          {!hasData ? <DashboardEmptyState onRetry={() => overviewQuery.refetch()} /> : null}

          {hasData ? (
            <>
              <div className={cn("grid gap-6", showFocusPanel ? "2xl:grid-cols-[minmax(0,1.65fr)_360px]" : "") }>
                <div className="space-y-6">
                  <div className={cn("grid gap-4", metricCards.length >= 4 ? "md:grid-cols-2 2xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3") }>
                    {metricCards.map((card) => (
                      <DashboardMetricCard key={card.label} {...card} />
                    ))}
                  </div>

                  {canViewEvents ? (
                    <ChartCard
                      eyebrow="Pulso del periodo"
                      title={`Ciclo de vida del hato (${range})`}
                      description="Sigue nacimientos, muertes y ventas para entender el balance operativo del inventario en el periodo seleccionado."
                      footer={
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                            <p className="text-xs uppercase tracking-[0.24em] opacity-80">Nacimientos</p>
                            <p className="mt-1 font-display text-2xl font-semibold">{lifecycleTotals.births}</p>
                          </div>
                          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                            <p className="text-xs uppercase tracking-[0.24em] opacity-80">Muertes</p>
                            <p className="mt-1 font-display text-2xl font-semibold">{lifecycleTotals.deaths}</p>
                          </div>
                          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                            <p className="text-xs uppercase tracking-[0.24em] opacity-80">Ventas</p>
                            <p className="mt-1 font-display text-2xl font-semibold">{lifecycleTotals.sales}</p>
                          </div>
                        </div>
                      }
                    >
                      <div className="h-80">
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
                            <Bar dataKey="births" name="Nacimientos" fill="#4d7d66" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="deaths" name="Muertes" fill="#b91c1c" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="sales" name="Ventas" fill="#2563eb" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                  ) : null}
                </div>

                {showFocusPanel ? (
                  <DashboardFocusPanel
                    inventoryAlerts={canViewInventory ? overview.kpis.inventoryAlerts : undefined}
                    withdrawalsActive={canViewWithdrawals ? overview.kpis.withdrawalsActive.value : undefined}
                    inventoryLink={canViewInventory ? withCurrentFilters("/inventory") : undefined}
                    withdrawalsLink={canViewWithdrawals ? withCurrentFilters("/reports") : undefined}
                  />
                ) : null}
              </div>

              {canViewAnimals ? (
                <HerdCompositionCard categoryData={categoryChartData} sexData={sexChartData} />
              ) : null}

              {(canViewTreatments || canViewInventory) ? (
                <div className="grid gap-6 xl:grid-cols-3">
                  {canViewTreatments ? (
                    <ChartCard
                      className={canViewInventory ? "xl:col-span-2" : "xl:col-span-3"}
                      eyebrow="Salud"
                      title={`Aplicaciones por dia (${range})`}
                      description="Detecta picos de actividad sanitaria y relaciona rapidamente el ritmo de tratamientos con el periodo analizado."
                      footer={
                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                          Total aplicado en el periodo: <span className="font-semibold text-slate-900 dark:text-slate-50">{treatmentsTotal}</span>
                        </div>
                      }
                    >
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={overview.treatmentsSeries}>
                            <defs>
                              <linearGradient id="treatments-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4d7d66" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#4d7d66" stopOpacity={0} />
                              </linearGradient>
                            </defs>
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

                  {canViewInventory ? (
                    <ChartCard
                      className={canViewTreatments ? "" : "xl:col-span-3"}
                      eyebrow="Inventario critico"
                      title="Stock total vs minimo"
                      description="Compara rapidamente el stock disponible frente al minimo configurado para identificar brechas operativas."
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
                            <Bar dataKey="stock" name="Stock" fill="#2563eb" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="minStock" name="Minimo" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                  ) : null}
                </div>
              ) : null}

              {canViewMovements ? (
                <ChartCard
                  eyebrow="Trazabilidad"
                  title="Movimientos recientes"
                  description="Revisa el flujo operativo mas reciente con contexto de origen, destino y fecha del movimiento."
                  headerAction={
                    <Button variant="outline" size="sm" asChild>
                      <Link to={withCurrentFilters("/movements")}>Ver todos</Link>
                    </Button>
                  }
                >
                  <div className="space-y-4">
                    {overview.movementsRecent.length > 0 ? (
                      overview.movementsRecent.map((movement, index) => (
                        <div
                          key={movement.id}
                          className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-stretch"
                        >
                          <div className="hidden md:flex md:w-6 md:flex-col md:items-center">
                            <span className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            {index < overview.movementsRecent.length - 1 ? (
                              <span className="mt-2 h-full w-px bg-slate-200 dark:bg-slate-800" />
                            ) : null}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-50">
                                  {getMovementTypeLabel(movement.movementType)}
                                </p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  {movement.animalTag || movement.animalId}
                                </p>
                              </div>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {formatDateOnlyUtc(movement.occurredAt)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                              {movement.originName || "Sin origen"}
                              {" -> "}
                              {movement.destinationName || "Sin destino"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Sin movimientos recientes para este filtro.
                      </p>
                    )}
                  </div>
                </ChartCard>
              ) : null}
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
    </div>
  );
};

export default DashboardPage;
