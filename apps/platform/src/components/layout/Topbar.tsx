import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { clearTokens, getRefreshToken } from "@/lib/auth";
import type { PlatformMe } from "@/lib/types";

export const Topbar = () => {
  const navigate = useNavigate();
  const { data: me } = useQuery({
    queryKey: ["platform", "me"],
    queryFn: async () => (await api.get("/auth/me")).data as PlatformMe,
  });

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken();
      await api.post("/auth/logout", refreshToken ? { refreshToken } : {});
    } catch {
      // ignored
    } finally {
      clearTokens();
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a1f41]/80 px-4 py-3 backdrop-blur xl:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-infra-200/70">Super Admin</p>
          <p className="font-display text-lg text-white">{me?.name ?? "Platform user"}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
        >
          Cerrar sesion
        </button>
      </div>
    </header>
  );
};
