import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
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
import type { InventoryAlertsResponse, InventoryBatch } from "@/lib/types";

const adjustSchema = z.object({
  quantityAvailable: z.number().min(0),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseMessage = (error as AxiosError<{ message?: string }>)?.response?.data?.message;
  return responseMessage ?? fallback;
};

const InventoryPage = () => {
  const queryClient = useQueryClient();
  const canAdjust = hasAnyRole(Access.batchesUpdate);

  const [adjustingBatch, setAdjustingBatch] = useState<InventoryBatch | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const { data: batches } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => (await api.get("/inventory")).data as InventoryBatch[],
  });

  const { data: alerts } = useQuery({
    queryKey: ["inventory", "alerts"],
    queryFn: async () => (await api.get("/inventory/alerts")).data as InventoryAlertsResponse,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { quantityAvailable: 0 },
  });

  useEffect(() => {
    if (!adjustingBatch) return;
    reset({ quantityAvailable: adjustingBatch.quantityAvailable ?? 0 });
  }, [adjustingBatch, reset]);

  const onAdjustSubmit = async (values: AdjustFormValues) => {
    if (!adjustingBatch) return;

    const currentAvailable = Number(adjustingBatch.quantityAvailable ?? 0);
    const nextAvailable = Number(values.quantityAvailable);
    const delta = nextAvailable - currentAvailable;

    if (delta === 0) {
      toast.message("No hay cambios de stock");
      setIsAdjustOpen(false);
      setAdjustingBatch(null);
      return;
    }

    try {
      await api.post("/inventory/transactions", {
        batchId: adjustingBatch.id,
        type: delta > 0 ? "IN" : "OUT",
        quantity: Math.abs(delta),
        unit: adjustingBatch.product?.unit ?? "dosis",
        occurredAt: new Date().toISOString(),
        reason: "manual_adjustment",
      });
      toast.success("Stock actualizado");
      setIsAdjustOpen(false);
      setAdjustingBatch(null);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Error al ajustar stock"));
    }
  };

  const expiring = alerts?.expiring ?? [];
  const lowStock = alerts?.lowStock ?? [];
  const stockRows = batches ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" subtitle="Stock por producto, lote y alertas operativas" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Vencimientos proximos</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>7 dias: {alerts?.expiring7?.length ?? 0}</span>
              <span>15 dias: {alerts?.expiring15?.length ?? 0}</span>
              <span>30 dias: {alerts?.expiring?.length ?? 0}</span>
            </div>
            {expiring.map((batch) => (
              <div key={batch.id} className="flex items-center justify-between">
                <span>{batch.product?.name ?? "Producto"}</span>
                <span className="text-xs text-slate-400">{formatDateOnlyUtc(batch.expiresAt)}</span>
              </div>
            ))}
            {expiring.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin vencimientos cercanos.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Stock minimo</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lowStock.map((row) => (
              <div key={row.product.id} className="flex items-center justify-between">
                <span>{row.product.name}</span>
                <span className="text-xs text-slate-400">{row.total}</span>
              </div>
            ))}
            {lowStock.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin productos en minimo.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {stockRows.length === 0 ? (
        <EmptyState
          title="Sin stock registrado"
          description="Crea productos y lotes para empezar a registrar inventario."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
          <Table>
            <THead>
              <TR>
                <TH>Producto</TH>
                <TH>Lote</TH>
                <TH>Vencimiento</TH>
                <TH>Disponible</TH>
                <TH>Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {stockRows.map((batch) => (
                <TR key={batch.id}>
                  <TD>{batch.product?.name ?? "Producto"}</TD>
                  <TD>{batch.batchNumber}</TD>
                  <TD>{formatDateOnlyUtc(batch.expiresAt)}</TD>
                  <TD>{batch.quantityAvailable}</TD>
                  <TD>
                    {canAdjust ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAdjustingBatch(batch);
                          setIsAdjustOpen(true);
                        }}
                      >
                        Ajustar
                      </Button>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <Dialog
        open={isAdjustOpen}
        onOpenChange={(open) => {
          setIsAdjustOpen(open);
          if (!open) {
            setAdjustingBatch(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmit(onAdjustSubmit)}>
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
                <p className="text-xs text-red-500">{errors.quantityAvailable.message}</p>
              ) : null}
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
