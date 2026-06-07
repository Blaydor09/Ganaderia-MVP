import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import {
  animalCategoryOptions,
  animalOriginOptions,
  animalSexOptions,
  animalStatusOptions,
  getAnimalCategoryLabel,
} from "@/lib/animals";
import { getOperationalEstablishmentOptions } from "@/lib/establishments";
import { parseDateInputToUtcIso } from "@/lib/dates";

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
  status: z.enum(["ACTIVO", "VENDIDO", "MUERTO", "FAENADO", "PERDIDO"]).optional(),
  establishmentId: z.string().min(1, "Debe seleccionar un establecimiento / potrero"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const AnimalCreatePage = () => {
  const navigate = useNavigate();
  const { data: establishments } = useQuery({
    queryKey: ["establishments", "create"],
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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sex: "FEMALE",
      category: "TERNERO",
      origin: "BORN",
      status: "ACTIVO",
      birthEstimated: false,
      establishmentId: "",
    },
  });

  const category = watch("category");

  // Autofill sex based on category (except TERNERO which is flexible)
  useEffect(() => {
    if (category && category !== "TERNERO") {
      setValue("sex", defaultSexByCategory[category]);
    }
  }, [category, setValue]);

  const onSubmit = async (values: FormValues) => {
    const birthDateIso = parseDateInputToUtcIso(values.birthDate);
    const tag = values.tag?.trim();
    try {
      const response = await api.post("/animals", {
        tag: tag || undefined,
        sex: values.sex,
        breed: values.breed.trim(),
        birthDate: birthDateIso,
        birthEstimated: values.birthEstimated ?? false,
        category: values.category,
        status: values.status || undefined,
        origin: values.origin,
        establishmentId: values.establishmentId || undefined,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Animal registrado correctamente");
      navigate(`/animals/${response.data.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar animal");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-4xl mx-auto">
      <PageHeader
        title="Registrar animal"
        subtitle="Registro manual individual en el sistema"
        actions={
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/animals">Volver</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 dark:bg-slate-900/20 dark:border-slate-800">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Información de Identificación
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clasifica el animal dentro del inventario ganadero.
            </p>
          </CardHeader>
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Arete / Identificador (Opcional)
              </label>
              <Input
                placeholder="Ej: TAG-1007"
                className="rounded-xl h-10"
                {...register("tag")}
              />
              {errors.tag ? (
                <p className="text-xs text-red-500">{errors.tag.message}</p>
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Si se deja vacío, el sistema generará un código interno automáticamente.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Raza
              </label>
              <Input
                placeholder="Ej: Brahman, Angus, Mixto..."
                className="rounded-xl h-10"
                {...register("breed")}
              />
              {errors.breed ? (
                <p className="text-xs text-red-500">{errors.breed.message}</p>
              ) : null}
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
              {errors.category ? (
                <p className="text-xs text-red-500">{errors.category.message}</p>
              ) : null}
            </div>

            {category !== "TERNERO" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sexo
                </label>
                <input type="hidden" {...register("sex")} />
                <div className="w-full h-10 flex items-center px-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 text-sm text-slate-700 dark:text-slate-300 font-medium select-none">
                  {watch("sex") === "MALE" ? "Macho" : "Hembra"}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Sexo predeterminado para la categoría {getAnimalCategoryLabel(category)}.
                </p>
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
                {errors.sex ? (
                  <p className="text-xs text-red-500">{errors.sex.message}</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 dark:bg-slate-900/20 dark:border-slate-800">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Datos de Origen y Ubicación
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Especifica dónde se encuentra el animal y su procedencia.
            </p>
          </CardHeader>
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Ubicación (Establecimiento / Potrero)
              </label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                {...register("establishmentId")}
              >
                <option value="">Selecciona un establecimiento/potrero</option>
                {locationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.establishmentId ? (
                <p className="text-xs text-red-500">{errors.establishmentId.message}</p>
              ) : null}
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
              {errors.origin ? (
                <p className="text-xs text-red-500">{errors.origin.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Fecha de Nacimiento
              </label>
              <Input
                type="date"
                className="rounded-xl h-10"
                {...register("birthDate")}
              />
              {errors.birthDate ? (
                <p className="text-xs text-red-500">{errors.birthDate.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Estado Actual
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
              {errors.status ? (
                <p className="text-xs text-red-500">{errors.status.message}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 md:col-span-2 pt-2">
              <input
                id="birthEstimated"
                type="checkbox"
                className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-300 dark:border-slate-600 dark:focus:ring-brand-500 cursor-pointer"
                {...register("birthEstimated")}
              />
              <label
                htmlFor="birthEstimated"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                ¿La fecha de nacimiento es estimada?
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 dark:bg-slate-900/20 dark:border-slate-800">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Observaciones Adicionales
            </h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Notas
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                placeholder="Ingresa cualquier anotación sobre la genealogía, características o historial del animal..."
                {...register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl px-6 bg-brand-600 hover:bg-brand-700 text-white font-medium"
          >
            {isSubmitting ? "Registrando..." : "Registrar Animal"}
          </Button>
          <Button
            variant="outline"
            type="button"
            className="rounded-xl px-6"
            asChild
          >
            <Link to="/animals">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AnimalCreatePage;
