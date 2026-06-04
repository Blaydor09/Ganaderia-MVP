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
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardAlertStrip } from "@/components/dashboard/DashboardAlertStrip";
import { DashboardCommandBar } from "@/components/dashboard/DashboardCommandBar";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { HerdCompositionCard } from "@/components/dashboard/HerdCompositionCard";
import { InventoryGaugeTable } from "@/components/dashboard/InventoryGaugeTable";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { MovementsCompactTable } from "@/components/dashboard/MovementsCompactTable";
import { Access } from "@/lib/access";
import { animalCategoryOptions, animalSexOptions } from "@/lib/animals";
import { hasAnyRole } from "@/lib/auth";
import {
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

/* ── Stagger animation helper ── */
const stagger = (index: number) => ({
  className: "dash-section-enter",
  style: { animationDelay: `${index * 60}ms` } as React.CSSProperties,
});

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

  const showQuickActions =
    canManageAnimals || canManageTreatments || canManageBatches;
  const showAlertStrip = canViewInventory || canViewWithdrawals;

  /* ── KPI tiles definition ── */
  const kpiTiles = [
    canViewAnimals
      ? {
          label: "Animales activos",
          value: overview?.kpis.animalsActive.value ?? 0,
          icon: <PawPrint className="h-4 w-4" />,
          to: withCurrentFilters("/animals"),
          tone: "emerald" as const,
          detail: "Inventario animal actual",
        }
      : null,
    canViewTreatments
      ? {
          label: `Tratamientos ${range}`,
          value: overview?.kpis.treatmentsInRange.value ?? 0,
          deltaPct: overview?.kpis.treatmentsInRange.deltaPct,
          icon: <Activity className="h-4 w-4" />,
          to: withCurrentFilters("/treatments"),
          tone: "sky" as const,
          detail: `${treatmentsTotal} aplicaciones`,
        }
      : null,
    canViewMovements
      ? {
          label: `Movimientos ${range}`,
          value: overview?.kpis.movementsInRange.value ?? 0,
          deltaPct: overview?.kpis.movementsInRange.deltaPct,
          icon: <Truck className="h-4 w-4" />,
          to: withCurrentFilters("/movements"),
          tone: "slate" as const,
        }
      : null,
    canViewInventory
      ? {
          label: "Alertas activas",
          value: overview?.kpis.inventoryAlerts.value ?? 0,
          icon: <Boxes className="h-4 w-4" />,
          to: withCurrentFilters("/inventory"),
          tone: "amber" as const,
          detail: overview
            ? `Vencen ${overview.kpis.inventoryAlerts.expiring} · Mínimo ${overview.kpis.inventoryAlerts.lowStock}`
            : undefined,
        }
      : canViewWithdrawals
        ? {
            label: "Retiros activos",
            value: overview?.kpis.withdrawalsActive.value ?? 0,
            icon: <ClipboardList className="h-4 w-4" />,
            to: withCurrentFilters("/reports"),
            tone: "rose" as const,
          }
        : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: number;
    deltaPct?: number;
    icon: JSX.Element;
    to: string;
    tone: "emerald" | "sky" | "amber" | "rose" | "slate";
    detail?: string;
  }>;

  return (
    <div className="space-y-4">
      {/* ── Command Bar: compact filters ── */}
      <div {...stagger(0)}>
        <DashboardCommandBar
          range={range}
          fincaId={fincaId}
          establishmentId={establishmentId}
          fincas={fincas}
          establishments={filteredEstablishments}
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
        />
      </div>

      {/* ── Quick Actions (compact) ── */}
      {showQuickActions ? (
        <div {...stagger(1)} className="dash-section-enter flex flex-wrap items-center gap-2">
          {canManageAnimals ? (
            <Button asChild size="sm" className="h-8 rounded-lg text-xs">
              <Link to="/animals/quick">+ Animal</Link>
            </Button>
          ) : null}
          {canManageTreatments ? (
            <Button variant="outline" asChild size="sm" className="h-8 rounded-lg text-xs">
              <Link to="/treatments">+ Tratamiento</Link>
            </Button>
          ) : null}
          {canManageBatches ? (
            <Button variant="outline" asChild size="sm" className="h-8 rounded-lg text-xs">
              <Link to="/batches">+ Lote</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* ── Alert Strip (conditional) ── */}
      {showAlertStrip && overview ? (
        <div {...stagger(2)}>
          <DashboardAlertStrip
            inventoryAlerts={canViewInventory ? overview.kpis.inventoryAlerts : undefined}
            withdrawalsActive={canViewWithdrawals ? overview.kpis.withdrawalsActive.value : undefined}
            inventoryLink={canViewInventory ? withCurrentFilters("/inventory") : undefined}
            withdrawalsLink={canViewWithdrawals ? withCurrentFilters("/reports") : undefined}
          />
        </div>
      ) : null}

      {/* ── Loading state ── */}
      {overviewQuery.isLoading ? <DashboardSkeleton /> : null}

      {/* ── Error state ── */}
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

      {/* ── Main content ── */}
      {!overviewQuery.isLoading && !overviewQuery.isError && overview ? (
        <>
          {!hasData ? <DashboardEmptyState onRetry={() => overviewQuery.refetch()} /> : null}

          {hasData ? (
            <>
              {/* ── KPI Tiles Row ── */}
              <div
                {...stagger(3)}
                className="dash-section-enter grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                {kpiTiles.map((tile) => (
                  <KpiTile key={tile.label} {...tile} />
                ))}
              </div>

              {/* ── Charts Row 1: Lifecycle + Herd Composition ── */}
              <div
                {...stagger(4)}
                className="dash-section-enter grid gap-4 xl:grid-cols-2"
              >
                {canViewEvents ? (
                  <ChartCard
                    title={`Ciclo de vida (${range})`}
                    badge={
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {lifecycleTotals.births}N · {lifecycleTotals.deaths}M · {lifecycleTotals.sales}V
                      </span>
                    }
                    footer={
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-xs dark:bg-emerald-500/8">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-emerald-700 dark:text-emerald-300">Nacimientos</span>
                          <span className="ml-auto font-display font-semibold text-emerald-800 dark:text-emerald-200">{lifecycleTotals.births}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-rose-50/80 px-3 py-2 text-xs dark:bg-rose-500/8">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="text-rose-700 dark:text-rose-300">Muertes</span>
                          <span className="ml-auto font-display font-semibold text-rose-800 dark:text-rose-200">{lifecycleTotals.deaths}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-sky-50/80 px-3 py-2 text-xs dark:bg-sky-500/8">
                          <span className="h-2 w-2 rounded-full bg-sky-500" />
                          <span className="text-sky-700 dark:text-sky-300">Ventas</span>
                          <span className="ml-auto font-display font-semibold text-sky-800 dark:text-sky-200">{lifecycleTotals.sales}</span>
                        </div>
                      </div>
                    }
                  >
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.lifecycleSeries}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatChartDate}
                            stroke="#94a3b8"
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                          />
                          <YAxis stroke="#94a3b8" fontSize={11} width={32} />
                          <Tooltip
                            labelFormatter={(label: string) =>
                              formatDateOnlyUtc(`${label}T00:00:00.000Z`)
                            }
                            contentStyle={{
                              borderRadius: "10px",
                              border: "1px solid rgba(148,163,184,0.2)",
                              fontSize: "12px",
                              boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                            }}
                          />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                          />
                          <Bar dataKey="births" name="Nacimientos" fill="#4d7d66" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="deaths" name="Muertes" fill="#dc2626" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="sales" name="Ventas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                ) : null}

                {canViewAnimals ? (
                  <HerdCompositionCard categoryData={categoryChartData} sexData={sexChartData} />
                ) : null}
              </div>

              {/* ── Charts Row 2: Treatments + Inventory Gauge ── */}
              {(canViewTreatments || canViewInventory) ? (
                <div
                  {...stagger(5)}
                  className="dash-section-enter grid gap-4 xl:grid-cols-2"
                >
                  {canViewTreatments ? (
                    <ChartCard
                      title={`Aplicaciones por dia (${range})`}
                      badge={
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                          {treatmentsTotal} total
                        </span>
                      }
                    >
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={overview.treatmentsSeries}>
                            <defs>
                              <linearGradient id="treatments-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4d7d66" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4d7d66" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={formatChartDate}
                              stroke="#94a3b8"
                              tickLine={false}
                              axisLine={false}
                              fontSize={11}
                            />
                            <YAxis stroke="#94a3b8" fontSize={11} width={32} />
                            <Tooltip
                              labelFormatter={(label: string) =>
                                formatDateOnlyUtc(`${label}T00:00:00.000Z`)
                              }
                              contentStyle={{
                                borderRadius: "10px",
                                border: "1px solid rgba(148,163,184,0.2)",
                                fontSize: "12px",
                                boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              name="Aplicaciones"
                              stroke="#4d7d66"
                              strokeWidth={2}
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
                      title="Stock vs mínimo"
                      badge={
                        overview.inventoryTop.some((r) => r.minStock > 0 && r.stock < r.minStock) ? (
                          <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                            Bajo mínimo
                          </span>
                        ) : null
                      }
                    >
                      <InventoryGaugeTable data={overview.inventoryTop} />
                    </ChartCard>
                  ) : null}
                </div>
              ) : null}

              {/* ── Movements Table ── */}
              {canViewMovements ? (
                <div {...stagger(6)} className="dash-section-enter">
                  <ChartCard
                    title="Movimientos recientes"
                    headerAction={
                      <Link
                        to={withCurrentFilters("/movements")}
                        className="text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        Ver todos →
                      </Link>
                    }
                  >
                    <MovementsCompactTable
                      data={overview.movementsRecent}
                      allLink={withCurrentFilters("/movements")}
                    />
                  </ChartCard>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {overviewQuery.isLoading || overviewQuery.isError ? null : !overview ? (
        <div className="dash-card py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No se recibieron datos del dashboard.
        </div>
      ) : null}
    </div>
  );
};

export default DashboardPage;
