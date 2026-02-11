import { useEffect, useMemo, useState } from "react";
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
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import { getAnimalCategoryLabel } from "@/lib/animals";
import {
  formatDateOnlyUtc,
  parseDateInputToUtcIso,
} from "@/lib/dates";
import { getTreatmentAnimalCount } from "@/lib/treatments";
import type {
  AnimalListResponse,
  BatchListResponse,
  Treatment,
  TreatmentListResponse,
} from "@/lib/types";

const optionalCategory = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["TERNERO", "VAQUILLA", "VACA", "TORO", "TORILLO"]).optional()
);
const optionalSex = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["MALE", "FEMALE"]).optional()
);
const individualTreatmentSchema = z.object({
  animalId: z.string().min(1, "Requerido"),
  description: z.string().min(3, "Minimo 3 caracteres"),
  startedAt: z.string().min(1, "Requerido"),
});

type IndividualTreatmentFormValues = z.infer<typeof individualTreatmentSchema>;

const groupMedicationSchema = z.object({
  batchId: z.string().min(1, "Requerido"),
  dose: z.number().positive("Requerido"),
});

const groupTreatmentSchema = z
  .object({
    description: z.string().min(3, "Minimo 3 caracteres"),
    startedAt: z.string().min(1, "Requerido"),
    filters: z.object({
      category: optionalCategory,
      sex: optionalSex,
    }),
    scope: z.enum(["ALL_FILTERED", "LIMIT"]),
    limit: z.number().int().positive("Debe ser mayor que 0").optional(),
    medications: z.array(groupMedicationSchema).min(1, "Agrega al menos un medicamento"),
  })
  .superRefine((values, ctx) => {
    if (values.scope === "LIMIT" && values.limit === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limit"],
        message: "Requerido cuando el alcance es cantidad",
      });
    }
    if (values.filters.category && values.filters.category !== "TERNERO" && values.filters.sex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filters", "sex"],
        message: "El sexo solo aplica para Ternero o Todas las categorias",
      });
    }
  });

type GroupTreatmentFormValues = z.infer<typeof groupTreatmentSchema>;

type GroupPreviewResponse = {
  totalFiltered: number;
  selectedCount: number;
};

type AdministrationAuditItem = {
  id: string;
  treatmentId: string;
  dose: number;
  doseUnit: string;
  batch?: {
    id: string;
    batchNumber: string;
  } | null;
  product?: {
    id: string;
    name: string;
    unit?: string;
  } | null;
};

type AdministrationAuditListResponse = {
  items: AdministrationAuditItem[];
  total: number;
  page: number;
  pageSize: number;
};

const emptyMedication = () => ({
  batchId: "",
  dose: undefined as unknown as number,
});

const quantityFormatter = new Intl.NumberFormat("es-NI", {
  maximumFractionDigits: 2,
});

const formatQuantity = (value: number) => quantityFormatter.format(value);
const animalSexLabels: Record<string, string> = {
  MALE: "Macho",
  FEMALE: "Hembra",
};

const formatAnimalSex = (value?: string) => (value ? (animalSexLabels[value] ?? value) : "-");

const getTreatmentAnimalsForSummary = (treatment: Treatment) => {
  const directAnimal = treatment.animal ? [treatment.animal] : [];
  const linkedAnimals = (treatment.animals ?? [])
    .map((relation) => relation?.animal ?? null)
    .filter((animal): animal is NonNullable<Treatment["animal"]> => Boolean(animal));

  if (treatment.mode === "GROUP") {
    return linkedAnimals;
  }

  return directAnimal.length > 0 ? directAnimal : linkedAnimals;
};

const getTreatmentCategorySummary = (treatment: Treatment) => {
  const categories = Array.from(
    new Set(
      getTreatmentAnimalsForSummary(treatment)
        .map((animal) => animal.category)
        .filter((category): category is string => Boolean(category))
    )
  );

  if (categories.length === 0) return "-";
  if (categories.length === 1) return getAnimalCategoryLabel(categories[0]);
  return "Mixto";
};

const getTreatmentSexSummary = (treatment: Treatment) => {
  const sexes = Array.from(
    new Set(
      getTreatmentAnimalsForSummary(treatment)
        .map((animal) => animal.sex)
        .filter((sex): sex is string => Boolean(sex))
    )
  );

  if (sexes.length === 0) return "-";
  if (sexes.length === 1) return formatAnimalSex(sexes[0]);
  return "Mixto";
};

const getTreatmentMedicationBatchSummary = (administrations: AdministrationAuditItem[]) => {
  const labels = Array.from(
    new Set(
      administrations
        .map((administration) => {
          const productName = administration?.product?.name?.trim();
          const batchNumber = administration?.batch?.batchNumber?.trim();
          if (productName && batchNumber) return `${productName} (${batchNumber})`;
          return productName || batchNumber || null;
        })
        .filter((label): label is string => Boolean(label))
    )
  );

  if (labels.length === 0) return "Sin aplicar";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
};

const getTreatmentAppliedDoseSummary = (
  animalsCount: number,
  administrations: AdministrationAuditItem[]
) => {
  if (animalsCount <= 0 || administrations.length === 0) return "Sin aplicar";

  const totalsByUnit = new Map<string, number>();

  for (const administration of administrations) {
    if (!administration || !Number.isFinite(administration.dose)) continue;
    const unit =
      administration.doseUnit?.trim() ||
      administration.product?.unit?.trim() ||
      "dosis";
    const total = administration.dose * animalsCount;
    totalsByUnit.set(unit, (totalsByUnit.get(unit) ?? 0) + total);
  }

  if (totalsByUnit.size === 0) return "Sin aplicar";
  return Array.from(totalsByUnit.entries())
    .map(([unit, total]) => `${formatQuantity(total)} ${unit}`)
    .join(" + ");
};

const TreatmentsPage = () => {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"INDIVIDUAL" | "GROUP">("INDIVIDUAL");

  const canCreateTreatment = hasAnyRole(Access.treatmentsCreate);
  const canModifyTreatment = hasAnyRole(["ADMIN"]);

  const invalidateAfterGroupCreate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["treatments"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory", "alerts"] }),
      queryClient.invalidateQueries({ queryKey: ["batches"] }),
      queryClient.invalidateQueries({ queryKey: ["reports", "withdrawals"] }),
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] }),
    ]);
  };

  const { data } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => (await api.get("/treatments?page=1&pageSize=50")).data as TreatmentListResponse,
  });

  const { data: administrationsAudit } = useQuery({
    queryKey: ["administrations", "treatments-audit"],
    queryFn: async () => {
      const pageSize = 100;
      const maxPages = 20;
      let page = 1;
      let total = 0;
      const aggregated: AdministrationAuditItem[] = [];

      do {
        const response = (
          await api.get(`/administrations?page=${page}&pageSize=${pageSize}`)
        ).data as AdministrationAuditListResponse;

        total = response.total;
        aggregated.push(...(response.items ?? []));
        page += 1;
      } while (aggregated.length < total && page <= maxPages);

      return aggregated;
    },
  });

  const { data: animals } = useQuery({
    queryKey: ["animals", "picker"],
    queryFn: async () => (await api.get("/animals?page=1&pageSize=200")).data as AnimalListResponse,
  });

  const { data: batches } = useQuery({
    queryKey: ["batches", "administration-form"],
    queryFn: async () => (await api.get("/batches?page=1&pageSize=200")).data as BatchListResponse,
  });

  const administrationsByTreatmentId = useMemo(() => {
    const map = new Map<string, AdministrationAuditItem[]>();
    for (const administration of administrationsAudit ?? []) {
      if (!administration?.treatmentId) continue;
      const current = map.get(administration.treatmentId) ?? [];
      current.push(administration);
      map.set(administration.treatmentId, current);
    }
    return map;
  }, [administrationsAudit]);

  const {
    register: registerIndividual,
    handleSubmit: handleSubmitIndividual,
    reset: resetIndividual,
    formState: { errors: individualErrors, isSubmitting: isSubmittingIndividual },
  } = useForm<IndividualTreatmentFormValues>({
    resolver: zodResolver(individualTreatmentSchema),
  });

  const {
    register: registerGroup,
    handleSubmit: handleSubmitGroup,
    reset: resetGroup,
    setValue: setGroupValue,
    control: groupControl,
    formState: { errors: groupErrors, isSubmitting: isSubmittingGroup },
  } = useForm<GroupTreatmentFormValues>({
    resolver: zodResolver(groupTreatmentSchema),
    defaultValues: {
      scope: "ALL_FILTERED",
      filters: {
        category: undefined,
        sex: undefined,
      },
      medications: [emptyMedication()],
    },
  });

  const {
    fields: medicationFields,
    append: appendMedication,
    remove: removeMedication,
  } = useFieldArray({
    control: groupControl,
    name: "medications",
  });

  const watchedScope = useWatch({
    control: groupControl,
    name: "scope",
  });
  const watchedFilters = useWatch({
    control: groupControl,
    name: "filters",
  });
  const watchedLimit = useWatch({
    control: groupControl,
    name: "limit",
  });
  const watchedMedications = useWatch({
    control: groupControl,
    name: "medications",
  });
  const canFilterBySex = !watchedFilters?.category || watchedFilters.category === "TERNERO";

  useEffect(() => {
    if (!canFilterBySex && watchedFilters?.sex) {
      setGroupValue("filters.sex", undefined, { shouldDirty: true, shouldValidate: true });
    }
  }, [canFilterBySex, setGroupValue, watchedFilters?.sex]);

  const normalizedFilters = useMemo(
    () => ({
      category: watchedFilters?.category || undefined,
      sex: canFilterBySex ? watchedFilters?.sex || undefined : undefined,
    }),
    [canFilterBySex, watchedFilters?.category, watchedFilters?.sex]
  );

  const { data: filtersPreview, isFetching: isPreviewLoading } = useQuery({
    queryKey: ["treatments", "group", "filters-preview", normalizedFilters],
    enabled: createDialogOpen && createMode === "GROUP",
    queryFn: async () =>
      (
        await api.post("/treatments/group/preview", {
          filters: normalizedFilters,
          scope: "ALL_FILTERED",
        })
      ).data as GroupPreviewResponse,
  });

  const availableAnimalsCount = filtersPreview?.totalFiltered ?? 0;
  const selectedAnimalsCount =
    watchedScope === "LIMIT"
      ? Math.min(
          typeof watchedLimit === "number" ? watchedLimit : 0,
          availableAnimalsCount
        )
      : availableAnimalsCount;

  const selectableBatches = useMemo(() => {
    const now = new Date();
    return (batches?.items ?? [])
      .filter((batch) => {
        if (!batch.product) return false;
        if (batch.quantityAvailable <= 0) return false;
        const expiresAt = new Date(batch.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) return false;
        return expiresAt > now;
      })
      .sort((a, b) => {
        const productNameA = a.product?.name ?? "";
        const productNameB = b.product?.name ?? "";
        const productDiff = productNameA.localeCompare(productNameB, "es");
        if (productDiff !== 0) return productDiff;
        const expiresDiff = new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        if (expiresDiff !== 0) return expiresDiff;
        return a.batchNumber.localeCompare(b.batchNumber, "es");
      });
  }, [batches?.items]);

  const selectableBatchById = useMemo(
    () => new Map(selectableBatches.map((batch) => [batch.id, batch])),
    [selectableBatches]
  );

  const onCreateIndividualTreatment = async (values: IndividualTreatmentFormValues) => {
    try {
      await api.post("/treatments", {
        animalId: values.animalId,
        description: values.description.trim(),
        startedAt: parseDateInputToUtcIso(values.startedAt),
      });
      toast.success("Tratamiento individual creado");
      resetIndividual();
      setCreateDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["treatments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] }),
      ]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear tratamiento");
    }
  };

  const onCreateGroupTreatment = async (values: GroupTreatmentFormValues) => {
    if (selectedAnimalsCount <= 0) {
      toast.error("No hay animales seleccionados para el tratamiento");
      return;
    }

    const firstInsufficientIndex = values.medications.findIndex((medication) => {
      const batch = selectableBatchById.get(medication.batchId);
      if (!batch) return true;
      const required = medication.dose * selectedAnimalsCount;
      return required > batch.quantityAvailable;
    });

    if (firstInsufficientIndex >= 0) {
      toast.error(`Stock insuficiente en Lote #${firstInsufficientIndex + 1}`);
      return;
    }

    const medicationsPayload = values.medications.map((medication, index) => {
      const batch = selectableBatchById.get(medication.batchId);
      const doseUnit = batch?.product?.unit?.trim();
      const route = batch?.product?.recommendedRoute?.trim();

      return {
        index,
        medication,
        doseUnit,
        route,
      };
    });

    const missingUnit = medicationsPayload.find((item) => !item.doseUnit);
    if (missingUnit) {
      toast.error(`El lote #${missingUnit.index + 1} no tiene unidad configurada`);
      return;
    }

    const missingRoute = medicationsPayload.find((item) => !item.route);
    if (missingRoute) {
      toast.error(`El lote #${missingRoute.index + 1} no tiene via recomendada`);
      return;
    }

    try {
      const response = await api.post("/treatments/group", {
        description: values.description.trim(),
        startedAt: parseDateInputToUtcIso(values.startedAt),
        scope: values.scope,
        limit: values.scope === "LIMIT" ? values.limit : undefined,
        filters: {
          category: values.filters.category || undefined,
          sex:
            !values.filters.category || values.filters.category === "TERNERO"
              ? values.filters.sex || undefined
              : undefined,
        },
        medications: medicationsPayload.map(({ medication, doseUnit, route }) => ({
          batchId: medication.batchId,
          dose: medication.dose,
          doseUnit: doseUnit!,
          route: route!,
        })),
      });
      const selectedCount = response.data?.selectedAnimalsCount as number | undefined;
      toast.success(
        selectedCount
          ? `Tratamiento grupal creado para ${selectedCount} animales`
          : "Tratamiento grupal creado"
      );
      resetGroup({
        scope: "ALL_FILTERED",
        filters: {
          category: undefined,
          sex: undefined,
        },
        medications: [emptyMedication()],
      });
      setCreateDialogOpen(false);
      await invalidateAfterGroupCreate();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear tratamiento grupal");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tratamientos"
        subtitle="Control sanitario y aplicaciones"
        actions={
          canCreateTreatment ? (
            <Dialog
              open={createDialogOpen}
              onOpenChange={(open) => {
                setCreateDialogOpen(open);
                if (!open) {
                  setCreateMode("INDIVIDUAL");
                  resetIndividual();
                  resetGroup({
                    scope: "ALL_FILTERED",
                    filters: {
                      category: undefined,
                      sex: undefined,
                    },
                    medications: [emptyMedication()],
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>Nuevo tratamiento</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo tratamiento</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/60">
                  <Button
                    type="button"
                    size="sm"
                    variant={createMode === "INDIVIDUAL" ? "default" : "ghost"}
                    onClick={() => setCreateMode("INDIVIDUAL")}
                  >
                    Individual
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={createMode === "GROUP" ? "default" : "ghost"}
                    onClick={() => setCreateMode("GROUP")}
                  >
                    Grupal
                  </Button>
                </div>

                {createMode === "INDIVIDUAL" ? (
                  <form className="space-y-3" onSubmit={handleSubmitIndividual(onCreateIndividualTreatment)}>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Animal</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...registerIndividual("animalId")}
                      >
                        <option value="">Selecciona</option>
                        {(animals?.items ?? []).map((animal) => (
                          <option key={animal.id} value={animal.id}>
                            {(animal.tag || "Sin arete")} - {animal.breed}
                          </option>
                        ))}
                      </select>
                      {individualErrors.animalId ? (
                        <p className="text-xs text-red-500">{individualErrors.animalId.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Descripcion</label>
                      <Input placeholder="Ej: Desparasitacion" {...registerIndividual("description")} />
                      {individualErrors.description ? (
                        <p className="text-xs text-red-500">{individualErrors.description.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Fecha (dd/mm/aaaa)</label>
                      <Input type="date" {...registerIndividual("startedAt")} />
                      {individualErrors.startedAt ? (
                        <p className="text-xs text-red-500">{individualErrors.startedAt.message}</p>
                      ) : null}
                    </div>
                    <Button type="submit" disabled={isSubmittingIndividual}>
                      {isSubmittingIndividual ? "Guardando..." : "Crear individual"}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmitGroup(onCreateGroupTreatment)}>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Descripcion</label>
                      <Input placeholder="Ej: Control antiparasitario lote 2" {...registerGroup("description")} />
                      {groupErrors.description ? (
                        <p className="text-xs text-red-500">{groupErrors.description.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Fecha (dd/mm/aaaa)</label>
                      <Input type="date" {...registerGroup("startedAt")} />
                      {groupErrors.startedAt ? (
                        <p className="text-xs text-red-500">{groupErrors.startedAt.message}</p>
                      ) : null}
                    </div>

                    <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <p className="text-sm font-medium">Filtros de animales</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <label className="text-xs text-slate-500 dark:text-slate-400">Categoria</label>
                          <select
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            {...registerGroup("filters.category")}
                          >
                            <option value="">Todas</option>
                            <option value="TERNERO">Ternero</option>
                            <option value="VAQUILLA">Vaquilla</option>
                            <option value="VACA">Vaca</option>
                            <option value="TORO">Toro</option>
                            <option value="TORILLO">Torillo</option>
                          </select>
                        </div>
                        {canFilterBySex ? (
                          <div className="space-y-1 text-sm">
                            <label className="text-xs text-slate-500 dark:text-slate-400">Sexo</label>
                            <select
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              {...registerGroup("filters.sex")}
                            >
                              <option value="">Todos</option>
                              <option value="FEMALE">Hembra</option>
                              <option value="MALE">Macho</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1 text-sm">
                            <label className="text-xs text-slate-500 dark:text-slate-400">Sexo</label>
                            <Input
                              defaultValue="No aplica para esta categoria"
                              disabled
                              className="h-10 rounded-xl border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400"
                            />
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                        {isPreviewLoading ? (
                          <p>Cargando cantidad disponible...</p>
                        ) : (
                          <p>
                            Animales activos encontrados: <strong>{availableAnimalsCount}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <p className="text-sm font-medium">Alcance</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <label className="text-xs text-slate-500 dark:text-slate-400">Tipo de alcance</label>
                          <select
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            {...registerGroup("scope")}
                          >
                            <option value="ALL_FILTERED">Todos los animales encontrados</option>
                            <option value="LIMIT">Elegir cantidad específica</option>
                          </select>
                        </div>
                        {watchedScope === "LIMIT" ? (
                          <div className="space-y-1 text-sm">
                            <label className="text-xs text-slate-500 dark:text-slate-400">Cantidad</label>
                            <Input
                              type="number"
                              min={1}
                              max={availableAnimalsCount || undefined}
                              step={1}
                              {...registerGroup("limit", {
                                setValueAs: (value) =>
                                  value === "" || value === undefined ? undefined : Number(value),
                              })}
                            />
                            {groupErrors.limit ? (
                              <p className="text-xs text-red-500">{groupErrors.limit.message}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                        {isPreviewLoading ? (
                          <p>Calculando animales...</p>
                        ) : (
                          <p>
                            Disponibles: <strong>{availableAnimalsCount}</strong> | Seleccionados para
                            tratamiento: <strong>{selectedAnimalsCount}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Lotes</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={selectableBatches.length === 0}
                          onClick={() => appendMedication(emptyMedication())}
                        >
                          Agregar lote
                        </Button>
                      </div>
                      {selectableBatches.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
                          No hay lotes vigentes con stock disponible.
                        </div>
                      ) : null}
                      {medicationFields.map((field, index) => {
                        const currentMedication = watchedMedications?.[index];
                        const selectedBatch = currentMedication?.batchId
                          ? selectableBatchById.get(currentMedication.batchId)
                          : undefined;
                        const dosePerAnimal =
                          typeof currentMedication?.dose === "number" && Number.isFinite(currentMedication.dose)
                            ? currentMedication.dose
                            : 0;
                        const requiredDose = dosePerAnimal * selectedAnimalsCount;
                        const batchAvailable = selectedBatch?.quantityAvailable ?? 0;
                        const hasStockIssue = Boolean(selectedBatch) && requiredDose > batchAvailable;

                        return (
                          <div
                            key={field.id}
                            className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">Lote #{index + 1}</p>
                              {medicationFields.length > 1 ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeMedication(index)}
                                >
                                  Quitar
                                </Button>
                              ) : null}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1 text-sm md:col-span-2">
                                <label className="text-xs text-slate-500 dark:text-slate-400">Lote</label>
                                <select
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                  {...registerGroup(`medications.${index}.batchId`)}
                                >
                                  <option value="">Selecciona</option>
                                  {selectableBatches.map((batch) => (
                                    <option key={batch.id} value={batch.id}>
                                      {batch.product?.name || "Medicamento"} - {batch.batchNumber} |{" "}
                                      {formatQuantity(batch.quantityAvailable)} {batch.product?.unit || ""} | vence{" "}
                                      {formatDateOnlyUtc(batch.expiresAt)}
                                    </option>
                                  ))}
                                </select>
                                {groupErrors.medications?.[index]?.batchId ? (
                                  <p className="text-xs text-red-500">
                                    {groupErrors.medications[index]?.batchId?.message}
                                  </p>
                                ) : null}
                              </div>
                              <div className="space-y-1 text-sm">
                                <label className="text-xs text-slate-500 dark:text-slate-400">Dosis por animal</label>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  {...registerGroup(`medications.${index}.dose`, {
                                    setValueAs: (value) =>
                                      value === "" || value === undefined ? undefined : Number(value),
                                  })}
                                />
                                {groupErrors.medications?.[index]?.dose ? (
                                  <p className="text-xs text-red-500">
                                    {groupErrors.medications[index]?.dose?.message}
                                  </p>
                                ) : null}
                              </div>
                              <div
                                className={`rounded-xl border px-3 py-2 text-sm md:col-span-2 ${
                                  hasStockIssue
                                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300"
                                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                                }`}
                              >
                                <p>
                                  Animales seleccionados: <strong>{selectedAnimalsCount}</strong>
                                </p>
                                <p>
                                  Dosis total requerida: <strong>{formatQuantity(requiredDose)}</strong>{" "}
                                  {selectedBatch?.product?.unit || ""}
                                </p>
                                <p>
                                  Stock disponible en lote: <strong>{formatQuantity(batchAvailable)}</strong>{" "}
                                  {selectedBatch?.product?.unit || ""}
                                </p>
                                {hasStockIssue ? (
                                  <p className="mt-1 font-medium">
                                    Faltan {formatQuantity(requiredDose - batchAvailable)}{" "}
                                    {selectedBatch?.product?.unit || ""}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      type="submit"
                      disabled={
                        isSubmittingGroup || availableAnimalsCount === 0 || selectableBatches.length === 0
                      }
                    >
                      {isSubmittingGroup
                        ? "Guardando..."
                        : availableAnimalsCount === 0
                          ? "Sin animales para tratar"
                          : selectableBatches.length === 0
                            ? "Sin lotes disponibles"
                          : "Crear grupal"}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
        <Table>
          <THead>
            <TR>
              <TH>Alcance</TH>
              <TH>Categoria</TH>
              <TH>Sexo</TH>
              <TH>Medicamento / Lote</TH>
              <TH>Dosis aplicada</TH>
              <TH>Descripcion</TH>
              <TH>Fecha registro</TH>
              <TH>Estado</TH>
              <TH>Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((treatment) => (
              <TR key={treatment.id}>
                {(() => {
                  const animalsCount = getTreatmentAnimalCount(treatment);
                  const treatmentAdministrations =
                    (treatment.administrations ?? []).filter(
                      (administration): administration is AdministrationAuditItem =>
                        Boolean(administration)
                    ).length > 0
                      ? ((treatment.administrations ?? []).filter(
                          (administration): administration is AdministrationAuditItem =>
                            Boolean(administration)
                        ))
                      : (administrationsByTreatmentId.get(treatment.id) ?? []);

                  return (
                    <>
                <TD>
                      {animalsCount} {animalsCount === 1 ? "animal" : "animales"}
                </TD>
                <TD>{getTreatmentCategorySummary(treatment)}</TD>
                <TD>{getTreatmentSexSummary(treatment)}</TD>
                      <TD>{getTreatmentMedicationBatchSummary(treatmentAdministrations)}</TD>
                      <TD>{getTreatmentAppliedDoseSummary(animalsCount, treatmentAdministrations)}</TD>
                <TD>{treatment.description}</TD>
                <TD>{formatDateOnlyUtc(treatment.startedAt)}</TD>
                <TD>{treatment.status}</TD>
                <TD>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canModifyTreatment}
                      onClick={() => {
                        if (!canModifyTreatment) return;
                        toast.info("La opcion modificar estara disponible pronto.");
                      }}
                    >
                      Modificar
                    </Button>
                  </div>
                </TD>
                    </>
                  );
                })()}
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={9} className="text-sm text-slate-500 dark:text-slate-400">
                  Sin tratamientos registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </div>
  );
};

export default TreatmentsPage;
