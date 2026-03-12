import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
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
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import type { EstablishmentNode, LegacyCorralSummary } from "@/lib/types";

const createSchema = z
  .object({
    name: z.string().trim().min(1, "Requerido"),
    potreros: z.array(z.object({ name: z.string() })).min(1, "Agrega al menos un potrero"),
  })
  .superRefine((values, ctx) => {
    if (!values.potreros.some((potrero) => potrero.name.trim().length > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["potreros"],
        message: "Agrega al menos un potrero",
      });
    }
  });

const editSchema = z.object({
  name: z.string().trim().min(1, "Requerido"),
  potreros: z.array(z.object({ name: z.string() })),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const createDefaultValues: CreateFormValues = {
  name: "",
  potreros: [{ name: "" }],
};

const editDefaultValues: EditFormValues = {
  name: "",
  potreros: [{ name: "" }],
};

const getPotreroNodes = (finca?: EstablishmentNode | null) =>
  (finca?.children ?? []).filter((child) => child.type === "POTRERO");

const EstablishmentsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFinca, setEditingFinca] = useState<EstablishmentNode | null>(null);
  const [deletingFincaId, setDeletingFincaId] = useState<string | null>(null);
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
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: createDefaultValues,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "potreros",
  });

  const {
    control: editControl,
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditingSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: editDefaultValues,
  });
  const {
    fields: editFields,
    append: appendEdit,
    remove: removeEdit,
  } = useFieldArray({
    control: editControl,
    name: "potreros",
  });

  const invalidateEstablishmentQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["establishments"] }),
      queryClient.invalidateQueries({ queryKey: ["animals"] }),
      queryClient.invalidateQueries({ queryKey: ["events"] }),
      queryClient.invalidateQueries({ queryKey: ["movements"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset(createDefaultValues);
    }
  };

  const handleEditDialogChange = (nextOpen: boolean) => {
    setIsEditOpen(nextOpen);
    if (!nextOpen) {
      setEditingFinca(null);
      resetEdit(editDefaultValues);
    }
  };

  const openEditDialog = (finca: EstablishmentNode) => {
    setEditingFinca(finca);
    resetEdit({
      name: finca.name,
      potreros: [{ name: "" }],
    });
    setIsEditOpen(true);
  };

  const onSubmit = async (values: CreateFormValues) => {
    const potreroNames = values.potreros.map((item) => item.name.trim()).filter(Boolean);

    if (!potreroNames.length) {
      toast.error("Agrega al menos un potrero");
      return;
    }

    try {
      await api.post("/establishments", {
        name: values.name.trim(),
        type: "FINCA",
        potreros: potreroNames,
      });
      toast.success(
        potreroNames.length === 1 ? "Finca y potrero creados" : "Finca y potreros creados"
      );
      reset(createDefaultValues);
      setOpen(false);
      await invalidateEstablishmentQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear la finca");
    }
  };

  const onEditSubmit = async (values: EditFormValues) => {
    if (!editingFinca) return;

    const nextName = values.name.trim();
    const newPotreroNames = values.potreros.map((item) => item.name.trim()).filter(Boolean);
    const currentPotreroNames = new Set(
      getPotreroNodes(editingFinca).map((potrero) => potrero.name.trim().toLowerCase())
    );
    const uniqueNewPotreroNames = new Set(newPotreroNames.map((name) => name.toLowerCase()));
    const duplicatedPotrero = newPotreroNames.find((name) => currentPotreroNames.has(name.toLowerCase()));
    const hasNameChange = nextName !== editingFinca.name;

    if (uniqueNewPotreroNames.size !== newPotreroNames.length) {
      toast.error("No repitas nombres de potreros en la misma finca.");
      return;
    }

    if (duplicatedPotrero) {
      toast.error(`El potrero "${duplicatedPotrero}" ya existe en esta finca.`);
      return;
    }

    if (!hasNameChange && !newPotreroNames.length) {
      toast.error("No hay cambios para guardar.");
      return;
    }

    try {
      const requests: Promise<unknown>[] = [];

      if (hasNameChange) {
        requests.push(
          api.patch(`/establishments/${editingFinca.id}`, {
            name: nextName,
          })
        );
      }

      for (const potreroName of newPotreroNames) {
        requests.push(
          api.post("/establishments", {
            name: potreroName,
            type: "POTRERO",
            parentId: editingFinca.id,
          })
        );
      }

      await Promise.all(requests);
      toast.success(
        hasNameChange && newPotreroNames.length
          ? "Finca actualizada y potreros agregados"
          : hasNameChange
          ? "Finca actualizada"
          : newPotreroNames.length === 1
          ? "Potrero agregado"
          : "Potreros agregados"
      );
      handleEditDialogChange(false);
      await invalidateEstablishmentQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al actualizar la finca");
    }
  };

  const onDeleteFinca = async (finca: EstablishmentNode) => {
    if (!canManage) return;

    const confirmed = window.confirm(
      `Se eliminara "${finca.name}" con todos sus potreros. La accion se bloqueara si tiene animales o historial asociado.`
    );
    if (!confirmed) return;

    try {
      setDeletingFincaId(finca.id);
      await api.delete(`/establishments/${finca.id}`);
      toast.success("Finca eliminada");
      await invalidateEstablishmentQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al eliminar la finca");
    } finally {
      setDeletingFincaId(null);
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
      await invalidateEstablishmentQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al migrar animales del corral legado");
    }
  };

  const potrerosError = (errors.potreros as { message?: string } | undefined)?.message;
  const editingPotreros = getPotreroNodes(editingFinca);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Establecimientos"
        subtitle="Fincas y potreros"
        actions={
          canManage ? (
            <Dialog open={open} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button>Nueva finca</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nueva finca</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Nombre</label>
                    <Input placeholder="Ej: Finca Los Sauces" {...register("name")} />
                    {errors.name ? (
                      <p className="text-xs text-red-500">{errors.name.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Potreros
                        </label>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Registra al menos un potrero inicial para esta finca.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => append({ name: "" })}
                      >
                        Agregar potrero
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <Input
                            placeholder={`Ej: Potrero ${index + 1}`}
                            {...register(`potreros.${index}.name`)}
                          />
                          {fields.length > 1 ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => remove(index)}
                            >
                              Quitar
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {potrerosError ? <p className="text-xs text-red-500">{potrerosError}</p> : null}
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Crear finca"}
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
            const potreros = getPotreroNodes(finca);
            const legacyForFinca = legacyCorralsByFinca.get(finca.id) ?? [];
            const totalAnimals =
              potreros.reduce((sum, potrero) => sum + (potrero.animalCount ?? 0), 0) +
              legacyForFinca.reduce((sum, corral) => sum + corral.animalCount, 0);
            const legacyAnimals = legacyForFinca.reduce(
              (sum, corral) => sum + corral.animalCount,
              0
            );

            return (
              <Card
                key={finca.id}
                className="group border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:from-slate-900/90 dark:to-slate-900/70"
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Finca
                      </p>
                      <h3 className="truncate font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {finca.name}
                      </h3>
                    </div>
                    <div className="flex items-start gap-2">
                      {canManage ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg px-2"
                            onClick={() => openEditDialog(finca)}
                            aria-label={`Modificar ${finca.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/30"
                            disabled={deletingFincaId === finca.id}
                            onClick={() => onDeleteFinca(finca)}
                            aria-label={`Eliminar ${finca.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                      <span className="pt-1 text-xs text-slate-500 dark:text-slate-400">
                        Animales activos: {totalAnimals}
                      </span>
                    </div>
                  </div>

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
                          <span className="text-slate-900 dark:text-slate-100">{potrero.name}</span>
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

      <Dialog open={isEditOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modificar finca</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitEdit(onEditSubmit)}>
            <div className="space-y-1 text-sm">
              <label className="text-xs text-slate-500 dark:text-slate-400">Nombre</label>
              <Input placeholder="Ej: Finca Los Sauces" {...registerEdit("name")} />
              {editErrors.name ? (
                <p className="text-xs text-red-500">{editErrors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Potreros actuales</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Puedes conservar los actuales y agregar nuevos desde abajo.
                </p>
              </div>
              {editingPotreros.length ? (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                  {editingPotreros.map((potrero) => (
                    <div key={potrero.id} className="flex items-center justify-between gap-3">
                      <span>{potrero.name}</span>
                      <span className="text-xs text-slate-400">
                        Animales: {potrero.animalCount ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sin potreros registrados.
                </p>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Agregar potreros
                  </label>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Deja vacio si solo quieres cambiar el nombre de la finca.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => appendEdit({ name: "" })}
                >
                  Agregar potrero
                </Button>
              </div>
              <div className="space-y-2">
                {editFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Ej: Potrero ${editingPotreros.length + index + 1}`}
                      {...registerEdit(`potreros.${index}.name`)}
                    />
                    {editFields.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeEdit(index)}
                      >
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isEditingSubmitting}>
              {isEditingSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EstablishmentsPage;
