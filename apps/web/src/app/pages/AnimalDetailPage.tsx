import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo, useEffect } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getAnimalCategoryLabel,
  getAnimalIdentifier,
  getAnimalStatusLabel,
  animalCategoryOptions,
  animalSexOptions,
  animalStatusOptions,
  animalOriginOptions,
} from "@/lib/animals";
import { getOperationalEstablishmentOptions } from "@/lib/establishments";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import { formatDateOnlyUtc, toDateInputValue, parseDateInputToUtcIso } from "@/lib/dates";
import { Edit, Trash, Printer, Plus, ClipboardList, Stethoscope } from "lucide-react";

const defaultSexByCategory: Record<string, "MALE" | "FEMALE"> = {
  VACA: "FEMALE",
  VAQUILLA: "FEMALE",
  TORO: "MALE",
  TORILLO: "MALE",
  TERNERO: "MALE",
};

const optionalTagSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1, "Requerido").optional()
);

const schema = z.object({
  tag: optionalTagSchema,
  sex: z.enum(["MALE", "FEMALE"]),
  breed: z.string().min(1, "Raza es requerida"),
  birthDate: z.string().min(1, "Fecha de nacimiento es requerida"),
  birthEstimated: z.boolean().optional(),
  category: z.enum(["TERNERO", "VAQUILLA", "VACA", "TORO", "TORILLO"]),
  origin: z.enum(["BORN", "BOUGHT"]),
  status: z.enum(["ACTIVO", "VENDIDO", "MUERTO", "FAENADO", "PERDIDO"]),
  establishmentId: z.string().min(1, "Debe seleccionar un establecimiento / potrero"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const AnimalDetailPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canCreateEvents = hasAnyRole(Access.eventsCreate);
  const canCreateTreatments = hasAnyRole(Access.treatmentsCreate);
  const isAdmin = hasAnyRole(["ADMIN"]); // Solo ADMIN puede editar y eliminar segun endpoints del backend

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["animal", params.id],
    queryFn: async () => (await api.get(`/animals/${params.id}`)).data,
  });

  const { data: establishments } = useQuery({
    queryKey: ["establishments", "edit-animal"],
    enabled: isEditOpen,
    queryFn: async () => (await api.get("/establishments?tree=true")).data,
  });

  const locationOptions = useMemo(
    () => getOperationalEstablishmentOptions(establishments ?? []),
    [establishments]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const category = watch("category");

  // Reset values when data is loaded or edit dialog is opened
  useEffect(() => {
    if (data && isEditOpen) {
      reset({
        tag: data.tag ?? "",
        sex: data.sex,
        breed: data.breed,
        birthDate: data.birthDate ? toDateInputValue(data.birthDate) : "",
        birthEstimated: data.birthEstimated ?? false,
        category: data.category,
        origin: data.origin,
        status: data.status,
        establishmentId: data.establishmentId ?? "",
        notes: data.notes ?? "",
      });
    }
  }, [data, reset, isEditOpen]);

  // Autofill sex based on category (except TERNERO)
  useEffect(() => {
    if (category && category !== "TERNERO") {
      setValue("sex", defaultSexByCategory[category]);
    }
  }, [category, setValue]);

  if (!data) {
    return (
      <div className="flex justify-center items-center h-[50vh] text-slate-500 dark:text-slate-400 gap-2">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        Cargando ficha del animal...
      </div>
    );
  }

  const animalIdentifier = getAnimalIdentifier(data);

  const onEditSubmit = async (values: FormValues) => {
    const birthDateIso = parseDateInputToUtcIso(values.birthDate);
    const tag = values.tag?.trim();
    try {
      await api.patch(`/animals/${data.id}`, {
        tag: tag || null,
        sex: values.sex,
        breed: values.breed.trim(),
        birthDate: birthDateIso,
        birthEstimated: values.birthEstimated ?? false,
        category: values.category,
        status: values.status,
        establishmentId: values.establishmentId || null,
        notes: values.notes?.trim() || null,
      });
      toast.success("Ficha del animal actualizada correctamente");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["animal", data.id] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al actualizar animal");
    }
  };

  const onDeleteConfirm = async () => {
    try {
      await api.delete(`/animals/${data.id}`);
      toast.success("Animal eliminado correctamente");
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      navigate("/animals");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al eliminar animal");
    }
  };

  const handleAddEventMock = () => {
    toast.info("El módulo de Eventos se encuentra en desarrollo en este ambiente.");
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={`Ficha ${animalIdentifier}`}
        subtitle={`Categoría: ${getAnimalCategoryLabel(data.category)} • Raza: ${data.breed}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2 rounded-xl" asChild>
              <Link to={`/animals/${data.id}/print`}>
                <Printer className="h-4 w-4 opacity-70" />
                Imprimir ficha
              </Link>
            </Button>
            {isAdmin ? (
              <>
                <Button
                  variant="secondary"
                  className="gap-2 rounded-xl text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Edit className="h-4 w-4 opacity-70" />
                  Editar ficha
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-red-200 hover:bg-red-50 text-red-600 dark:border-red-900/40 dark:hover:bg-red-950/20"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash className="h-4 w-4 opacity-70" />
                  Eliminar
                </Button>
              </>
            ) : null}
            {canCreateEvents ? (
              <Button variant="secondary" className="gap-2 rounded-xl" onClick={handleAddEventMock}>
                <Plus className="h-4 w-4 opacity-70" />
                Agregar evento
              </Button>
            ) : null}
            {canCreateTreatments ? (
              <Button
                variant="outline"
                className="gap-2 rounded-xl border-brand-200 hover:bg-brand-50/50 text-brand-700 dark:border-brand-900/40 dark:hover:bg-brand-950/20 dark:text-brand-300"
                asChild
              >
                <Link to={`/treatments?animalId=${data.id}`}>
                  <Plus className="h-4 w-4 opacity-70" />
                  Agregar tratamiento
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Categoría</p>
            <Badge className="px-3 py-1 text-sm">{getAnimalCategoryLabel(data.category)}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Estado</p>
            <Badge
              variant={
                data.status === "ACTIVO"
                  ? "success"
                  : data.status === "VENDIDO"
                  ? "warning"
                  : "danger"
              }
              className="px-3 py-1 text-sm"
            >
              {getAnimalStatusLabel(data.status)}
            </Badge>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Raza</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{data.breed}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Sexo</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {data.sex === "MALE" ? "Macho" : "Hembra"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Código Interno</p>
            <p className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200">{data.internalCode}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl dark:bg-slate-900 border dark:border-slate-800">
          <TabsTrigger value="resumen" className="rounded-lg">Resumen</TabsTrigger>
          <TabsTrigger value="eventos" className="rounded-lg">Eventos</TabsTrigger>
          <TabsTrigger value="tratamientos" className="rounded-lg">Tratamientos</TabsTrigger>
          <TabsTrigger value="movimientos" className="rounded-lg">Movimientos</TabsTrigger>
          <TabsTrigger value="pesajes" className="rounded-lg">Pesajes</TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-lg">Documentos</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="mt-4 animate-fade-up">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nacimiento</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-150">
                {data.birthDate ? formatDateOnlyUtc(data.birthDate) : "Sin fecha"}
              </p>
              {data.birthEstimated ? (
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium bg-brand-50 dark:bg-brand-950/20 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                  Fecha estimada
                </span>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ubicación</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-150">
                {data.establishment
                  ? data.establishment.parent
                    ? `${data.establishment.parent.name} / ${data.establishment.name}`
                    : data.establishment.name
                  : "Sin asignar"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Origen</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-150">
                {data.origin === "BORN" ? "Nacido en finca" : "Comprado"}
              </p>
            </div>
            {data.notes ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40 sm:col-span-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Observaciones</p>
                <p className="text-sm text-slate-600 dark:text-slate-350 whitespace-pre-line font-medium leading-relaxed">
                  {data.notes}
                </p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="eventos" className="mt-4 animate-fade-up">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            {data.events?.length ? (
              data.events.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-none last:pb-0 dark:border-slate-800 text-sm font-medium"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-2 rounded-xl dark:bg-slate-800">
                      <ClipboardList className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <span className="text-slate-800 dark:text-slate-200">{event.type}</span>
                      {event.notes ? (
                        <p className="text-xs text-slate-400 font-normal mt-0.5">{event.notes}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateOnlyUtc(event.occurredAt)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Sin eventos registrados.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tratamientos" className="mt-4 animate-fade-up">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            {data.treatments?.length ? (
              data.treatments.map((treatment: any) => (
                <div
                  key={treatment.id}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-none last:pb-0 dark:border-slate-800 text-sm font-medium"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-2 rounded-xl dark:bg-slate-800">
                      <Stethoscope className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <span className="text-slate-800 dark:text-slate-200">
                        {treatment.description}
                      </span>
                      {treatment.mode === "GROUP" ? (
                        <span className="ml-2 text-xs text-amber-600 bg-amber-55/10 dark:text-amber-400 dark:bg-amber-950/20 px-2 py-0.5 rounded-full font-medium">
                          Grupal ({treatment.animals?.length ?? 0} animales)
                        </span>
                      ) : (
                        <span className="ml-2 text-xs text-brand-600 bg-brand-55/10 dark:text-brand-400 dark:bg-brand-950/20 px-2 py-0.5 rounded-full font-medium">
                          Individual
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={treatment.status === "COMPLETED" ? "success" : "default"}>
                    {treatment.status === "COMPLETED" ? "Completado" : "Pendiente"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Sin tratamientos registrados.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4 animate-fade-up">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            {data.movements?.length ? (
              data.movements.map((move: any) => (
                <div
                  key={move.id}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-none last:pb-0 dark:border-slate-800 text-sm font-medium"
                >
                  <div>
                    <span className="text-slate-800 dark:text-slate-200">{move.movementType}</span>
                    <p className="text-xs text-slate-400 font-normal mt-0.5">
                      Desde: {move.originEstablishment?.name || "Sin asignar"} &rarr; Hacia: {move.destinationEstablishment?.name || "Sin asignar"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateOnlyUtc(move.occurredAt)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Sin movimientos registrados.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pesajes" className="mt-4 animate-fade-up">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40 text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Historial de pesajes registrados en eventos de tipo PESO. En desarrollo.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="mt-4 animate-fade-up">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/40 text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">Adjuntos y fichas veterinarias asociadas. Próximamente.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogo de Edición */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl rounded-2xl dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>Editar ficha del animal</DialogTitle>
            <DialogDescription>Modifica los datos generales registrados en el sistema.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Arete / Identificador (Opcional)
                </label>
                <Input placeholder="Ej: TAG-1007" className="rounded-xl" {...register("tag")} />
                {errors.tag ? <p className="text-xs text-red-500">{errors.tag.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Raza
                </label>
                <Input placeholder="Ej: Brahman" className="rounded-xl" {...register("breed")} />
                {errors.breed ? <p className="text-xs text-red-500">{errors.breed.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Categoría
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                  {...register("category")}
                >
                  {animalCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.category ? <p className="text-xs text-red-500">{errors.category.message}</p> : null}
              </div>

              {category !== "TERNERO" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sexo
                  </label>
                  <input type="hidden" {...register("sex")} />
                  <div className="w-full h-10 flex items-center px-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 text-sm text-slate-700 dark:text-slate-350 font-medium select-none">
                    {watch("sex") === "MALE" ? "Macho" : "Hembra"}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sexo
                  </label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                    {...register("sex")}
                  >
                    {animalSexOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.sex ? <p className="text-xs text-red-500">{errors.sex.message}</p> : null}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ubicación (Establecimiento / Potrero)
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                  {...register("establishmentId")}
                >
                  <option value="">Selecciona potrero</option>
                  {locationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.establishmentId ? <p className="text-xs text-red-500">{errors.establishmentId.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Origen
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                  {...register("origin")}
                >
                  {animalOriginOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.origin ? <p className="text-xs text-red-500">{errors.origin.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Fecha de Nacimiento
                </label>
                <Input type="date" className="rounded-xl" {...register("birthDate")} />
                {errors.birthDate ? <p className="text-xs text-red-500">{errors.birthDate.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Estado
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                  {...register("status")}
                >
                  {animalStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.status ? <p className="text-xs text-red-500">{errors.status.message}</p> : null}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <input
                id="editBirthEstimated"
                type="checkbox"
                className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-300 dark:border-slate-650 cursor-pointer"
                {...register("birthEstimated")}
              />
              <label htmlFor="editBirthEstimated" className="text-sm font-medium text-slate-750 dark:text-slate-300 cursor-pointer">
                La fecha de nacimiento es estimada
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Notas
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                placeholder="Notas adicionales..."
                {...register("notes")}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white">
                {isSubmitting ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialogo de Confirmacion de Eliminacion */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md rounded-2xl dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-650 dark:text-red-500">
              <Trash className="h-5 w-5" />
              ¿Eliminar animal?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Esta acción marcará al animal como eliminado en el sistema. Los tratamientos e historial asociados seguirán conservándose por razones de trazabilidad sanitaria y auditoría, pero el animal ya no aparecerá en el inventario activo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4 border-t dark:border-slate-800">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl bg-red-600 hover:bg-red-750 text-white border-transparent hover:text-white dark:bg-red-700 dark:hover:bg-red-800"
              onClick={onDeleteConfirm}
            >
              Confirmar y Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnimalDetailPage;
