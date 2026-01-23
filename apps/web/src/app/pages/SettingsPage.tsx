import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Requerido"),
});

type FormValues = z.infer<typeof schema>;

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const { data: organization } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => (await api.get("/organizations/me")).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (organization?.name) {
      reset({ name: organization.name });
    }
  }, [organization, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await api.patch("/organizations/me", { name: values.name.trim() });
      toast.success("Organizacion actualizada");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo actualizar");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" subtitle="Configuracion general del sistema" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Mi organizacion</h3>
            <p className="text-sm text-slate-500">
              Administra el nombre publico y el estado del equipo.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500">Nombre</label>
                <Input placeholder="Mi organizacion" {...register("name")} />
                {errors.name ? (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                ) : null}
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Slug
                  </span>
                  <div className="font-medium text-slate-800">
                    {organization?.slug ?? "-"}
                  </div>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Miembros activos
                  </span>
                  <div className="font-medium text-slate-800">
                    {organization?.membersCount ?? 0}
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? "Guardando..." : "Guardar cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-900">Mi equipo</h3>
            <p className="text-sm text-slate-500">
              Gestiona usuarios, roles e invitaciones desde la seccion de usuarios.
            </p>
          </CardHeader>
          <CardContent>
            <Link
              className="inline-flex text-sm font-medium text-brand-600 hover:underline"
              to="/users"
            >
              Ver usuarios
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
