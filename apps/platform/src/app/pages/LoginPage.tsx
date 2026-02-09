import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email: email.trim(), password });
      setTokens(response.data.accessToken, response.data.refreshToken);
      toast.success("Acceso de plataforma concedido");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No fue posible iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6">
      <div className="platform-panel mx-auto w-full max-w-md p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-infra-200/80">Inventario Ganaderia</p>
        <h1 className="mt-2 font-display text-3xl text-white">Platform Console</h1>
        <p className="mt-2 text-sm text-infra-100/80">
          Ingreso exclusivo para `platform_super_admin` y `platform_support`.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-infra-100/80">Email</label>
            <input
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-infra-400 focus:ring"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@saas.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-infra-100/80">Clave</label>
            <input
              type="password"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-infra-400 focus:ring"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-infra-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-infra-300 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar a plataforma"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
