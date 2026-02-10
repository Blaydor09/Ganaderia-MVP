import { Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import api from "@/lib/api";
import { clearTokens, getRefreshToken } from "@/lib/auth";
import type { AuthMeResponse } from "@/lib/types";

const getInitials = (name?: string) => {
  if (!name) return "IG";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return parts.join("") || "IG";
};

export const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showGlobalSearch = ![
    "/animals/new",
    "/animals/quick",
    "/animals/import",
  ].includes(location.pathname);

  const { data: me } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => (await api.get("/auth/me")).data as AuthMeResponse,
  });

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken();
      await api.post("/auth/logout", refreshToken ? { refreshToken } : {});
    } catch {
      // continue local logout even if server-side revocation fails
    } finally {
      clearTokens();
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-950/65">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[16rem] items-center gap-3">
          {showGlobalSearch ? (
            <>
              <GlobalSearch />
              <span className="hidden text-xs text-slate-500 md:block dark:text-slate-400">
                Acceso rapido: <kbd>/</kbd> o <kbd>Ctrl+K</kbd>
              </span>
            </>
          ) : (
            <Badge className="border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Modo formulario
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4" />
          </button>

          <ThemeToggle />

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm lg:flex dark:border-slate-700 dark:bg-slate-900">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs text-white">
              {getInitials(me?.name)}
            </span>
            <div className="leading-tight">
              <p className="font-medium text-slate-700 dark:text-slate-200">
                {me?.name ?? "Usuario"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {me?.tenant?.name ?? "Cuenta"}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            Cerrar sesion
          </Button>
        </div>
      </div>
    </header>
  );
};
