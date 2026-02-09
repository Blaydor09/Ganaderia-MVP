import { NavLink } from "react-router-dom";
import { LayoutDashboard, PawPrint, Stethoscope, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const items = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, roles: Access.dashboard },
  { to: "/animals", label: "Animales", icon: PawPrint, roles: Access.animals },
  { to: "/treatments", label: "Salud", icon: Stethoscope, roles: Access.treatments },
  { to: "/inventory", label: "Stock", icon: Boxes, roles: Access.inventory },
];

export const MobileNav = () => {
  const visibleItems = items.filter((item) => hasAnyRole(item.roles));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/85 px-2 py-2 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-xl items-center justify-around gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition",
                  isActive
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                    : "text-slate-500 dark:text-slate-400"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
