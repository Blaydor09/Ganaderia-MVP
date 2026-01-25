import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { establishmentTypeOptions } from "@/lib/establishments";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";

const schema = z
  .object({
    name: z.string().min(1, "Requerido"),
    type: z.enum(["FINCA", "POTRERO", "CORRAL"]),
    parentId: z.string().uuid().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type !== "FINCA" && !values.parentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentId"],
        message: "Selecciona una finca",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const EstablishmentsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["establishments", "tree"],
    queryFn: async () =>
      (await api.get("/establishments?tree=true&includeCounts=true")).data,
  });

  const fincas = (data ?? []) as any[];
  const fincaOptions = useMemo(
    () => fincas.map((finca) => ({ value: finca.id, label: finca.name })),
    [fincas]
  );
  const canManage = hasAnyRole(Access.establishmentsCreate);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "FINCA" },
  });

  const selectedType = watch("type");

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/establishments", {
        name: values.name.trim(),
        type: values.type,
        parentId: values.type === "FINCA" ? undefined : values.parentId,
      });
      toast.success("Establecimiento creado");
      reset({ type: "FINCA" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["establishments", "tree"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear establecimiento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Establecimientos"
        subtitle="Fincas, potreros y corral principal"
        actions={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Nuevo establecimiento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo establecimiento</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Nombre</label>
                    <Input placeholder="Ej: Potrero Norte" {...register("name")} />
                    {errors.name ? (
                      <p className="text-xs text-red-500">{errors.name.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Tipo</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      {...register("type")}
                    >
                      {establishmentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedType !== "FINCA" ? (
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Finca</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register("parentId")}
                      >
                        <option value="">Selecciona</option>
                        {fincaOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.parentId ? (
                        <p className="text-xs text-red-500">{errors.parentId.message}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Crear"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="text-sm text-slate-500 dark:text-slate-400">Cargando establecimientos...</CardContent>
        </Card>
      ) : fincas.length ? (
        <div className="space-y-4">
          {fincas.map((finca) => {
            const children = finca.children ?? [];
            const corral = children.find((child: any) => child.type === "CORRAL");
            const potreros = children.filter((child: any) => child.type === "POTRERO");

            return (
              <Card key={finca.id}>
                <CardHeader>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Finca</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{finca.name}</h3>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Animales: {finca.animalCount ?? 0}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Corral</p>
                      {corral ? (
                        <div className="flex items-center justify-between text-sm">
                          <span>{corral.name}</span>
                          <span className="text-xs text-slate-400">
                            Animales: {corral.animalCount ?? 0}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Sin corral registrado.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Potreros</p>
                      {potreros.length ? (
                        potreros.map((potrero: any) => (
                          <div key={potrero.id} className="flex items-center justify-between text-sm">
                            <span>{potrero.name}</span>
                            <span className="text-xs text-slate-400">
                              Animales: {potrero.animalCount ?? 0}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Sin potreros registrados.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-sm text-slate-500 dark:text-slate-400">
            Sin establecimientos registrados.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EstablishmentsPage;
