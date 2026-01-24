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
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import logo from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: Access.dashboard },
  { to: "/animals", label: "Animales", icon: PawPrint, roles: Access.animals },
  { to: "/events", label: "Eventos", icon: ClipboardList, roles: Access.events },
  { to: "/treatments", label: "Tratamientos", icon: Stethoscope, roles: Access.treatments },
  { to: "/withdrawals", label: "Retiros", icon: ShieldCheck, roles: Access.withdrawals },
  { to: "/products", label: "Medicamentos", icon: Pill, roles: Access.products },
  { to: "/inventory", label: "Inventario", icon: Boxes, roles: Access.inventory },
  { to: "/batches", label: "Lotes", icon: ClipboardList, roles: Access.batches },
  { to: "/movements", label: "Movimientos", icon: Truck, roles: Access.movements },
  { to: "/establishments", label: "Establecimientos", icon: MapPinned, roles: Access.establishments },
  { to: "/reports", label: "Reportes", icon: BarChart3, roles: Access.reports },
  { to: "/alerts", label: "Alertas", icon: AlertTriangle, roles: Access.alerts },
  { to: "/users", label: "Usuarios", icon: Users, roles: Access.users },
  { to: "/settings", label: "Ajustes", icon: Settings, roles: Access.settings },
];

export const Sidebar = () => {
  const visibleItems = navItems.filter((item) => hasAnyRole(item.roles));

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
          <img
            src={logo}
            alt="Inventario Ganaderia"
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <p className="text-sm text-slate-500">Inventario</p>
          <p className="font-display text-lg font-semibold">Ganaderia</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {visibleItems.map((item) => {
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
        Version demo 1.0.2
      </div>
    </aside>
  );
};
