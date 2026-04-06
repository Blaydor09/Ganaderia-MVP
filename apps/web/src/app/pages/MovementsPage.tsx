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
import { getAnimalIdentifier } from "@/lib/animals";
import { formatDateOnlyUtc, parseDateTimeInputToIso } from "@/lib/dates";
import { getOperationalEstablishmentOptions } from "@/lib/establishments";
import type {
  AnimalListResponse,
  EstablishmentNode,
  MovementListResponse,
  MovementType,
} from "@/lib/types";

const movementTypeOptions: { value: MovementType; label: string }[] = [
  { value: "INTERNAL", label: "Interno" },
  { value: "EXTERNAL", label: "Externo" },
  { value: "SALE", label: "Venta" },
  { value: "SLAUGHTER", label: "Faena" },
];

const schema = z
  .object({
    animalId: z.string().min(1, "Requerido"),
    occurredAt: z.string().min(1, "Requerido"),
    originId: z.string().optional(),
    destinationId: z.string().optional(),
    movementType: z.enum(["INTERNAL", "EXTERNAL", "SALE", "SLAUGHTER"]),
    transporter: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.movementType === "INTERNAL") {
      if (!values.originId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["originId"],
          message: "Origen requerido para movimientos internos",
        });
      }
      if (!values.destinationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationId"],
          message: "Destino requerido para movimientos internos",
        });
      }
      if (values.originId && values.destinationId && values.originId === values.destinationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationId"],
          message: "Destino debe ser distinto al origen",
        });
      }
    }

    if (
      values.movementType !== "INTERNAL" &&
      values.destinationId &&
      values.destinationId.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationId"],
        message: "Destino no permitido para este tipo",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const MovementsPage = () => {
  const queryClient = useQueryClient();
  const canCreate = hasAnyRole(Access.movementsCreate);
  const { data } = useQuery({
    queryKey: ["movements", "list"],
    queryFn: async () => (await api.get("/movements?page=1&pageSize=50")).data as MovementListResponse,
  });
  const { data: animals } = useQuery({
    queryKey: ["animals", "movement-form"],
    queryFn: async () => (await api.get("/animals?page=1&pageSize=200")).data as AnimalListResponse,
  });
  const { data: establishments } = useQuery({
    queryKey: ["establishments", "movement-form"],
    queryFn: async () => (await api.get("/establishments?tree=true")).data as EstablishmentNode[],
  });

  const animalNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of animals?.items ?? []) {
      map.set(item.id, getAnimalIdentifier(item, item.breed));
    }
    return map;
  }, [animals]);

  const locationOptions = useMemo(
    () => getOperationalEstablishmentOptions(establishments ?? []),
    [establishments]
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      movementType: "INTERNAL",
      originId: "",
      destinationId: "",
    },
  });

  const movementType = watch("movementType");

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/movements", {
        animalId: values.animalId,
        occurredAt: parseDateTimeInputToIso(values.occurredAt),
        originId: values.originId || undefined,
        destinationId:
          values.movementType === "INTERNAL" ? values.destinationId || undefined : undefined,
        movementType: values.movementType,
        transporter: values.transporter?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Movimiento registrado");
      reset({ movementType: "INTERNAL", originId: "", destinationId: "" });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar movimiento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        subtitle="Trazabilidad interna y externa"
        actions={
          canCreate ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Nuevo movimiento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar movimiento</DialogTitle>
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
                          {getAnimalIdentifier(animal)} - {animal.breed}
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
                        {...register("movementType")}
                      >
                        {movementTypeOptions.map((option) => (
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
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Origen</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register("originId")}
                      >
                        <option value="">Sin origen</option>
                        {locationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.originId ? <p className="text-xs text-red-500">{errors.originId.message}</p> : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Destino</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        disabled={movementType !== "INTERNAL"}
                        {...register("destinationId")}
                      >
                        <option value="">Sin destino</option>
                        {locationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.destinationId ? <p className="text-xs text-red-500">{errors.destinationId.message}</p> : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Transportista</label>
                      <Input placeholder="Opcional" {...register("transporter")} />
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
                    {isSubmitting ? "Guardando..." : "Guardar movimiento"}
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
              <TH>Transportista</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((move) => (
              <TR key={move.id}>
                <TD>{animalNameById.get(move.animalId) ?? move.animalId}</TD>
                <TD>{move.movementType}</TD>
                <TD>{formatDateOnlyUtc(move.occurredAt)}</TD>
                <TD>{move.transporter ?? "-"}</TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={4} className="text-sm text-slate-500 dark:text-slate-400">
                  Sin movimientos registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default MovementsPage;
