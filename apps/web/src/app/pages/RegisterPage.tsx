import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const schema = z.object({
  organizationName: z.string().min(2),
  organizationSlug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

const RegisterPage = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        organizationName: values.organizationName.trim(),
        name: values.name.trim(),
        email: values.email.trim(),
        organizationSlug: values.organizationSlug?.trim() || undefined,
      };
      const response = await api.post("/auth/register", payload);
      setTokens(response.data.accessToken, response.data.refreshToken);
      toast.success("Organizacion creada");
      navigate("/");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo crear la cuenta");
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
                Crea tu organizacion
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
            Onboarding rapido en minutos
          </div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Inicia tu SaaS ganadero
          </h1>
          <p className="text-sm text-slate-600">
            Configura tu organizacion y agrega el primer usuario administrador.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <h2 className="font-display text-xl font-semibold">Crear cuenta</h2>
          <p className="text-sm text-slate-500">
            Completa los datos para comenzar.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Nombre de la organizacion
              </label>
              <Input placeholder="Finca Los Robles" {...register("organizationName")} />
              {errors.organizationName ? (
                <p className="text-xs text-red-500">
                  {errors.organizationName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Slug</label>
              <Input placeholder="finca-los-robles" {...register("organizationSlug")} />
              <p className="text-[11px] text-slate-400">
                Solo minusculas y guiones. Opcional.
              </p>
              {errors.organizationSlug ? (
                <p className="text-xs text-red-500">
                  {errors.organizationSlug.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nombre</label>
              <Input placeholder="Administrador" {...register("name")} />
              {errors.name ? (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Email</label>
              <Input placeholder="admin@tuempresa.com" {...register("email")} />
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
              {isSubmitting ? "Creando..." : "Crear organizacion"}
            </Button>
          </form>
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>Ya tienes cuenta?</span>
            <Link className="text-brand-600 hover:underline" to="/login">
              Iniciar sesion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
