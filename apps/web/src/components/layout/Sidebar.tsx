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
  Lock,
} from "lucide-react";
import logo from "@/assets/logo_system.png";
import { Access } from "@/lib/access";
import { hasAnyRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: Access.dashboard },
  { to: "/animals", label: "Animales", icon: PawPrint, roles: Access.animals },
  { to: "/establishments", label: "Establecimientos", icon: MapPinned, roles: Access.establishments },
  { to: "/products", label: "Medicamentos", icon: Pill, roles: Access.products },
  { to: "/treatments", label: "Tratamientos", icon: Stethoscope, roles: Access.treatments },
  { to: "/batches", label: "Lotes", icon: ClipboardList, roles: Access.batches },
  { to: "/inventory", label: "Inventario", icon: Boxes, roles: Access.inventory },
  { to: "/movements", label: "Movimientos", icon: Truck, roles: Access.movements },
  { to: "/reports", label: "Reportes", icon: BarChart3, roles: Access.reports },
  { to: "/alerts", label: "Alertas", icon: AlertTriangle, roles: Access.alerts },
  { to: "/events", label: "Eventos", icon: ClipboardList, roles: Access.events },
  { to: "/users", label: "Usuarios", icon: Users, roles: Access.users },
  { to: "/settings", label: "Ajustes", icon: Settings, roles: Access.settings },
];

export const Sidebar = ({ isLocked = true, onUnlock }: { isLocked?: boolean; onUnlock?: () => void }) => {
  const visibleItems = navItems.filter((item) => hasAnyRole(item.roles));

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen flex-col border-slate-200 bg-white/80 backdrop-blur-sm transition-all duration-500 ease-in-out lg:flex dark:border-slate-800 dark:bg-slate-950/80",
        isLocked ? "w-72 border-r opacity-100" : "w-0 border-r-0 opacity-0"
      )}
    >
      <div className="flex h-full w-72 flex-col overflow-hidden px-4 py-5">
        <div className="mb-5 relative surface-muted p-3">
          <button
            onClick={onUnlock}
            className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="Desbloquear y ocultar menú"
          >
            <Lock className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700">
              <img src={logo} alt="Inventario Ganaderia" className="h-full w-full object-contain" />
            </div>
            <div className="pr-6">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Inventario Ganaderia
              </p>
              <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
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
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="surface-muted whitespace-nowrap p-3 text-xs text-slate-500 dark:text-slate-400">
          Version operativa 1.1
        </div>
      </div>
    </aside>
  );
};
