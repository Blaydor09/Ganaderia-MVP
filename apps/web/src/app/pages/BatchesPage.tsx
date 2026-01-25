import { useEffect, useState } from "react";
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
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import { formatProductType } from "@/lib/products";
import { formatDateOnlyUtc, toDateInputValue } from "@/lib/dates";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const schema = z.object({
  productId: z.string().min(1, "Requerido"),
  batchNumber: z.string().min(1, "Requerido"),
  expiresAt: z.string().min(1, "Requerido"),
  receivedAt: z.string().min(1, "Requerido"),
  supplierId: z.string().optional(),
  cost: z.number().min(0).optional(),
  quantityInitial: z.number().min(0),
  quantityAvailable: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;
const editSchema = schema.omit({ productId: true });
type EditFormValues = z.infer<typeof editSchema>;

const BatchesPage = () => {
  const queryClient = useQueryClient();
  const canCreate = hasAnyRole(Access.batchesCreate);
  const canEdit = hasAnyRole(Access.batchesUpdate);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => (await api.get("/batches?page=1&pageSize=50")).data,
  });
  const { data: products } = useQuery({
    queryKey: ["products", "batch-form"],
    queryFn: async () => (await api.get("/products?page=1&pageSize=200")).data,
  });
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", "batch-form"],
    queryFn: async () => (await api.get("/suppliers")).data,
  });

  const today = toDateInputValue(new Date());

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      receivedAt: today,
      quantityInitial: 0,
      quantityAvailable: 0,
      supplierId: "",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      batchNumber: "",
      expiresAt: "",
      receivedAt: "",
      supplierId: "",
      cost: undefined,
      quantityInitial: 0,
      quantityAvailable: 0,
    },
  });

  const quantityInitial = useWatch({ control, name: "quantityInitial" });

  useEffect(() => {
    if (!dirtyFields.quantityAvailable) {
      setValue("quantityAvailable", quantityInitial ?? 0, { shouldValidate: true });
    }
  }, [dirtyFields.quantityAvailable, quantityInitial, setValue]);

  useEffect(() => {
    if (!editingBatch) return;
    resetEdit({
      batchNumber: editingBatch.batchNumber ?? "",
      expiresAt: editingBatch.expiresAt
        ? toDateInputValue(new Date(editingBatch.expiresAt))
        : "",
      receivedAt: editingBatch.receivedAt
        ? toDateInputValue(new Date(editingBatch.receivedAt))
        : "",
      supplierId: editingBatch.supplierId ?? "",
      cost:
        editingBatch.cost === null || editingBatch.cost === undefined
          ? undefined
          : Number(editingBatch.cost),
      quantityInitial: editingBatch.quantityInitial ?? 0,
      quantityAvailable: editingBatch.quantityAvailable ?? 0,
    });
  }, [editingBatch, resetEdit]);

  const onSubmit = async (values: FormValues) => {
    const expiresAtIso = new Date(`${values.expiresAt}T00:00:00Z`).toISOString();
    const receivedAtIso = new Date(`${values.receivedAt}T00:00:00Z`).toISOString();
    try {
      await api.post("/batches", {
        productId: values.productId,
        batchNumber: values.batchNumber.trim(),
        expiresAt: expiresAtIso,
        receivedAt: receivedAtIso,
        supplierId: values.supplierId || undefined,
        cost: values.cost,
        quantityInitial: values.quantityInitial,
        quantityAvailable: values.quantityAvailable,
      });
      toast.success("Lote agregado");
      reset({
        productId: "",
        batchNumber: "",
        expiresAt: "",
        receivedAt: today,
        supplierId: "",
        cost: undefined,
        quantityInitial: 0,
        quantityAvailable: 0,
      });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "alerts"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al agregar lote");
    }
  };

  const onEditSubmit = async (values: EditFormValues) => {
    if (!editingBatch) return;
    const expiresAtIso = new Date(`${values.expiresAt}T00:00:00Z`).toISOString();
    const receivedAtIso = new Date(`${values.receivedAt}T00:00:00Z`).toISOString();
    try {
      await api.patch(`/batches/${editingBatch.id}`, {
        batchNumber: values.batchNumber.trim(),
        expiresAt: expiresAtIso,
        receivedAt: receivedAtIso,
        supplierId: values.supplierId || undefined,
        cost: values.cost,
        quantityInitial: values.quantityInitial,
        quantityAvailable: values.quantityAvailable,
      });
      toast.success("Lote actualizado");
      setIsEditOpen(false);
      setEditingBatch(null);
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "alerts"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al actualizar lote");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lotes"
        subtitle="Control por batch y vencimientos"
        actions={
          canCreate ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Agregar lote</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar lote</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Producto</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      {...register("productId")}
                    >
                      <option value="">Selecciona</option>
                      {(products?.items ?? []).map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    {errors.productId ? (
                      <p className="text-xs text-red-500">{errors.productId.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Lote</label>
                      <Input placeholder="BATCH-001" {...register("batchNumber")} />
                      {errors.batchNumber ? (
                        <p className="text-xs text-red-500">{errors.batchNumber.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Proveedor (opcional)</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        {...register("supplierId")}
                      >
                        <option value="">Sin proveedor</option>
                        {(suppliers ?? []).map((supplier: any) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Fecha recibido</label>
                      <Input type="date" {...register("receivedAt")} />
                      {errors.receivedAt ? (
                        <p className="text-xs text-red-500">{errors.receivedAt.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Vencimiento</label>
                      <Input type="date" {...register("expiresAt")} />
                      {errors.expiresAt ? (
                        <p className="text-xs text-red-500">{errors.expiresAt.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Cantidad inicial</label>
                      <Input
                        type="number"
                        min={0}
                        {...register("quantityInitial", {
                          setValueAs: (value) => (value === "" ? 0 : Number(value)),
                        })}
                      />
                      {errors.quantityInitial ? (
                        <p className="text-xs text-red-500">{errors.quantityInitial.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Disponible</label>
                      <Input
                        type="number"
                        min={0}
                        {...register("quantityAvailable", {
                          setValueAs: (value) => (value === "" ? 0 : Number(value)),
                        })}
                      />
                      {errors.quantityAvailable ? (
                        <p className="text-xs text-red-500">
                          {errors.quantityAvailable.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400">Costo (opcional)</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...register("cost", {
                          setValueAs: (value) => (value === "" ? undefined : Number(value)),
                        })}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar lote"}
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
              <TH>Producto</TH>
              <TH>Tipo</TH>
              <TH>Lote</TH>
              <TH>Vencimiento</TH>
              <TH>Stock</TH>
              <TH>Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((batch: any) => (
              <TR key={batch.id}>
                <TD>{batch.product?.name}</TD>
                <TD>{formatProductType(batch.product?.type, batch.product?.vaccineTypes)}</TD>
                <TD>{batch.batchNumber}</TD>
                <TD>{formatDateOnlyUtc(batch.expiresAt)}</TD>
                <TD>{batch.quantityAvailable}</TD>
                <TD>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBatch(batch);
                        setIsEditOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                  ) : null}
                </TD>
              </TR>
            ))}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-sm text-slate-500 dark:text-slate-400">
                  Sin lotes registrados.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingBatch(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar lote</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmitEdit(onEditSubmit)}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Lote</label>
                <Input placeholder="BATCH-001" {...registerEdit("batchNumber")} />
                {editErrors.batchNumber ? (
                  <p className="text-xs text-red-500">{editErrors.batchNumber.message}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Proveedor (opcional)
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  {...registerEdit("supplierId")}
                >
                  <option value="">Sin proveedor</option>
                  {(suppliers ?? []).map((supplier: any) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Fecha recibido
                </label>
                <Input type="date" {...registerEdit("receivedAt")} />
                {editErrors.receivedAt ? (
                  <p className="text-xs text-red-500">{editErrors.receivedAt.message}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Vencimiento</label>
                <Input type="date" {...registerEdit("expiresAt")} />
                {editErrors.expiresAt ? (
                  <p className="text-xs text-red-500">{editErrors.expiresAt.message}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Cantidad inicial
                </label>
                <Input
                  type="number"
                  min={0}
                  {...registerEdit("quantityInitial", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  })}
                />
                {editErrors.quantityInitial ? (
                  <p className="text-xs text-red-500">
                    {editErrors.quantityInitial.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Disponible</label>
                <Input
                  type="number"
                  min={0}
                  {...registerEdit("quantityAvailable", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  })}
                />
                {editErrors.quantityAvailable ? (
                  <p className="text-xs text-red-500">
                    {editErrors.quantityAvailable.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm md:col-span-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Costo (opcional)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...registerEdit("cost", {
                    setValueAs: (value) => (value === "" ? undefined : Number(value)),
                  })}
                />
              </div>
            </div>
            <Button type="submit" disabled={isEditSubmitting}>
              {isEditSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchesPage;
