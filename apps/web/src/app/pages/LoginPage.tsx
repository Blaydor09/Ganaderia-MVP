import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await api.post("/auth/login", values);
      setTokens(response.data.accessToken, response.data.refreshToken);
      toast.success("Sesion iniciada");
      navigate("/");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error de autenticacion");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 gap-8 px-6 lg:grid-cols-2 lg:items-center">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
              <img
                src={logo}
                alt="Inventario Ganaderia"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Inventario Ganaderia
              </p>
              <p className="font-display text-lg font-semibold text-slate-900">
                Plataforma ganadera
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
            Plataforma sanitaria y de inventario
          </div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Inventario ganadero con trazabilidad sanitaria
          </h1>
          <p className="text-sm text-slate-600">
            Controla animales, tratamientos y medicamentos por lote con retiros
            automaticos y auditoria.
          </p>
          <div className="grid gap-3 text-xs text-slate-500">
            <span>Usuario demo: admin@demo.com</span>
            <span>Clave demo: admin123</span>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <h2 className="font-display text-xl font-semibold">Iniciar sesion</h2>
          <p className="text-sm text-slate-500">Accede al dashboard operativo.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Email</label>
              <Input placeholder="admin@demo.com" {...register("email")} />
              {errors.email ? (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Clave</label>
              <Input type="password" placeholder="******" {...register("password")} />
              {errors.password ? (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              ) : null}
            </div>
            <Button className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>No tienes cuenta?</span>
            <Link className="text-brand-600 hover:underline" to="/register">
              Crear admin
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Conoce la plataforma antes de entrar.</span>
            <Link className="text-brand-600 hover:underline" to="/landing">
              Ver landing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
