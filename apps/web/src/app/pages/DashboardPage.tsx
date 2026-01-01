import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Link } from "react-router-dom";

const DashboardPage = () => {
  const { data: animalsData } = useQuery({
    queryKey: ["animals", "summary"],
    queryFn: async () => (await api.get("/animals?page=1&pageSize=200")).data,
  });

  const { data: withdrawalsData } = useQuery({
    queryKey: ["reports", "withdrawals"],
    queryFn: async () => (await api.get("/reports/withdrawals-active")).data,
  });

  const { data: inventoryAlerts } = useQuery({
    queryKey: ["inventory", "alerts"],
    queryFn: async () => (await api.get("/inventory/alerts")).data,
  });

  const { data: movementsData } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => (await api.get("/movements?page=1&pageSize=6")).data,
  });

  const { data: treatmentsData } = useQuery({
    queryKey: ["treatments", "recent"],
    queryFn: async () => (await api.get("/treatments?page=1&pageSize=50")).data,
  });

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      TERNERO: 0,
      VAQUILLA: 0,
      VACA: 0,
      TORO: 0,
      NOVILLO: 0,
    };
    for (const animal of animalsData?.items ?? []) {
      counts[animal.category] = (counts[animal.category] ?? 0) + 1;
    }
    return counts;
  }, [animalsData]);

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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return (treatmentsData?.items ?? []).filter(
      (t: any) => new Date(t.startedAt) >= cutoff
    ).length;
  }, [treatmentsData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard operativo"
        subtitle="KPI diarios de animales, salud e inventario"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/animals">Registrar animal</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/treatments">Registrar tratamiento</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/batches">Agregar lote</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/withdrawals">Ver retiros activos</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Animales activos</p>
            <p className="font-display text-2xl font-semibold">
              {animalsData?.total ?? 0}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(categoryCounts).map(([key, value]) => (
              <Badge key={key}>{key}: {value}</Badge>
            ))}
          </CardContent>
        </Card>
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
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Alertas de inventario</p>
            <p className="font-display text-2xl font-semibold">
              {(inventoryAlerts?.expiring?.length ?? 0) + (inventoryAlerts?.lowStock?.length ?? 0)}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Vencimientos proximos y stock minimo.
            </p>
          </CardContent>
        </Card>
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
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Tratamientos 7 dias</p>
            <p className="font-display text-2xl font-semibold">{treatmentsLast7}</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Actividad sanitaria reciente.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
        <Card>
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
      </div>
    </div>
  );
};

export default DashboardPage;
