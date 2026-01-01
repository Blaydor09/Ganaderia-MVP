import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PawPrint,
  ClipboardList,
  Stethoscope,
  ShieldCheck,
  Pill,
  Boxes,
  BarChart3,
  Settings,
  Users,
  AlertTriangle,
  Truck,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/animals", label: "Animales", icon: PawPrint },
  { to: "/events", label: "Eventos", icon: ClipboardList },
  { to: "/treatments", label: "Tratamientos", icon: Stethoscope },
  { to: "/withdrawals", label: "Retiros", icon: ShieldCheck },
  { to: "/products", label: "Medicamentos", icon: Pill },
  { to: "/inventory", label: "Inventario", icon: Boxes },
  { to: "/batches", label: "Lotes", icon: ClipboardList },
  { to: "/movements", label: "Movimientos", icon: Truck },
  { to: "/establishments", label: "Establecimientos", icon: MapPinned },
  { to: "/reports", label: "Reportes", icon: BarChart3 },
  { to: "/alerts", label: "Alertas", icon: AlertTriangle },
  { to: "/users", label: "Usuarios", icon: Users },
  { to: "/settings", label: "Ajustes", icon: Settings },
];

export const Sidebar = () => {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-2">
        <div className="h-10 w-10 rounded-2xl bg-brand-600 text-white grid place-items-center font-bold">
          IG
        </div>
        <div>
          <p className="text-sm text-slate-500">Inventario</p>
          <p className="font-display text-lg font-semibold">Ganaderia</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        Version demo 1.0
      </div>
    </aside>
  );
};
