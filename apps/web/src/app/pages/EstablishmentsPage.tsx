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
import type { EstablishmentNode, LegacyCorralSummary } from "@/lib/types";

const schema = z
  .object({
    name: z.string().min(1, "Requerido"),
    type: z.enum(["FINCA", "POTRERO"]),
    parentId: z.string().uuid().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "POTRERO" && !values.parentId) {
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
  const [legacyTargets, setLegacyTargets] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({
    queryKey: ["establishments", "tree"],
    queryFn: async () =>
      (await api.get("/establishments?tree=true&includeCounts=true")).data as EstablishmentNode[],
  });
  const { data: legacyCorrals = [] } = useQuery({
    queryKey: ["establishments", "legacy-summary"],
    queryFn: async () =>
      (await api.get("/establishments/legacy-summary")).data as LegacyCorralSummary[],
  });

  const fincas = (data ?? []) as EstablishmentNode[];
  const fincaOptions = useMemo(
    () => fincas.map((finca) => ({ value: finca.id, label: finca.name })),
    [fincas]
  );
  const legacyCorralsByFinca = useMemo(() => {
    const map = new Map<string, LegacyCorralSummary[]>();
    for (const corral of legacyCorrals) {
      if (!corral.fincaId) continue;
      const current = map.get(corral.fincaId) ?? [];
      current.push(corral);
      map.set(corral.fincaId, current);
    }
    return map;
  }, [legacyCorrals]);
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
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear establecimiento");
    }
  };

  const migrateLegacyAnimals = async (legacyCorral: LegacyCorralSummary) => {
    const destinationId = legacyTargets[legacyCorral.id] ?? legacyCorral.suggestedPotreros[0]?.id;

    if (!destinationId) {
      toast.error("Selecciona un potrero destino");
      return;
    }

    try {
      const response = await api.post(
        `/establishments/legacy-corrals/${legacyCorral.id}/migrate-animals`,
        { destinationId }
      );
      const movedAnimals = response.data.movedAnimals ?? 0;
      toast.success(
        movedAnimals > 0
          ? `Se migraron ${movedAnimals} animales al potrero seleccionado.`
          : "El corral legado ya no tenia animales activos."
      );
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al migrar animales del corral legado");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Establecimientos"
        subtitle="Fincas y potreros"
        actions={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Nueva finca o potrero</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva finca o potrero</DialogTitle>
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
                  {selectedType === "POTRERO" ? (
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

      {legacyCorrals.length ? (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10">
          <CardHeader>
            <p className="text-xs text-amber-700 dark:text-amber-200">Transicion</p>
            <h3 className="font-display text-lg font-semibold text-amber-950 dark:text-amber-50">
              Corrales legados fuera de operacion
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
              Los corrales ya no se pueden crear ni asignar en registros nuevos. Solo permanecen
              para compatibilidad historica mientras migras sus animales activos a un potrero.
            </p>
            <div className="space-y-3">
              {legacyCorrals.map((corral) => (
                <div
                  key={corral.id}
                  className="rounded-2xl border border-amber-200 bg-white/80 p-4 dark:border-amber-500/30 dark:bg-slate-950/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {corral.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Finca: {corral.fincaName}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Animales activos: {corral.animalCount}
                    </span>
                  </div>

                  {canManage ? (
                    corral.suggestedPotreros.length ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                        <select
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          value={legacyTargets[corral.id] ?? corral.suggestedPotreros[0]?.id ?? ""}
                          onChange={(event) =>
                            setLegacyTargets((prev) => ({
                              ...prev,
                              [corral.id]: event.target.value,
                            }))
                          }
                        >
                          {corral.suggestedPotreros.map((potrero) => (
                            <option key={potrero.id} value={potrero.id}>
                              {potrero.name} · Animales: {potrero.animalCount}
                            </option>
                          ))}
                        </select>
                        <Button type="button" onClick={() => migrateLegacyAnimals(corral)}>
                          Migrar animales
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-amber-900/80 dark:text-amber-100/80">
                        Esta finca todavia no tiene potreros disponibles. Crea uno antes de migrar.
                      </p>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="text-sm text-slate-500 dark:text-slate-400">
            Cargando establecimientos...
          </CardContent>
        </Card>
      ) : fincas.length ? (
        <div className="space-y-4">
          {fincas.map((finca) => {
            const potreros = (finca.children ?? []).filter((child) => child.type === "POTRERO");
            const legacyForFinca = legacyCorralsByFinca.get(finca.id) ?? [];
            const totalAnimals =
              potreros.reduce((sum, potrero) => sum + (potrero.animalCount ?? 0), 0) +
              legacyForFinca.reduce((sum, corral) => sum + corral.animalCount, 0);
            const legacyAnimals = legacyForFinca.reduce(
              (sum, corral) => sum + corral.animalCount,
              0
            );

            return (
              <Card key={finca.id}>
                <CardHeader>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Finca</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{finca.name}</h3>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Animales activos: {totalAnimals}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {legacyForFinca.length ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                      Corrales legados pendientes: {legacyForFinca.length}. Animales sin migrar:{" "}
                      {legacyAnimals}.
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Potreros</p>
                    {potreros.length ? (
                      potreros.map((potrero) => (
                        <div key={potrero.id} className="flex items-center justify-between text-sm">
                          <span>{potrero.name}</span>
                          <span className="text-xs text-slate-400">
                            Animales: {potrero.animalCount ?? 0}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Sin potreros registrados.
                      </p>
                    )}
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

