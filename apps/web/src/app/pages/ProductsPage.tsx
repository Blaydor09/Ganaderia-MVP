import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import { productTypeOptions } from "@/lib/products";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const productTypeValues = [
  "VITAMINAS",
  "ANTIBIOTICOS",
  "DESPARASITANTE",
  "VACUNAS",
] as const;
const productTypeSchema = z.enum(productTypeValues);
const recommendedRouteValues = ["subcutanea", "intramuscular"] as const;
const recommendedRouteSchema = z.enum(recommendedRouteValues);

const parseVaccineTypes = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const schema = z
  .object({
    name: z.string().min(1, "Requerido"),
    type: productTypeSchema.optional(),
    vaccineTypes: z.string().optional(),
    recommendedRoute: recommendedRouteSchema,
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "VACUNAS") {
      const vaccines = parseVaccineTypes(values.vaccineTypes);
      if (vaccines.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Requerido",
          path: ["vaccineTypes"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const canCreate = hasAnyRole(Access.productsCreate);
  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products?page=1&pageSize=50")).data,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: undefined,
      vaccineTypes: "",
      recommendedRoute: "subcutanea",
    },
  });

  const selectedType = watch("type");

  const onSubmit = async (values: FormValues) => {
    try {
      const vaccineTypes = parseVaccineTypes(values.vaccineTypes);
      await api.post("/products", {
        name: values.name.trim(),
        type: values.type,
        vaccineTypes: values.type === "VACUNAS" ? vaccineTypes : undefined,
        recommendedRoute: values.recommendedRoute,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Medicamento creado");
      reset();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", "batch-form"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear medicamento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicamentos"
        subtitle="Catalogo de productos"
        actions={
          canCreate ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Nuevo producto</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo medicamento</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Nombre</label>
                      <Input placeholder="Ej: Ivermectina" {...register("name")} />
                      {errors.name ? (
                        <p className="text-xs text-red-500">{errors.name.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Tipo (opcional)</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register("type", {
                          setValueAs: (value) => (value === "" ? undefined : value),
                        })}
                      >
                        <option value="">Sin tipo</option>
                        {productTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedType === "VACUNAS" ? (
                      <div className="space-y-1 text-sm md:col-span-2">
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Tipos de vacuna (separados por coma)
                        </label>
                        <Input
                          placeholder="Ej: clostridiales, aftosa"
                          {...register("vaccineTypes")}
                        />
                        {errors.vaccineTypes ? (
                          <p className="text-xs text-red-500">
                            {errors.vaccineTypes.message}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Via recomendada
                      </label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register("recommendedRoute")}
                      >
                        <option value="subcutanea">Subcutanea</option>
                        <option value="intramuscular">Intramuscular</option>
                      </select>
                      {errors.recommendedRoute ? (
                        <p className="text-xs text-red-500">
                          {errors.recommendedRoute.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Notas (opcional)
                      </label>
                      <textarea
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                        placeholder="Observaciones adicionales"
                        {...register("notes")}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar medicamento"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data?.items ?? []).map((product: any) => (
          <Card key={product.id}>
            <CardContent className="space-y-2">
              <h3 className="font-display text-lg font-semibold">{product.name}</h3>
              {product.recommendedRoute ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Via recomendada: {product.recommendedRoute}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {(data?.items ?? []).length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-500 dark:text-slate-400">
              Sin productos. Agrega el primer medicamento.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default ProductsPage;
