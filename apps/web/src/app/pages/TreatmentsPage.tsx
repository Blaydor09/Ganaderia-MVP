import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import { formatDateOnlyUtc, parseDateTimeInputToIso } from "@/lib/dates";
import type { AnimalListResponse, BatchListResponse, Treatment, TreatmentListResponse } from "@/lib/types";

const treatmentSchema = z.object({
  animalId: z.string().min(1, "Requerido"),
  diagnosis: z.string().min(3, "Minimo 3 caracteres"),
  startedAt: z.string().min(1, "Requerido"),
});

type TreatmentFormValues = z.infer<typeof treatmentSchema>;

const administrationSchema = z.object({
  treatmentId: z.string().min(1, "Requerido"),
  batchId: z.string().min(1, "Requerido"),
  administeredAt: z.string().min(1, "Requerido"),
  dose: z.number().positive("Requerido"),
  doseUnit: z.string().min(1, "Requerido"),
  route: z.string().min(1, "Requerido"),
  site: z.string().optional(),
  notes: z.string().optional(),
});

type AdministrationFormValues = z.infer<typeof administrationSchema>;

const closeSchema = z.object({
  endedAt: z.string().min(1, "Requerido"),
});

type CloseFormValues = z.infer<typeof closeSchema>;

const TreatmentsPage = () => {
  const queryClient = useQueryClient();
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [activeTreatment, setActiveTreatment] = useState<Treatment | null>(null);

  const canCreateTreatment = hasAnyRole(Access.treatmentsCreate);
  const canCreateAdministration = hasAnyRole(Access.administrationsCreate);
  const canCloseTreatment = hasAnyRole(Access.treatmentsClose);

  const { data } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => (await api.get("/treatments?page=1&pageSize=50")).data as TreatmentListResponse,
  });

  const { data: animals } = useQuery({
    queryKey: ["animals", "picker"],
    queryFn: async () => (await api.get("/animals?page=1&pageSize=200")).data as AnimalListResponse,
  });

  const { data: batches } = useQuery({
    queryKey: ["batches", "administration-form"],
    queryFn: async () => (await api.get("/batches?page=1&pageSize=200")).data as BatchListResponse,
  });

  const activeTreatments = useMemo(
    () => (data?.items ?? []).filter((treatment) => treatment.status === "ACTIVE"),
    [data]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TreatmentFormValues>({ resolver: zodResolver(treatmentSchema) });

  const {
    register: registerAdmin,
    handleSubmit: handleSubmitAdmin,
    reset: resetAdmin,
    setValue: setAdminValue,
    formState: { errors: adminErrors, isSubmitting: isSubmittingAdmin },
  } = useForm<AdministrationFormValues>({
    resolver: zodResolver(administrationSchema),
    defaultValues: {
      treatmentId: "",
      batchId: "",
      doseUnit: "dosis",
      route: "",
    },
  });

  const {
    register: registerClose,
    handleSubmit: handleSubmitClose,
    reset: resetClose,
    formState: { errors: closeErrors, isSubmitting: isSubmittingClose },
  } = useForm<CloseFormValues>({ resolver: zodResolver(closeSchema) });

  const onCreateTreatment = async (values: TreatmentFormValues) => {
    try {
      await api.post("/treatments", {
        animalId: values.animalId,
        diagnosis: values.diagnosis.trim(),
        startedAt: parseDateTimeInputToIso(values.startedAt),
      });
      toast.success("Tratamiento creado");
      reset();
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear tratamiento");
    }
  };

  const onCreateAdministration = async (values: AdministrationFormValues) => {
    try {
      await api.post("/administrations", {
        treatmentId: values.treatmentId,
        batchId: values.batchId,
        administeredAt: parseDateTimeInputToIso(values.administeredAt),
        dose: values.dose,
        doseUnit: values.doseUnit.trim(),
        route: values.route.trim(),
        site: values.site?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Aplicacion registrada");
      resetAdmin({ treatmentId: "", batchId: "", doseUnit: "dosis", route: "" });
      setAdminDialogOpen(false);
      setActiveTreatment(null);
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["reports", "withdrawals"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar aplicacion");
    }
  };

  const onCloseTreatment = async (values: CloseFormValues) => {
    if (!activeTreatment) return;
    try {
      await api.post(`/treatments/${activeTreatment.id}/close`, {
        endedAt: parseDateTimeInputToIso(values.endedAt),
      });
      toast.success("Tratamiento cerrado");
      resetClose();
      setCloseDialogOpen(false);
      setActiveTreatment(null);
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al cerrar tratamiento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tratamientos"
        subtitle="Control sanitario y aplicaciones"
        actions={
          canCreateTreatment ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Nuevo tratamiento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo tratamiento</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleSubmit(onCreateTreatment)}>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Animal</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      {...register("animalId")}
                    >
                      <option value="">Selecciona</option>
                      {(animals?.items ?? []).map((animal) => (
                        <option key={animal.id} value={animal.id}>
                          {(animal.tag || "Sin arete")} - {animal.breed}
                        </option>
                      ))}
                    </select>
                    {errors.animalId ? <p className="text-xs text-red-500">{errors.animalId.message}</p> : null}
                  </div>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Diagnostico</label>
                    <Input placeholder="Ej: Desparasitacion" {...register("diagnosis")} />
                    {errors.diagnosis ? <p className="text-xs text-red-500">{errors.diagnosis.message}</p> : null}
                  </div>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Fecha inicio</label>
                    <Input type="datetime-local" {...register("startedAt")} />
                    {errors.startedAt ? <p className="text-xs text-red-500">{errors.startedAt.message}</p> : null}
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Crear"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
        <Table>
          <THead>
            <TR>
              <TH>Animal</TH>
              <TH>Diagnostico</TH>
              <TH>Inicio</TH>
              <TH>Estado</TH>
              <TH>Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((treatment) => (
              <TR key={treatment.id}>
                <TD>{treatment.animal?.tag || "Sin arete"}</TD>
                <TD>{treatment.diagnosis}</TD>
                <TD>{formatDateOnlyUtc(treatment.startedAt)}</TD>
                <TD>{treatment.status}</TD>
                <TD>
                  <div className="flex flex-wrap gap-2">
                    {canCreateAdministration && treatment.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTreatment(treatment);
                          setAdminDialogOpen(true);
                          setAdminValue("treatmentId", treatment.id);
                        }}
                      >
                        Aplicar
                      </Button>
                    ) : null}
                    {canCloseTreatment && treatment.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActiveTreatment(treatment);
                          setCloseDialogOpen(true);
                        }}
                      >
                        Cerrar
                      </Button>
                    ) : null}
                  </div>
                </TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-sm text-slate-500 dark:text-slate-400">
                  Sin tratamientos registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>

      <Dialog
        open={adminDialogOpen}
        onOpenChange={(open) => {
          setAdminDialogOpen(open);
          if (!open) {
            setActiveTreatment(null);
            resetAdmin({ treatmentId: "", batchId: "", doseUnit: "dosis", route: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar aplicacion</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmitAdmin(onCreateAdministration)}>
            <div className="space-y-1 text-sm">
              <label className="text-xs text-slate-500 dark:text-slate-400">Tratamiento</label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                {...registerAdmin("treatmentId")}
              >
                <option value="">Selecciona</option>
                {activeTreatments.map((treatment) => (
                  <option key={treatment.id} value={treatment.id}>
                    {(treatment.animal?.tag || "Sin arete")} - {treatment.diagnosis}
                  </option>
                ))}
              </select>
              {adminErrors.treatmentId ? <p className="text-xs text-red-500">{adminErrors.treatmentId.message}</p> : null}
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-xs text-slate-500 dark:text-slate-400">Lote</label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                {...registerAdmin("batchId")}
              >
                <option value="">Selecciona</option>
                {(batches?.items ?? []).map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.product?.name || "Producto"} - {batch.batchNumber} ({batch.quantityAvailable} {batch.product?.unit || ""})
                  </option>
                ))}
              </select>
              {adminErrors.batchId ? <p className="text-xs text-red-500">{adminErrors.batchId.message}</p> : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Fecha y hora</label>
                <Input type="datetime-local" {...registerAdmin("administeredAt")} />
                {adminErrors.administeredAt ? <p className="text-xs text-red-500">{adminErrors.administeredAt.message}</p> : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Dosis</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...registerAdmin("dose", {
                    setValueAs: (value) => (value === "" ? undefined : Number(value)),
                  })}
                />
                {adminErrors.dose ? <p className="text-xs text-red-500">{adminErrors.dose.message}</p> : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Unidad de dosis</label>
                <Input placeholder="Ej: ml" {...registerAdmin("doseUnit")} />
                {adminErrors.doseUnit ? <p className="text-xs text-red-500">{adminErrors.doseUnit.message}</p> : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Via</label>
                <Input placeholder="Ej: subcutanea" {...registerAdmin("route")} />
                {adminErrors.route ? <p className="text-xs text-red-500">{adminErrors.route.message}</p> : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Sitio</label>
                <Input placeholder="Opcional" {...registerAdmin("site")} />
              </div>
              <div className="space-y-1 text-sm md:col-span-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">Notas</label>
                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Observaciones"
                  {...registerAdmin("notes")}
                />
              </div>
            </div>
            <Button type="submit" disabled={isSubmittingAdmin}>
              {isSubmittingAdmin ? "Guardando..." : "Registrar aplicacion"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={closeDialogOpen}
        onOpenChange={(open) => {
          setCloseDialogOpen(open);
          if (!open) {
            setActiveTreatment(null);
            resetClose();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar tratamiento</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmitClose(onCloseTreatment)}>
            <div className="space-y-1 text-sm">
              <label className="text-xs text-slate-500 dark:text-slate-400">Fecha fin</label>
              <Input type="datetime-local" {...registerClose("endedAt")} />
              {closeErrors.endedAt ? <p className="text-xs text-red-500">{closeErrors.endedAt.message}</p> : null}
            </div>
            <Button type="submit" disabled={isSubmittingClose}>
              {isSubmittingClose ? "Guardando..." : "Cerrar tratamiento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreatmentsPage;
