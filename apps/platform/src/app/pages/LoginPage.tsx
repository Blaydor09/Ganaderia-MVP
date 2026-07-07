import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { setAccessToken } from "@/lib/auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [enrollmentToken, setEnrollmentToken] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (enrollmentToken) {
        const response = await api.post("/auth/mfa/confirm", {
          enrollmentToken,
          code: mfaCode.trim(),
        });
        setAccessToken(response.data.accessToken);
        toast.success("MFA activado y acceso concedido");
        navigate("/dashboard", { replace: true });
        return;
      }

      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
        mfaCode: mfaCode.trim() || undefined,
      });
      if (response.data.mfaEnrollmentRequired) {
        const setup = await api.post("/auth/mfa/setup", {
          enrollmentToken: response.data.enrollmentToken,
        });
        setEnrollmentToken(response.data.enrollmentToken);
        setMfaSecret(setup.data.secret);
        setMfaCode("");
        toast.info("Configura MFA para continuar");
        return;
      }
      setAccessToken(response.data.accessToken);
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
          {mfaSecret && (
            <div className="rounded-xl border border-infra-400/40 bg-infra-400/10 p-3 text-xs text-infra-100">
              <p className="font-semibold">Configura este secreto en tu app autenticadora:</p>
              <code className="mt-2 block break-all select-all text-white">{mfaSecret}</code>
              <p className="mt-2 text-infra-100/70">Luego ingresa el código de 6 dígitos para confirmar.</p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-infra-100/80">
              Código MFA {enrollmentToken ? "" : "(si está activado)"}
            </label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-infra-400 focus:ring"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required={Boolean(enrollmentToken)}
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
            {loading
              ? "Verificando..."
              : enrollmentToken
                ? "Activar MFA y entrar"
                : "Entrar a plataforma"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
