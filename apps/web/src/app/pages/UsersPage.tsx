import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  roles: z.array(z.string()).min(1, "Selecciona al menos un rol"),
});

type FormValues = z.infer<typeof schema>;

const UsersPage = () => {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data,
  });
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get("/users/roles")).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { roles: [] },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/users", {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        roles: values.roles,
      });
      toast.success("Usuario creado");
      reset();
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo crear el usuario");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="RBAC y gestion de accesos" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Crear usuario
            </h3>
            <p className="text-sm text-slate-500">
              Alta directa con contraseña temporal.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Nombre</label>
                <Input placeholder="Nombre" {...register("name")} />
                {errors.name ? (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Email</label>
                <Input placeholder="correo@empresa.com" {...register("email")} />
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
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Roles</label>
                <div className="grid gap-2 text-sm text-slate-600">
                  {(roles ?? []).map((role: any) => (
                    <label key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value={role.name}
                        {...register("roles")}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
                {errors.roles ? (
                  <p className="text-xs text-red-500">{errors.roles.message}</p>
                ) : null}
              </div>
              <Button disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creando..." : "Crear usuario"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Invitar por link
            </h3>
            <p className="text-sm text-slate-500">Proximamente...</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Esta funcion estara disponible en la siguiente fase.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Email</TH>
              <TH>Roles</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {(data ?? []).map((user: any) => (
              <TR key={user.id}>
                <TD>{user.name}</TD>
                <TD>{user.email}</TD>
                <TD>{(user.roles ?? []).join(", ")}</TD>
                <TD>{user.isActive ? "Activo" : "Inactivo"}</TD>
              </TR>
            ))}
            {(data ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500">
                  Sin usuarios registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default UsersPage;
