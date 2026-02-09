import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  PawPrint,
  Pill,
  Settings,
  Stethoscope,
  Truck,
  Users,
} from "lucide-react";
import logo from "@/assets/logo_system.png";
import { Access } from "@/lib/access";
import { hasAnyRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: Access.dashboard },
  { to: "/animals", label: "Animales", icon: PawPrint, roles: Access.animals },
  { to: "/events", label: "Eventos", icon: ClipboardList, roles: Access.events },
  { to: "/treatments", label: "Tratamientos", icon: Stethoscope, roles: Access.treatments },
  { to: "/products", label: "Medicamentos", icon: Pill, roles: Access.products },
  { to: "/batches", label: "Lotes", icon: ClipboardList, roles: Access.batches },
  { to: "/inventory", label: "Inventario", icon: Boxes, roles: Access.inventory },
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
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white/80 px-4 py-5 backdrop-blur-sm lg:flex dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mb-5 surface-muted p-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700">
            <img src={logo} alt="Inventario Ganaderia" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Inventario Ganaderia
            </p>
            <p className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Operacion sanitaria
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="surface-muted p-3 text-xs text-slate-500 dark:text-slate-400">
        Version operativa 1.1
      </div>
    </aside>
  );
};
