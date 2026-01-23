import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const schema = z.object({
  name: z.string().min(2),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

const AcceptInvitePage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await api.post("/auth/accept-invite", {
        token,
        name: values.name.trim(),
        password: values.password,
      });
      setTokens(response.data.accessToken, response.data.refreshToken);
      toast.success("Invitacion aceptada");
      navigate("/");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo aceptar");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            <img
              src={logo}
              alt="Inventario Ganaderia"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            Invitacion no valida
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Falta el token de invitacion. Solicita un nuevo enlace.
          </p>
          <Link className="mt-4 text-sm text-brand-600 hover:underline" to="/login">
            Volver al inicio de sesion
          </Link>
        </div>
      </div>
    );
  }

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
                Activar acceso
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
            Invitacion de organizacion
          </div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Completa tu perfil
          </h1>
          <p className="text-sm text-slate-600">
            Define tu nombre y clave para entrar al dashboard.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <h2 className="font-display text-xl font-semibold">Aceptar invitacion</h2>
          <p className="text-sm text-slate-500">
            Crea tu acceso con los datos solicitados.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nombre</label>
              <Input placeholder="Tu nombre" {...register("name")} />
              {errors.name ? (
                <p className="text-xs text-red-500">{errors.name.message}</p>
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
              {isSubmitting ? "Confirmando..." : "Aceptar invitacion"}
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

export default AcceptInvitePage;
