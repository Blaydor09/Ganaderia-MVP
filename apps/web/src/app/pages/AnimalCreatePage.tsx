import { useMemo } from "react";
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
} from "@/lib/animals";
import { getEstablishmentTypeLabel } from "@/lib/establishments";

const schema = z.object({
  tag: z.string().min(1, "Requerido"),
  sex: z.enum(["MALE", "FEMALE"]),
  breed: z.string().min(1, "Requerido"),
  birthDate: z.string().min(1, "Requerido"),
  birthEstimated: z.boolean().optional(),
  category: z.enum(["TERNERO", "VAQUILLA", "VACA", "TORO", "TORILLO"]),
  origin: z.enum(["BORN", "BOUGHT"]),
  status: z.enum(["ACTIVO", "VENDIDO", "MUERTO", "FAENADO", "PERDIDO"]).optional(),
  establishmentId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const AnimalCreatePage = () => {
  const navigate = useNavigate();
  const { data: establishments } = useQuery({
    queryKey: ["establishments", "create"],
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

  const {
    register,
    handleSubmit,
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

  const onSubmit = async (values: FormValues) => {
    const birthDateIso = new Date(`${values.birthDate}T00:00:00Z`).toISOString();
    try {
      const response = await api.post("/animals", {
        tag: values.tag.trim(),
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
      toast.success("Animal registrado");
      navigate(`/animals/${response.data.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar animal");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar animal"
        subtitle="Registro manual en el sistema"
        actions={
          <Button variant="outline" asChild>
            <Link to="/animals">Volver</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <p className="text-xs text-slate-500">Datos basicos</p>
          <h3 className="font-display text-lg font-semibold">Informacion del animal</h3>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Arete</label>
                <Input placeholder="TAG-1007" {...register("tag")} />
                {errors.tag ? (
                  <p className="text-xs text-red-500">{errors.tag.message}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Raza</label>
                <Input placeholder="Brahman" {...register("breed")} />
                {errors.breed ? (
                  <p className="text-xs text-red-500">{errors.breed.message}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Fecha nacimiento</label>
                <Input type="date" {...register("birthDate")} />
                {errors.birthDate ? (
                  <p className="text-xs text-red-500">{errors.birthDate.message}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Sexo</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Categoria</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
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
                {errors.origin ? (
                  <p className="text-xs text-red-500">{errors.origin.message}</p>
                ) : null}
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
                {errors.status ? (
                  <p className="text-xs text-red-500">{errors.status.message}</p>
                ) : null}
              </div>
              <div className="space-y-1">
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
                placeholder="Observaciones adicionales"
                {...register("notes")}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar animal"}
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link to="/animals">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnimalCreatePage;
