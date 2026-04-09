import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDateOnlyUtc, parseDateInputToUtcIso, toDateInputValue } from "@/lib/dates";
import type { ProductListResponse } from "@/lib/types";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const schema = z.object({
  productId: z.string().min(1, "Requerido"),
  expiresAt: z.string().min(1, "Requerido"),
  receivedAt: z.string().min(1, "Requerido"),
  quantityInitial: z.number().min(0),
  quantityAvailable: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;

const editSchema = z.object({
  expiresAt: z.string().min(1, "Requerido"),
  receivedAt: z.string().min(1, "Requerido"),
});

type EditFormValues = z.infer<typeof editSchema>;

type BatchItem = {
  id: string;
  productId: string;
  batchNumber: string;
  expiresAt: string;
  receivedAt: string;
  quantityInitial: number;
  quantityAvailable: number;
  product?: {
    id: string;
    name: string;
    type?: string | null;
    vaccineTypes?: string[];
    unit?: string;
  } | null;
};

type BatchListResponse = {
  items: BatchItem[];
  total: number;
  page: number;
  pageSize: number;
};

type BatchStatusFilter = "ALL" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "OUT_OF_STOCK";

const statusOptions: Array<{ value: BatchStatusFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "ACTIVE", label: "Vigentes" },
  { value: "EXPIRING", label: "Por vencer (30 dias)" },
  { value: "EXPIRED", label: "Vencidos" },
  { value: "OUT_OF_STOCK", label: "Agotados" },
];

const getBatchStatus = (batch: BatchItem): { label: string; variant: "success" | "warning" | "danger" } => {
  if (batch.quantityAvailable <= 0) {
    return { label: "Agotado", variant: "warning" };
  }
  const expiresAt = new Date(batch.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return { label: "Sin fecha valida", variant: "warning" };
  }
  const now = new Date();
  if (expiresAt <= now) {
    return { label: "Vencido", variant: "danger" };
  }
  const soon30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiresAt <= soon30) {
    return { label: "Por vencer", variant: "warning" };
  }
  return { label: "Vigente", variant: "success" };
};

const BatchesPage = () => {
  const queryClient = useQueryClient();
  const canCreate = hasAnyRole(Access.batchesCreate);
  const canEdit = hasAnyRole(Access.batchesUpdate);
  const canDelete = hasAnyRole(Access.batchesDelete);

  const pageSize = 20;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BatchStatusFilter>("ALL");
  const [editingBatch, setEditingBatch] = useState<BatchItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const listQueryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    const normalizedSearch = search.trim();
    if (normalizedSearch.length > 0) {
      params.set("search", normalizedSearch);
    }
    if (status !== "ALL") {
      params.set("status", status);
    }
    return params.toString();
  }, [page, pageSize, search, status]);

  const { data, isFetching } = useQuery({
    queryKey: ["batches", page, pageSize, search, status],
    queryFn: async () => (await api.get(`/batches?${listQueryString}`)).data as BatchListResponse,
  });

  const { data: products } = useQuery({
    queryKey: ["products", "batch-form"],
    queryFn: async () => (await api.get("/products?page=1&pageSize=200")).data as ProductListResponse,
  });

  const totalItems = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
      productId: "",
      expiresAt: "",
      receivedAt: today,
      quantityInitial: 0,
      quantityAvailable: 0,
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
      expiresAt: "",
      receivedAt: "",
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
      expiresAt: editingBatch.expiresAt ? toDateInputValue(new Date(editingBatch.expiresAt)) : "",
      receivedAt: editingBatch.receivedAt ? toDateInputValue(new Date(editingBatch.receivedAt)) : "",
    });
  }, [editingBatch, resetEdit]);

  const invalidateBatchQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["batches"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory", "alerts"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory", "summary"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory", "transactions"] }),
    ]);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/batches", {
        productId: values.productId,
        expiresAt: parseDateInputToUtcIso(values.expiresAt),
        receivedAt: parseDateInputToUtcIso(values.receivedAt),
        quantityInitial: values.quantityInitial,
        quantityAvailable: values.quantityAvailable,
      });
      toast.success("Lote registrado");
      reset({
        productId: "",
        expiresAt: "",
        receivedAt: today,
        quantityInitial: 0,
        quantityAvailable: 0,
      });
      setPage(1);
      await invalidateBatchQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al registrar lote");
    }
  };

  const onEditSubmit = async (values: EditFormValues) => {
    if (!editingBatch) return;
    try {
      await api.patch(`/batches/${editingBatch.id}`, {
        expiresAt: parseDateInputToUtcIso(values.expiresAt),
        receivedAt: parseDateInputToUtcIso(values.receivedAt),
      });
      toast.success("Lote actualizado");
      setIsEditOpen(false);
      setEditingBatch(null);
      await invalidateBatchQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al actualizar lote");
    }
  };

  const onDelete = async (batch: BatchItem) => {
    if (!canDelete) return;
    const confirmed = window.confirm(
      `Se archivara el lote "${batch.batchNumber}". Solo hazlo cuando no tenga stock ni movimientos.`
    );
    if (!confirmed) return;
    try {
      setDeletingBatchId(batch.id);
      await api.delete(`/batches/${batch.id}`);
      toast.success("Lote archivado");
      await invalidateBatchQueries();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No se pudo archivar el lote");
    } finally {
      setDeletingBatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lotes"
        subtitle="Paso 2: registra cada compra por lote para controlar vencimiento y existencias."
        actions={
          canCreate ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Agregar lote</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar lote</DialogTitle>
                </DialogHeader>
                <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
                  <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                    El sistema asigna el codigo del lote automaticamente.
                  </p>
                  <div className="space-y-1 text-sm">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Medicamento</label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      {...register("productId")}
                    >
                      <option value="">Selecciona</option>
                      {(products?.items ?? []).map((product) => (
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
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Fecha de ingreso
                      </label>
                      <Input type="date" {...register("receivedAt")} />
                      {errors.receivedAt ? (
                        <p className="text-xs text-red-500">{errors.receivedAt.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Fecha de vencimiento
                      </label>
                      <Input type="date" {...register("expiresAt")} />
                      {errors.expiresAt ? (
                        <p className="text-xs text-red-500">{errors.expiresAt.message}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Cantidad inicial
                      </label>
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
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Cantidad disponible
                      </label>
                      <Input
                        type="number"
                        min={0}
                        {...register("quantityAvailable", {
                          setValueAs: (value) => (value === "" ? 0 : Number(value)),
                        })}
                      />
                      {errors.quantityAvailable ? (
                        <p className="text-xs text-red-500">{errors.quantityAvailable.message}</p>
                      ) : null}
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300 md:col-span-2">
                      Cantidad inicial: total que entra con el lote. Cantidad disponible: lo que queda utilizable para tratamientos o movimientos.
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

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="grid gap-3 md:grid-cols-[1fr_260px_auto] md:items-center">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por medicamento o lote"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as BatchStatusFilter);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isFetching ? "Actualizando..." : `${totalItems} registros`}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
        <Table>
          <THead>
            <TR>
              <TH>Medicamento</TH>
              <TH>Estado</TH>
              <TH>Tipo</TH>
              <TH>Lote</TH>
              <TH>Vence</TH>
              <TH>Disponible</TH>
              <TH>Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.items ?? []).map((batch) => {
              const statusInfo = getBatchStatus(batch);
              return (
                <TR key={batch.id}>
                  <TD>{batch.product?.name ?? "-"}</TD>
                  <TD>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TD>
                  <TD>{formatProductType(batch.product?.type ?? undefined, batch.product?.vaccineTypes)}</TD>
                  <TD>{batch.batchNumber}</TD>
                  <TD>{formatDateOnlyUtc(batch.expiresAt)}</TD>
                  <TD>{batch.quantityAvailable}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
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
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/30"
                          disabled={deletingBatchId === batch.id}
                          onClick={() => onDelete(batch)}
                        >
                          {deletingBatchId === batch.id ? "Archivando..." : "Archivar"}
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              );
            })}
            {(data?.items ?? []).length === 0 ? (
              <TR>
                <TD colSpan={7} className="text-sm text-slate-500 dark:text-slate-400">
                  Sin lotes en la vista actual.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
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
            setEditingBatch(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar lote</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmitEdit(onEditSubmit)}>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              Lote asignado: <strong>{editingBatch?.batchNumber ?? "-"}</strong>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">Fecha de ingreso</label>
                <Input type="date" {...registerEdit("receivedAt")} />
                {editErrors.receivedAt ? (
                  <p className="text-xs text-red-500">{editErrors.receivedAt.message}</p>
                ) : null}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  Fecha de vencimiento
                </label>
                <Input type="date" {...registerEdit("expiresAt")} />
                {editErrors.expiresAt ? (
                  <p className="text-xs text-red-500">{editErrors.expiresAt.message}</p>
                ) : null}
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
