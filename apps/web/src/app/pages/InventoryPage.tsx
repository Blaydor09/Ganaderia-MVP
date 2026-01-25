import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateOnlyUtc } from "@/lib/dates";
import { hasAnyRole } from "@/lib/auth";
import { Access } from "@/lib/access";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const adjustSchema = z.object({
  quantityAvailable: z.number().min(0),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

const InventoryPage = () => {
  const queryClient = useQueryClient();
  const canAdjust = hasAnyRole(Access.batchesUpdate);
  const [adjustingBatch, setAdjustingBatch] = useState<any | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const { data: batches } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => (await api.get("/inventory")).data,
  });

  const { data: alerts } = useQuery({
    queryKey: ["inventory", "alerts"],
    queryFn: async () => (await api.get("/inventory/alerts")).data,
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
    reset({
      quantityAvailable: adjustingBatch.quantityAvailable ?? 0,
    });
  }, [adjustingBatch, reset]);

  const onAdjustSubmit = async (values: AdjustFormValues) => {
    if (!adjustingBatch) return;
    try {
      await api.patch(`/batches/${adjustingBatch.id}`, {
        quantityAvailable: values.quantityAvailable,
      });
      toast.success("Stock actualizado");
      setIsAdjustOpen(false);
      setAdjustingBatch(null);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Error al ajustar stock");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" subtitle="Stock por producto y lote" />

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
            {(alerts?.expiring ?? []).map((batch: any) => (
              <div key={batch.id} className="flex items-center justify-between">
                <span>{batch.product?.name}</span>
                <span className="text-xs text-slate-400">
                  {formatDateOnlyUtc(batch.expiresAt)}
                </span>
              </div>
            ))}
            {(alerts?.expiring ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin vencimientos cercanos.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">Stock minimo</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(alerts?.lowStock ?? []).map((row: any) => (
              <div key={row.product.id} className="flex items-center justify-between">
                <span>{row.product.name}</span>
                <span className="text-xs text-slate-400">{row.total}</span>
              </div>
            ))}
            {(alerts?.lowStock ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin productos en minimo.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

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
            {(batches ?? []).map((batch: any) => (
              <TR key={batch.id}>
                <TD>{batch.product?.name}</TD>
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
            {(batches ?? []).length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-sm text-slate-500 dark:text-slate-400">
                  Sin stock registrado.
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>

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
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Disponible (dosis)
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
