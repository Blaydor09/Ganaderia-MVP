import { useEffect, useState } from "react";
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
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  registrationCode: z.string().min(4).optional(),
});

type FormValues = z.infer<typeof schema>;

type RegistrationStatus = {
  allowRegistration: boolean;
  requiresCode: boolean;
  mode: "open" | "protected" | "closed" | string;
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let active = true;
    api
      .get("/auth/registration-status")
      .then((response) => {
        if (!active) return;
        setStatus(response.data);
      })
      .catch(() => {
        if (!active) return;
        setStatusError("No se pudo validar el estado de registro.");
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (values: FormValues) => {
    if (status?.requiresCode && !values.registrationCode) {
      setError("registrationCode", { message: "Codigo requerido." });
      return;
    }

    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        registrationCode: values.registrationCode?.trim() || undefined,
      };
      const response = await api.post("/auth/register", payload);
      setTokens(response.data.accessToken, response.data.refreshToken);
      toast.success("Cuenta admin creada");
      navigate("/");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo crear la cuenta");
    }
  };

  const allowRegistration = status?.allowRegistration ?? false;
  const requiresCode = status?.requiresCode ?? false;

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
                Crear cuenta admin
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
            Registro inicial del sistema
          </div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Configura el acceso principal
          </h1>
          <p className="text-sm text-slate-600">
            Este formulario crea el primer usuario administrador. Luego ese
            administrador agrega el resto del equipo.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <h2 className="font-display text-xl font-semibold">Crear cuenta</h2>
          <p className="text-sm text-slate-500">
            {statusError
              ? statusError
              : "Completa los datos para iniciar el sistema."}
          </p>

          {!status && !statusError ? (
            <div className="mt-6 text-sm text-slate-500">Validando registro...</div>
          ) : null}

          {status && !allowRegistration ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              El registro inicial ya fue completado. Solicita acceso al
              administrador.
            </div>
          ) : null}

          {allowRegistration ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
              {requiresCode ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Codigo de registro
                  </label>
                  <Input placeholder="Codigo" {...register("registrationCode")} />
                  {errors.registrationCode ? (
                    <p className="text-xs text-red-500">
                      {errors.registrationCode.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Button className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear administrador"}
              </Button>
            </form>
          ) : null}

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
