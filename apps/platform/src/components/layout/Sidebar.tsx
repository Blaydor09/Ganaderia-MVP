import { Building2, FileClock, Gauge, LifeBuoy, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/tenants", label: "Tenants", icon: Building2 },
  { to: "/plans", label: "Planes y limites", icon: Settings2 },
  { to: "/audit", label: "Auditoria global", icon: FileClock },
  { to: "/support", label: "Soporte", icon: LifeBuoy },
];

export const Sidebar = () => (
  <aside className="hidden w-72 border-r border-white/10 bg-[#081936]/90 p-5 lg:flex lg:flex-col">
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
);
