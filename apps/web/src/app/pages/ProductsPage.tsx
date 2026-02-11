import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { getProductTypeLabel, productTypeOptions } from "@/lib/products";
import type { ProductItem, ProductListResponse } from "@/lib/types";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pill, Trash2, Pencil } from "lucide-react";

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

const normalizeProductName = (value: string) => value.trim().replace(/\s+/g, " ");

const baseFormSchema = z
  .object({
    name: z.string().min(1, "Requerido"),
    type: productTypeSchema.optional(),
    vaccineTypes: z.string().optional(),
    unit: z.string().min(1, "Requerido"),
    minStock: z.number().int().min(0, "No puede ser negativo"),
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

type FormValues = z.infer<typeof baseFormSchema>;

const routeLabels: Record<string, string> = {
  subcutanea: "Subcutanea",
  intramuscular: "Intramuscular",
};

const getRouteLabel = (value?: string | null) =>
  (value ? routeLabels[value] ?? value : "Sin via definida");

const formatVaccineTypesInput = (value?: string[]) => (value ?? []).join(", ");

const defaultValues: FormValues = {
  name: "",
  type: undefined,
  vaccineTypes: "",
  unit: "dosis",
  minStock: 0,
  recommendedRoute: "subcutanea",
  notes: "",
};

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const canCreate = hasAnyRole(Access.productsCreate);
  const canEdit = hasAnyRole(Access.productsUpdate);
  const canDelete = hasAnyRole(Access.productsDelete);

  const pageSize = 12;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    const normalizedSearch = search.trim();
    if (normalizedSearch.length > 0) {
      params.set("search", normalizedSearch);
    }
    return params.toString();
  }, [page, pageSize, search]);

  const { data, isFetching } = useQuery({
    queryKey: ["products", page, pageSize, search],
    queryFn: async () =>
      (await api.get(`/products?${queryString}`)).data as ProductListResponse,
  });

  const totalItems = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(baseFormSchema),
    defaultValues,
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors, isSubmitting: isEditingSubmitting },
    reset: resetEdit,
    watch: watchEdit,
  } = useForm<FormValues>({
    resolver: zodResolver(baseFormSchema),
    defaultValues,
  });

  const selectedType = watch("type");
  const selectedEditType = watchEdit("type");

  useEffect(() => {
    if (!editingProduct) return;
    resetEdit({
      name: editingProduct.name,
      type: (editingProduct.type ?? undefined) as FormValues["type"],
      vaccineTypes: formatVaccineTypesInput(editingProduct.vaccineTypes),
      unit: editingProduct.unit || "dosis",
      minStock: Number(editingProduct.minStock ?? 0),
      recommendedRoute:
        (editingProduct.recommendedRoute as FormValues["recommendedRoute"]) ??
        "subcutanea",
      notes: editingProduct.notes ?? "",
    });
  }, [editingProduct, resetEdit]);

  const invalidateProductQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["products", "batch-form"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory", "alerts"] }),
    ]);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const vaccineTypes = parseVaccineTypes(values.vaccineTypes);
      await api.post("/products", {
        name: normalizeProductName(values.name),
        type: values.type,
        vaccineTypes: values.type === "VACUNAS" ? vaccineTypes : undefined,
        unit: values.unit.trim(),
        minStock: values.minStock,
        recommendedRoute: values.recommendedRoute,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Medicamento creado");
      reset(defaultValues);
      setPage(1);
      await invalidateProductQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al crear medicamento");
    }
  };

  const onEditSubmit = async (values: FormValues) => {
    if (!editingProduct) return;
    try {
      const vaccineTypes = parseVaccineTypes(values.vaccineTypes);
      await api.patch(`/products/${editingProduct.id}`, {
        name: normalizeProductName(values.name),
        type: values.type,
        vaccineTypes: values.type === "VACUNAS" ? vaccineTypes : [],
        unit: values.unit.trim(),
        minStock: values.minStock,
        recommendedRoute: values.recommendedRoute,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Medicamento actualizado");
      setIsEditOpen(false);
      setEditingProduct(null);
      await invalidateProductQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al actualizar medicamento");
    }
  };

  const onDelete = async (product: ProductItem) => {
    if (!canDelete) return;
    const confirmed = window.confirm(
      `Se archivara "${product.name}". Solo usa esta opcion cuando sea un duplicado o error de captura.`
    );
    if (!confirmed) return;

    try {
      setDeletingProductId(product.id);
      await api.delete(`/products/${product.id}`);
      toast.success("Medicamento archivado");
      await invalidateProductQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al archivar medicamento");
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicamentos"
        subtitle="Paso 1: define el catalogo base que usaras en lotes e inventario."
        actions={
          canCreate ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Nuevo medicamento</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo medicamento</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Nombre</label>
                      <Input placeholder="Ej: Ivermectina 1%" {...register("name")} />
                      {errors.name ? (
                        <p className="text-xs text-red-500">{errors.name.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Tipo (opcional)
                      </label>
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
                          <p className="text-xs text-red-500">{errors.vaccineTypes.message}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Unidad de medida
                      </label>
                      <Input placeholder="Ej: dosis, ml" {...register("unit")} />
                      {errors.unit ? (
                        <p className="text-xs text-red-500">{errors.unit.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Stock minimo
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        {...register("minStock", {
                          setValueAs: (value) => (value === "" ? 0 : Number(value)),
                        })}
                      />
                      {errors.minStock ? (
                        <p className="text-xs text-red-500">{errors.minStock.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Via sugerida de aplicacion
                      </label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register("recommendedRoute")}
                      >
                        <option value="subcutanea">Subcutanea</option>
                        <option value="intramuscular">Intramuscular</option>
                      </select>
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Notas (opcional)
                      </label>
                      <textarea
                        className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                        placeholder="Indicaciones para el equipo"
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

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar medicamento por nombre"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isFetching ? "Actualizando..." : `${totalItems} registros`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data?.items ?? []).map((product) => (
          <Card
            key={product.id}
            className="group border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:from-slate-900/90 dark:to-slate-900/70"
          >
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Medicamento
                  </p>
                  <h3 className="truncate font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {product.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg px-2"
                      onClick={() => {
                        setEditingProduct(product);
                        setIsEditOpen(true);
                      }}
                      aria-label={`Editar ${product.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/30"
                      disabled={deletingProductId === product.id}
                      onClick={() => onDelete(product)}
                      aria-label={`Archivar ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <Pill className="mr-1 h-3.5 w-3.5" />
                  {getProductTypeLabel(product.type ?? undefined)}
                </Badge>
                <Badge className="border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Unidad: {product.unit}
                </Badge>
                <Badge className="border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Minimo: {product.minStock} {product.unit}
                </Badge>
                <Badge className="border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Via: {getRouteLabel(product.recommendedRoute)}
                </Badge>
              </div>

              {product.type === "VACUNAS" && product.vaccineTypes.length > 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vacunas: {product.vaccineTypes.join(", ")}
                </p>
              ) : null}
              {product.notes ? (
                <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                  {product.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {(data?.items ?? []).length === 0 ? (
          <Card>
            <CardContent className="text-sm text-slate-500 dark:text-slate-400">
              Sin resultados. Ajusta la busqueda o crea un medicamento nuevo.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Anterior
        </Button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Pagina {page} de {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Siguiente
        </Button>
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingProduct(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar medicamento</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmitEdit(onEditSubmit)}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Nombre</label>
                <Input placeholder="Ej: Ivermectina 1%" {...registerEdit("name")} />
                {editErrors.name ? (
                  <p className="text-xs text-red-500">{editErrors.name.message}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Tipo (opcional)
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  {...registerEdit("type", {
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
              {selectedEditType === "VACUNAS" ? (
                <div className="space-y-1 text-sm md:col-span-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Tipos de vacuna (separados por coma)
                  </label>
                  <Input
                    placeholder="Ej: clostridiales, aftosa"
                    {...registerEdit("vaccineTypes")}
                  />
                  {editErrors.vaccineTypes ? (
                    <p className="text-xs text-red-500">{editErrors.vaccineTypes.message}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Unidad de medida
                </label>
                <Input placeholder="Ej: dosis, ml" {...registerEdit("unit")} />
                {editErrors.unit ? (
                  <p className="text-xs text-red-500">{editErrors.unit.message}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Stock minimo
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  {...registerEdit("minStock", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  })}
                />
                {editErrors.minStock ? (
                  <p className="text-xs text-red-500">{editErrors.minStock.message}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm md:col-span-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Via sugerida de aplicacion
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  {...registerEdit("recommendedRoute")}
                >
                  <option value="subcutanea">Subcutanea</option>
                  <option value="intramuscular">Intramuscular</option>
                </select>
              </div>
              <div className="space-y-1 text-sm md:col-span-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Notas (opcional)
                </label>
                <textarea
                  className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-brand-500"
                  placeholder="Indicaciones para el equipo"
                  {...registerEdit("notes")}
                />
              </div>
            </div>
            <Button type="submit" disabled={isEditingSubmitting}>
              {isEditingSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
