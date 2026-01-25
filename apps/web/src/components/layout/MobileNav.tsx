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
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-2 lg:hidden dark:border-slate-800 dark:bg-slate-950">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 text-xs",
                isActive
                  ? "text-brand-600 dark:text-brand-300"
                  : "text-slate-500 dark:text-slate-400"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
};
