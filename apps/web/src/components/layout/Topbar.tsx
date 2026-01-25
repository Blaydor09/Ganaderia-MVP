import { Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { clearTokens } from "@/lib/auth";

export const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showGlobalSearch = location.pathname !== "/animals";

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-3">
        {showGlobalSearch ? (
          <>
            <GlobalSearch />
            <span className="hidden text-xs text-slate-500 dark:text-slate-400 md:block">
              Acceso rapido con / o Ctrl+K
            </span>
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <Bell className="h-4 w-4" />
        </button>
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs text-white">
            AD
          </span>
          <span className="text-slate-700 dark:text-slate-200">Admin</span>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Cerrar sesion
        </Button>
      </div>
    </div>
  );
};
