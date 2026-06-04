import { Building2, FileClock, Gauge, LifeBuoy, Settings2, X } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/tenants", label: "Tenants", icon: Building2 },
  { to: "/plans", label: "Planes y limites", icon: Settings2 },
  { to: "/audit", label: "Auditoria global", icon: FileClock },
  { to: "/support", label: "Soporte", icon: LifeBuoy },
];

export const Sidebar = ({
  isOpenMobile = false,
  onCloseMobile,
}: {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}) => (
  <>
    {/* Mobile drawer backdrop */}
    <div
      className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
        isOpenMobile ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onCloseMobile}
    />

    <aside
      className={`fixed bottom-0 top-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#081936]/95 p-5 transition-transform duration-300 ease-in-out lg:pointer-events-auto lg:static lg:z-auto lg:h-screen lg:translate-x-0 ${
        isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Mobile close button */}
      <button
        type="button"
        onClick={onCloseMobile}
        className="absolute right-4 top-4 rounded-md p-1.5 text-infra-200 hover:bg-white/10 hover:text-white lg:hidden"
        title="Cerrar menú"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-infra-200/80">Inventario Ganaderia</p>
        <p className="mt-1 font-display text-xl font-semibold text-white">Platform Console</p>
        <span className="platform-chip mt-3">Multi-tenant SaaS</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-infra-500 text-white"
                    : "text-infra-100/85 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <p className="text-xs text-infra-200/70">Scope: /api/v1/platform</p>
    </aside>
  </>
);
