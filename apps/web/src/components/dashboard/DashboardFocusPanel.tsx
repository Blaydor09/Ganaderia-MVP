import { AlertTriangle, ArrowRight, ClipboardList, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DashboardFocusPanelProps = {
  inventoryAlerts?: {
    value: number;
    expiring: number;
    lowStock: number;
  };
  withdrawalsActive?: number;
  inventoryLink?: string;
  withdrawalsLink?: string;
};

export const DashboardFocusPanel = ({
  inventoryAlerts,
  withdrawalsActive,
  inventoryLink,
  withdrawalsLink,
}: DashboardFocusPanelProps) => {
  const totalFocus = (inventoryAlerts?.value ?? 0) + (withdrawalsActive ?? 0);
  const focusRows = [
    inventoryAlerts
      ? {
          label: "Alertas de inventario",
          value: inventoryAlerts.value,
          helper: `${inventoryAlerts.expiring} proximas a vencer | ${inventoryAlerts.lowStock} bajo minimo`,
          icon: <AlertTriangle className="h-4 w-4" />,
        }
      : null,
    typeof withdrawalsActive === "number"
      ? {
          label: "Retiros activos",
          value: withdrawalsActive,
          helper: "Animales con restriccion vigente por retiro o tratamiento.",
          icon: <ClipboardList className="h-4 w-4" />,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: number; helper: string; icon: JSX.Element }>;

  return (
    <Card className="overflow-hidden border-slate-900 bg-slate-950 text-white dark:border-slate-700">
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400" />
      <CardContent className="space-y-5 p-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Focos de atencion</p>
          <h2 className="font-display text-2xl font-semibold text-white">Riesgos y prioridades</h2>
          <p className="text-sm text-slate-300">
            Usa este panel para resolver primero lo que puede afectar inventario, trazabilidad o cumplimiento.
          </p>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total priorizado</p>
              <p className="mt-2 font-display text-4xl font-semibold text-white">{totalFocus}</p>
            </div>
            <Badge variant={totalFocus > 0 ? "warning" : "success"}>
              {totalFocus > 0 ? "Revisar hoy" : "Controlado"}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {focusRows.map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-slate-200">
                    {row.icon}
                  </span>
                  <div>
                    <p className="font-medium text-white">{row.label}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-300">{row.helper}</p>
                  </div>
                </div>
                <p className="font-display text-2xl font-semibold text-white">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-300" />
            <p>
              {totalFocus > 0
                ? "Prioriza inventario critico y retiros activos antes de revisar actividad historica."
                : "No hay riesgos visibles en este corte. Puedes enfocarte en tendencias y seguimiento."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {inventoryLink ? (
            <Button asChild variant="secondary" className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
              <Link to={inventoryLink}>
                Ver inventario
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          {withdrawalsLink ? (
            <Button asChild variant="ghost" className="rounded-2xl border border-white/12 text-white hover:bg-white/10 hover:text-white">
              <Link to={withdrawalsLink}>Ver retiros</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};