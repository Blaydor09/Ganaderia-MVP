import { NavLink } from "react-router-dom";
import { LayoutDashboard, PawPrint, Stethoscope, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/animals", label: "Animales", icon: PawPrint },
  { to: "/treatments", label: "Salud", icon: Stethoscope },
  { to: "/inventory", label: "Stock", icon: Boxes },
];

export const MobileNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-2 lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 text-xs",
                isActive ? "text-brand-600" : "text-slate-500"
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
