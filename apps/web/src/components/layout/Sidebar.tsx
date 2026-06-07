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
  X,
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
  { to: "/inventory", label: "Inventario", icon: Boxes, roles: Access.inventory },
  { to: "/movements", label: "Movimientos", icon: Truck, roles: Access.movements },
  { to: "/reports", label: "Reportes", icon: BarChart3, roles: Access.reports },
  { to: "/alerts", label: "Alertas", icon: AlertTriangle, roles: Access.alerts },
  { to: "/events", label: "Eventos", icon: ClipboardList, roles: Access.events },
  { to: "/users", label: "Usuarios", icon: Users, roles: Access.users },
  { to: "/settings", label: "Ajustes", icon: Settings, roles: Access.settings },
];

export const Sidebar = ({
  isLocked = true,
  onUnlock,
  isOpenMobile = false,
  onCloseMobile,
}: {
  isLocked?: boolean;
  onUnlock?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}) => {
  const visibleItems = navItems.filter((item) => hasAnyRole(item.roles));

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpenMobile ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          // Base mobile layout as a slide-over drawer
          "fixed bottom-0 top-0 left-0 z-50 flex w-72 flex-col bg-white/90 backdrop-blur-sm transition-transform duration-300 ease-in-out lg:pointer-events-auto lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 dark:bg-slate-950/90",
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop behavior based on locked state
          isLocked
            ? "lg:w-72 lg:border-r lg:opacity-100"
            : "lg:w-0 lg:border-r-0 lg:opacity-0 lg:overflow-hidden lg:pointer-events-none"
        )}
      >
        <div className="flex h-full w-72 flex-col overflow-hidden px-4 py-5">
          <div className="mb-5 relative surface-muted p-3">
            {/* Desktop Unlock Button */}
            <button
              onClick={onUnlock}
              className="absolute right-3 top-3 hidden lg:block rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title="Desbloquear y ocultar menú"
            >
              <Lock className="h-4 w-4" />
            </button>
            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="absolute right-3 top-3 lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title="Cerrar menú"
            >
              <X className="h-4 w-4" />
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
                  onClick={onCloseMobile}
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
    </>
  );
};
