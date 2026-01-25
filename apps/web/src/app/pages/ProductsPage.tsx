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
    activeIngredient: z.string().min(1, "Requerido"),
    presentation: z.string().min(1, "Requerido"),
    concentration: z.string().min(1, "Requerido"),
    unit: z.string().min(1, "Requerido"),
    meatWithdrawalDays: z.number().int().min(0),
    milkWithdrawalDays: z.number().int().min(0),
    requiresPrescription: z.boolean().optional(),
    recommendedRoute: z.string().optional(),
    typicalDose: z.string().optional(),
    notes: z.string().optional(),
    minStock: z.number().int().min(0).optional(),
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
      requiresPrescription: false,
      unit: "dosis",
      minStock: undefined,
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
        activeIngredient: values.activeIngredient.trim(),
        presentation: values.presentation.trim(),
        concentration: values.concentration.trim(),
        unit: values.unit.trim(),
        meatWithdrawalDays: values.meatWithdrawalDays,
        milkWithdrawalDays: values.milkWithdrawalDays,
        requiresPrescription: values.requiresPrescription,
        recommendedRoute: values.recommendedRoute?.trim() || undefined,
        typicalDose: values.typicalDose?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        minStock: values.minStock,
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
        subtitle="Catalogo de productos y retiros"
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
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Principio activo
                      </label>
                      <Input placeholder="Ej: Ivermectina" {...register("activeIngredient")} />
                      {errors.activeIngredient ? (
                        <p className="text-xs text-red-500">
                          {errors.activeIngredient.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Presentacion
                      </label>
                      <Input placeholder="Ej: Frasco 50 ml" {...register("presentation")} />
                      {errors.presentation ? (
                        <p className="text-xs text-red-500">
                          {errors.presentation.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Concentracion
                      </label>
                      <Input placeholder="Ej: 1%" {...register("concentration")} />
                      {errors.concentration ? (
                        <p className="text-xs text-red-500">
                          {errors.concentration.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Unidad
                      </label>
                      <Input placeholder="Ej: dosis" {...register("unit")} />
                      {errors.unit ? (
                        <p className="text-xs text-red-500">{errors.unit.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Retiro carne (dias)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        {...register("meatWithdrawalDays", {
                          setValueAs: (value) => (value === "" ? 0 : Number(value)),
                        })}
                      />
                      {errors.meatWithdrawalDays ? (
                        <p className="text-xs text-red-500">
                          {errors.meatWithdrawalDays.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Retiro leche (dias)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        {...register("milkWithdrawalDays", {
                          setValueAs: (value) => (value === "" ? 0 : Number(value)),
                        })}
                      />
                      {errors.milkWithdrawalDays ? (
                        <p className="text-xs text-red-500">
                          {errors.milkWithdrawalDays.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Stock minimo (opcional)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        {...register("minStock", {
                          setValueAs: (value) =>
                            value === "" ? undefined : Number(value),
                        })}
                      />
                      {errors.minStock ? (
                        <p className="text-xs text-red-500">{errors.minStock.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Requiere receta
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          {...register("requiresPrescription")}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 dark:border-slate-600"
                        />
                        <span>Si</span>
                      </label>
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Via recomendada (opcional)
                      </label>
                      <Input placeholder="Ej: Subcutanea" {...register("recommendedRoute")} />
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Dosis tipica (opcional)
                      </label>
                      <Input placeholder="Ej: 1 dosis/50kg" {...register("typicalDose")} />
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Principio: {product.activeIngredient}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Retiro carne: {product.meatWithdrawalDays} dias
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Retiro leche: {product.milkWithdrawalDays} dias
              </p>
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
