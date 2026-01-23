import { Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Button } from "@/components/ui/button";
import { clearTokens } from "@/lib/auth";
import { useMe } from "@/lib/me";

export const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useMe();
  const showGlobalSearch = location.pathname !== "/animals";

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  const name = me?.name ?? "Usuario";
  const orgName = me?.organization?.name ?? "Organizacion";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "US";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        {showGlobalSearch ? (
          <>
            <GlobalSearch />
            <span className="hidden text-xs text-slate-500 md:block">
              Acceso rapido con / o Ctrl+K
            </span>
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs text-white">
            {initials}
          </span>
          <div className="leading-tight">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              {orgName}
            </div>
            <div className="text-slate-700">{name}</div>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Cerrar sesion
        </Button>
      </div>
    </div>
  );
};
