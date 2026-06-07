import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Access } from "@/lib/access";
import { hasAnyRole } from "@/lib/auth";
import { formatDateOnlyUtc } from "@/lib/dates";
import type {
  InventoryAlertsResponse,
  ProductItem,
  ProductListResponse,
  InventorySummaryResponse,
  InventoryTransactionListResponse,
} from "@/lib/types";

const reasonTypeValues = [
  "conteo_fisico",
  "ajuste_inicial",
  "merma",
  "correccion_registro",
] as const;

const reasonTypeLabels: Record<(typeof reasonTypeValues)[number], string> = {
  conteo_fisico: "Conteo fisico",
  ajuste_inicial: "Ajuste inicial",
  merma: "Merma o desperdicio",
  correccion_registro: "Correccion de registro",
};

const adjustSchema = z.object({
  quantityAvailable: z.number().min(0),
  reasonType: z.enum(reasonTypeValues),
  reasonNotes: z.string().optional(),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;
type BatchStatusFilter = "ALL" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "OUT_OF_STOCK";

const statusOptions: Array<{ value: BatchStatusFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "ACTIVE", label: "Vigentes" },
  { value: "EXPIRING", label: "Por vencer (30 dias)" },
  { value: "EXPIRED", label: "Vencidos" },
  { value: "OUT_OF_STOCK", label: "Agotados" },
];

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseMessage = (error as AxiosError<{ message?: string }>)?.response?.data?.message;
  return responseMessage ?? fallback;
};

const getProductStatus = (product: ProductItem): { label: string; variant: "success" | "warning" | "danger" } => {
  if (product.stockAvailable <= 0) {
    return { label: "Agotado", variant: "warning" };
  }
  if (!product.expiresAt) {
    return { label: "Vigente", variant: "success" };
  }
  const expiresAt = new Date(product.expiresAt);
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

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-NI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const InventoryPage = () => {
  const queryClient = useQueryClient();
  const canAdjust = hasAnyRole(Access.inventoryAdjust);

  const [adjustingProduct, setAdjustingProduct] = useState<ProductItem | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const prodPageSize = 20;
  const [prodPage, setProdPage] = useState(1);
  const [prodSearch, setProdSearch] = useState("");
  const [prodStatus, setProdStatus] = useState<BatchStatusFilter>("ALL");

  const txPageSize = 12;
  const [txPage, setTxPage] = useState(1);
  const [txSearch, setTxSearch] = useState("");

  const prodQueryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(prodPage),
      pageSize: String(prodPageSize),
    });
    const normalizedSearch = prodSearch.trim();
    if (normalizedSearch.length > 0) {
      params.set("search", normalizedSearch);
    }
    if (prodStatus !== "ALL") {
      params.set("status", prodStatus);
    }
    return params.toString();
  }, [prodPage, prodPageSize, prodSearch, prodStatus]);

  const txQueryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(txPage),
      pageSize: String(txPageSize),
    });
    const normalizedSearch = txSearch.trim();
    if (normalizedSearch.length > 0) {
      params.set("search", normalizedSearch);
    }
    return params.toString();
  }, [txPage, txPageSize, txSearch]);

  const { data: summary } = useQuery({
    queryKey: ["inventory", "summary"],
    queryFn: async () => (await api.get("/inventory/summary")).data as InventorySummaryResponse,
  });

  const { data: products, isFetching: isProductsFetching } = useQuery({
    queryKey: ["inventory", prodPage, prodPageSize, prodSearch, prodStatus],
    queryFn: async () => (await api.get(`/inventory?${prodQueryString}`)).data as ProductListResponse,
  });

  const { data: alerts } = useQuery({
    queryKey: ["inventory", "alerts"],
    queryFn: async () => (await api.get("/inventory/alerts")).data as InventoryAlertsResponse,
  });

  const { data: transactions, isFetching: isTxFetching } = useQuery({
    queryKey: ["inventory", "transactions", txPage, txPageSize, txSearch],
    queryFn: async () =>
      (await api.get(`/inventory/transactions?${txQueryString}`)).data as InventoryTransactionListResponse,
  });

  const totalProdPages = Math.max(1, Math.ceil((products?.total ?? 0) / prodPageSize));
  const totalTxPages = Math.max(1, Math.ceil((transactions?.total ?? 0) / txPageSize));

  useEffect(() => {
    if (prodPage > totalProdPages) {
      setProdPage(totalProdPages);
    }
  }, [prodPage, totalProdPages]);

  useEffect(() => {
    if (txPage > totalTxPages) {
      setTxPage(totalTxPages);
    }
  }, [txPage, totalTxPages]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      quantityAvailable: 0,
      reasonType: "conteo_fisico",
      reasonNotes: "",
    },
  });

  useEffect(() => {
    if (!adjustingProduct) return;
    reset({
      quantityAvailable: adjustingProduct.stockAvailable ?? 0,
      reasonType: "conteo_fisico",
      reasonNotes: "",
    });
  }, [adjustingProduct, reset]);

  const onAdjustSubmit = async (values: AdjustFormValues) => {
    if (!adjustingProduct) return;

    const currentAvailable = Number(adjustingProduct.stockAvailable ?? 0);
    const nextAvailable = Number(values.quantityAvailable);
    const delta = nextAvailable - currentAvailable;

    if (delta === 0) {
      toast.message("No hay cambios de stock");
      setIsAdjustOpen(false);
      setAdjustingProduct(null);
      return;
    }

    const reasonBase = reasonTypeLabels[values.reasonType];
    const details = values.reasonNotes?.trim();
    const reason = details ? `${reasonBase}: ${details}` : reasonBase;

    try {
      await api.post("/inventory/transactions", {
        productId: adjustingProduct.id,
        type: delta > 0 ? "IN" : "OUT",
        quantity: Math.abs(delta),
        unit: adjustingProduct.unit ?? "dosis",
        occurredAt: new Date().toISOString(),
        reason,
      });
      toast.success("Ajuste aplicado");
      setIsAdjustOpen(false);
      setAdjustingProduct(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Error al ajustar stock"));
    }
  };

  const expiring = alerts?.expiring ?? [];
  const lowStock = alerts?.lowStock ?? [];
  const prodRows = products?.items ?? [];
  const txRows = transactions?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        subtitle="Paso 3: monitorea alertas, ajusta existencias y revisa movimientos."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Medicamentos por vencer</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-semibold">{expiring.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              7 dias: {alerts?.expiring7?.length ?? 0} | 15 dias: {alerts?.expiring15?.length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Productos en minimo</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-semibold">{lowStock.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Revisar reposicion para evitar quiebres.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Movimientos recientes</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-semibold">{transactions?.total ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historial de entradas y salidas.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Resumen por medicamento</p>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="flex flex-col gap-3 md:hidden">
            {(summary?.items ?? []).map((row) => {
              const isLow = row.total <= row.product.minStock;
              return (
                <div
                  key={row.product.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-medium">{row.product.name}</p>
                    <Badge variant={isLow ? "warning" : "success"}>
                      {isLow ? "En minimo" : "Normal"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Disponible</span>
                    <span className="font-medium">
                      {row.total} {row.product.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Stock minimo</span>
                    <span className="font-medium">
                      {row.product.minStock} {row.product.unit}
                    </span>
                  </div>
                </div>
              );
            })}
            {(summary?.items ?? []).length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay productos en inventario.
              </div>
            ) : null}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <Table>
              <THead>
                <TR>
                  <TH>Medicamento</TH>
                  <TH>Disponible</TH>
                  <TH>Stock minimo</TH>
                  <TH>Estado</TH>
                </TR>
              </THead>
              <TBody>
                {(summary?.items ?? []).map((row) => {
                  const isLow = row.total <= row.product.minStock;
                  return (
                    <TR key={row.product.id}>
                      <TD>{row.product.name}</TD>
                      <TD>
                        {row.total} {row.product.unit}
                      </TD>
                      <TD>
                        {row.product.minStock} {row.product.unit}
                      </TD>
                      <TD>
                        <Badge variant={isLow ? "warning" : "success"}>
                          {isLow ? "En minimo" : "Normal"}
                        </Badge>
                      </TD>
                    </TR>
                  );
                })}
                {(summary?.items ?? []).length === 0 ? (
                  <TR>
                    <TD colSpan={4} className="text-sm text-slate-500 dark:text-slate-400">
                      No hay productos en inventario.
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Medicamentos en bodega</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_260px_auto] md:items-center">
            <Input
              value={prodSearch}
              onChange={(event) => {
                setProdSearch(event.target.value);
                setProdPage(1);
              }}
              placeholder="Buscar por medicamento..."
            />
            <select
              value={prodStatus}
              onChange={(event) => {
                setProdStatus(event.target.value as BatchStatusFilter);
                setProdPage(1);
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
              {isProductsFetching ? "Actualizando..." : `${products?.total ?? 0} registros`}
            </p>
          </div>

          {prodRows.length === 0 ? (
            <EmptyState
              title="Sin medicamentos en la vista actual"
              description="Ajusta filtros o registra nuevos medicamentos."
            />
          ) : (
            <>
              {/* Mobile View */}
              <div className="flex flex-col gap-3 md:hidden">
                {prodRows.map((product) => {
                  const statusInfo = getProductStatus(product);
                  return (
                    <div
                      key={product.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Unidad: {product.unit}
                          </p>
                        </div>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Vencimiento</p>
                          <p className="font-medium">
                            {product.expiresAt ? formatDateOnlyUtc(product.expiresAt) : "Sin fecha"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Disponible</p>
                          <p className="font-medium">
                            {product.stockAvailable} {product.unit}
                          </p>
                        </div>
                      </div>
                      {canAdjust && (
                        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setAdjustingProduct(product);
                              setIsAdjustOpen(true);
                            }}
                          >
                            Ajustar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <Table>
                  <THead>
                    <TR>
                      <TH>Medicamento</TH>
                      <TH>Estado</TH>
                      <TH>Vencimiento</TH>
                      <TH>Disponible</TH>
                      <TH>Acciones</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {prodRows.map((product) => {
                      const statusInfo = getProductStatus(product);
                      return (
                        <TR key={product.id}>
                          <TD>{product.name}</TD>
                          <TD>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </TD>
                          <TD>{product.expiresAt ? formatDateOnlyUtc(product.expiresAt) : "Sin fecha"}</TD>
                          <TD>
                            {product.stockAvailable} {product.unit}
                          </TD>
                          <TD>
                            {canAdjust ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAdjustingProduct(product);
                                  setIsAdjustOpen(true);
                                }}
                              >
                                Ajustar
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={prodPage <= 1}
              onClick={() => setProdPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Pagina {prodPage} de {totalProdPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={prodPage >= totalProdPages}
              onClick={() => setProdPage((current) => Math.min(totalProdPages, current + 1))}
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Historial de movimientos</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <Input
              value={txSearch}
              onChange={(event) => {
                setTxSearch(event.target.value);
                setTxPage(1);
              }}
              placeholder="Buscar por medicamento, lote o motivo"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isTxFetching ? "Actualizando..." : `${transactions?.total ?? 0} movimientos`}
            </p>
          </div>
          {/* Mobile View */}
          <div className="flex flex-col gap-3 md:hidden">
            {txRows.map((tx) => (
              <div
                key={tx.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{tx.product?.name ?? "-"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(tx.occurredAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      tx.type === "IN"
                        ? "success"
                        : tx.type === "OUT"
                          ? "warning"
                          : "default"
                    }
                  >
                    {tx.type === "IN" ? "Entrada" : tx.type === "OUT" ? "Salida" : "Ajuste"}
                  </Badge>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Lote</p>
                    <p className="font-medium">{tx.batch?.batchNumber ?? "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cantidad</p>
                    <p className="font-medium">
                      {tx.quantity} {tx.unit}
                    </p>
                  </div>
                </div>
                {tx.reason && (
                  <div className="rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
                    <span className="font-medium">Motivo:</span> {tx.reason}
                  </div>
                )}
              </div>
            ))}
            {txRows.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Sin movimientos para la busqueda actual.
              </div>
            ) : null}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Medicamento</TH>
                  <TH>Lote</TH>
                  <TH>Tipo</TH>
                  <TH>Cantidad</TH>
                  <TH>Motivo</TH>
                </TR>
              </THead>
              <TBody>
                {txRows.map((tx) => (
                  <TR key={tx.id}>
                    <TD>{formatDateTime(tx.occurredAt)}</TD>
                    <TD>{tx.product?.name ?? "-"}</TD>
                    <TD>{tx.batch?.batchNumber ?? "-"}</TD>
                    <TD>
                      <Badge
                        variant={
                          tx.type === "IN"
                            ? "success"
                            : tx.type === "OUT"
                              ? "warning"
                              : "default"
                        }
                      >
                        {tx.type === "IN" ? "Entrada" : tx.type === "OUT" ? "Salida" : "Ajuste"}
                      </Badge>
                    </TD>
                    <TD>
                      {tx.quantity} {tx.unit}
                    </TD>
                    <TD>{tx.reason || "-"}</TD>
                  </TR>
                ))}
                {txRows.length === 0 ? (
                  <TR>
                    <TD colSpan={6} className="text-sm text-slate-500 dark:text-slate-400">
                      Sin movimientos para la busqueda actual.
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={txPage <= 1}
              onClick={() => setTxPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Pagina {txPage} de {totalTxPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={txPage >= totalTxPages}
              onClick={() => setTxPage((current) => Math.min(totalTxPages, current + 1))}
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isAdjustOpen}
        onOpenChange={(open) => {
          setIsAdjustOpen(open);
          if (!open) {
            setAdjustingProduct(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar existencias de {adjustingProduct?.name}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmit(onAdjustSubmit)}>
            <div className="space-y-1 text-sm">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Cantidad disponible ({adjustingProduct?.unit})
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
            <div className="space-y-1 text-sm">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Motivo del ajuste
              </label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                {...register("reasonType")}
              >
                {reasonTypeValues.map((value) => (
                  <option key={value} value={value}>
                    {reasonTypeLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Detalle (opcional)
              </label>
              <Input placeholder="Ej: conteo semanal de bodega" {...register("reasonNotes")} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar ajuste"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
