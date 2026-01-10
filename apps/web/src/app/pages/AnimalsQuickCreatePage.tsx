import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
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
import { getEstablishmentTypeLabel } from "@/lib/establishments";

const defaultSexByCategory: Record<string, "MALE" | "FEMALE"> = {
  VACA: "FEMALE",
  VAQUILLA: "FEMALE",
  TORO: "MALE",
  TORILLO: "MALE",
  TERNERO: "MALE",
};

const lineSchema = z.object({
  category: z.enum(["TERNERO", "VAQUILLA", "VACA", "TORO", "TORILLO"]),
  sex: z.enum(["MALE", "FEMALE"]),
  count: z.number().int().min(0),
});

const schema = z
  .object({
    lines: z.array(lineSchema),
    breed: z.string().min(1, "Requerido"),
    birthDate: z.string().optional(),
    birthEstimated: z.boolean().optional(),
    origin: z.enum(["BORN", "BOUGHT"]),
    status: z.enum(["ACTIVO", "VENDIDO", "MUERTO", "FAENADO", "PERDIDO"]).optional(),
    establishmentId: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((values) => values.lines.some((line) => line.count > 0), {
    message: "Ingresa al menos una cantidad.",
    path: ["lines"],
  });

type FormValues = z.infer<typeof schema>;

const AnimalsQuickCreatePage = () => {
  const navigate = useNavigate();
  const { data: establishments } = useQuery({
    queryKey: ["establishments", "quick-create"],
    queryFn: async () => (await api.get("/establishments?tree=true")).data,
  });

  const locationOptions = useMemo(() => {
    const fincas = (establishments ?? []) as any[];
    const options: { value: string; label: string }[] = [];
    for (const finca of fincas) {
      const children = finca.children ?? [];
      for (const child of children) {
        if (child.type === "FINCA") continue;
        options.push({
          value: child.id,
          label: `${finca.name} / ${getEstablishmentTypeLabel(child.type)} ${child.name}`,
        });
      }
    }
    return options;
  }, [establishments]);

  const defaultLines = useMemo(
    () =>
      animalCategoryOptions.map((option) => ({
        category: option.value,
        sex: defaultSexByCategory[option.value] ?? "FEMALE",
        count: 0,
      })),
    []
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lines: defaultLines,
      origin: "BORN",
      status: "ACTIVO",
      birthEstimated: false,
      establishmentId: "",
    },
  });

  const lines = useWatch({ control, name: "lines" }) ?? [];
  const totalCount = lines.reduce((acc, line) => acc + (line?.count ?? 0), 0);

  const onSubmit = async (values: FormValues) => {
    const items = values.lines
      .filter((line) => line.count > 0)
      .map((line) => ({
        category: line.category,
        sex: line.sex,
        count: line.count,
      }));

    if (!items.length) {
      toast.error("Ingresa al menos una cantidad.");
      return;
    }

    const birthDateIso = values.birthDate
      ? new Date(`${values.birthDate}T00:00:00Z`).toISOString()
      : undefined;

    try {
      const response = await api.post("/animals/quick", {
        items,
        breed: values.breed.trim(),
        birthDate: birthDateIso,
        birthEstimated: values.birthEstimated ?? false,
        origin: values.origin,
        status: values.status || undefined,
        establishmentId: values.establishmentId || undefined,
        notes: values.notes?.trim() || undefined,
      });
      toast.success(`Registro rapido completado (${response.data.count} animales)`);
      navigate("/animals");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar animales");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro rapido"
        subtitle="Carga masiva por categoria y sexo"
        actions={
          <Button variant="outline" asChild>
            <Link to="/animals">Volver</Link>
          </Button>
        }
      />

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Paso 1</p>
            <h3 className="font-display text-lg font-semibold">Distribucion por categoria</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400">
                <span className="col-span-5">Categoria</span>
                <span className="col-span-3">Sexo</span>
                <span className="col-span-4 text-right">Cantidad</span>
              </div>
              {lines.map((line, index) => (
                <div key={line.category} className="grid grid-cols-12 items-center gap-2">
                  <input type="hidden" {...register(`lines.${index}.category`)} />
                  <span className="col-span-5 text-sm text-slate-700">
                    {getAnimalCategoryLabel(line.category)}
                  </span>
                  <select
                    className="col-span-3 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    {...register(`lines.${index}.sex`)}
                  >
                    {animalSexOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={0}
                    className="col-span-4 text-right"
                    {...register(`lines.${index}.count`, {
                      setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    })}
                  />
                </div>
              ))}
            </div>
            {errors.lines ? (
              <p className="text-xs text-red-500">{errors.lines.message as string}</p>
            ) : null}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm">
              <span className="text-slate-500">Total a registrar</span>
              <span className="font-medium text-slate-900">{totalCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500">Paso 2</p>
            <h3 className="font-display text-lg font-semibold">Datos generales</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Raza</label>
                <Input placeholder="Brahman o Mixto" {...register("breed")} />
                {errors.breed ? (
                  <p className="text-xs text-red-500">{errors.breed.message}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Fecha nacimiento</label>
                <Input type="date" {...register("birthDate")} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Origen</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  {...register("origin")}
                >
                  {animalOriginOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Estado</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  {...register("status")}
                >
                  {animalStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-600">Establecimiento</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  {...register("establishmentId")}
                >
                  <option value="">Sin asignar</option>
                  {locationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
                  {...register("birthEstimated")}
                />
                <span className="text-xs text-slate-600">Fecha estimada</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Notas</label>
              <textarea
                className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                placeholder="Observaciones generales para el lote"
                {...register("notes")}
              />
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Los animales se registran sin arete. Puedes agregarlo luego desde la ficha individual.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Registrar animales"}
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link to="/animals">Cancelar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default AnimalsQuickCreatePage;
