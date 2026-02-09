import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { formatDateOnlyUtc, parseDateTimeInputToIso } from "@/lib/dates";
import type {
  AnimalListResponse,
  EstablishmentNode,
  EventListResponse,
  EventType,
} from "@/lib/types";

const eventTypeOptions: { value: EventType; label: string }[] = [
  { value: "PESO", label: "Peso" },
  { value: "NACIMIENTO", label: "Nacimiento" },
  { value: "DESTETE", label: "Destete" },
  { value: "CELO", label: "Celo" },
  { value: "PRENEZ", label: "Prenez" },
  { value: "PARTO", label: "Parto" },
  { value: "VACUNACION", label: "Vacunacion" },
  { value: "DESPARASITACION", label: "Desparasitacion" },
  { value: "ENFERMEDAD", label: "Enfermedad" },
  { value: "MUERTE", label: "Muerte" },
  { value: "VENTA", label: "Venta" },
  { value: "COMPRA", label: "Compra" },
  { value: "OBSERVACION", label: "Observacion" },
];

const schema = z
  .object({
    animalId: z.string().min(1, "Requerido"),
    type: z.enum(eventTypeOptions.map((option) => option.value) as [EventType, ...EventType[]]),
    occurredAt: z.string().min(1, "Requerido"),
    establishmentId: z.string().optional(),
    valueNumber: z.number().optional(),
    valueText: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "PESO" && (values.valueNumber === undefined || values.valueNumber <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valueNumber"],
        message: "Requerido para eventos de peso",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const EventsPage = () => {
  const queryClient = useQueryClient();
  const canCreate = hasAnyRole(Access.eventsCreate);
  const { data } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await api.get("/events?page=1&pageSize=50")).data as EventListResponse,
  });
  const { data: animals } = useQuery({
    queryKey: ["animals", "event-form"],
    queryFn: async () => (await api.get("/animals?page=1&pageSize=200")).data as AnimalListResponse,
  });
  const { data: establishments } = useQuery({
    queryKey: ["establishments", "event-form"],
    queryFn: async () => (await api.get("/establishments?tree=true")).data as EstablishmentNode[],
  });

  const locationOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (const finca of establishments ?? []) {
      for (const child of finca.children ?? []) {
        if (child.type === "FINCA") continue;
        options.push({ value: child.id, label: `${finca.name} / ${child.name}` });
      }
    }
    return options;
  }, [establishments]);

  const animalNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of animals?.items ?? []) {
      map.set(item.id, item.tag || item.breed);
    }
    return map;
  }, [animals]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "OBSERVACION",
      establishmentId: "",
    },
  });

  const selectedType = watch("type");

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/events", {
        animalId: values.animalId,
        type: values.type,
        occurredAt: parseDateTimeInputToIso(values.occurredAt),
        establishmentId: values.establishmentId || undefined,
        valueNumber: values.valueNumber,
        valueText: values.valueText?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Evento registrado");
      reset({ type: "OBSERVACION", establishmentId: "" });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar evento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos"
        subtitle="Bitacora productiva y sanitaria"
        actions={
          canCreate ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Nuevo evento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar evento</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
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
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Tipo</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register("type")}
                      >
                        {eventTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Fecha y hora</label>
                      <Input type="datetime-local" {...register("occurredAt")} />
                      {errors.occurredAt ? <p className="text-xs text-red-500">{errors.occurredAt.message}</p> : null}
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Establecimiento (opcional)</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register("establishmentId")}
                      >
                        <option value="">Sin establecimiento</option>
                        {locationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Valor numerico</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={selectedType === "PESO" ? "Ej: 350" : "Opcional"}
                        {...register("valueNumber", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value)),
                        })}
                      />
                      {errors.valueNumber ? <p className="text-xs text-red-500">{errors.valueNumber.message}</p> : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Valor texto</label>
                      <Input placeholder="Opcional" {...register("valueText")} />
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Notas</label>
                      <textarea
                        className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="Observaciones"
                        {...register("notes")}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar evento"}
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
              <TH>Tipo</TH>
              <TH>Fecha</TH>
              <TH>Notas</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((event) => (
              <TR key={event.id}>
                <TD>{animalNameById.get(event.animalId) ?? event.animalId}</TD>
                <TD>{event.type}</TD>
                <TD>{formatDateOnlyUtc(event.occurredAt)}</TD>
                <TD>{event.notes ?? "-"}</TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500 dark:text-slate-400">
                  Sin eventos registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default EventsPage;
