import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAnimalIdentifier } from "@/lib/animals";
import { formatDateOnlyUtc } from "@/lib/dates";
import type {
  AnimalListResponse,
  ReportConsumptionResponse,
  ReportWeightsResponse,
  ReportWithdrawalsActiveResponse,
} from "@/lib/types";
import { ExportButton } from "./ExportButton";

export function InventoryReport() {
  const [animalFilter, setAnimalFilter] = useState("");

  const { data: animals } = useQuery({
    queryKey: ["animals", "report-weights-picker"],
    queryFn: async () => (await api.get("/animals?page=1&pageSize=200")).data as AnimalListResponse,
  });

  const { data: consumption } = useQuery({
    queryKey: ["reports", "consumption"],
    queryFn: async () => (await api.get("/reports/consumption")).data as ReportConsumptionResponse,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["reports", "withdrawals", animalFilter],
    queryFn: async () =>
      (await api.get("/reports/withdrawals-active")).data as ReportWithdrawalsActiveResponse,
  });

  const { data: weights } = useQuery({
    queryKey: ["reports", "weights", animalFilter],
    queryFn: async () =>
      (
        await api.get("/reports/weights", {
          params: animalFilter ? { animalId: animalFilter } : undefined,
        })
      ).data as ReportWeightsResponse,
  });

  const weightSeries = useMemo(
    () =>
      (weights?.items ?? [])
        .filter((item) => typeof item.valueNumber === "number")
        .map((item) => ({
          date: item.occurredAt.slice(0, 10),
          value: item.valueNumber as number,
        })),
    [weights]
  );

  const withdrawalsPreview = (withdrawals?.items ?? []).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Consumo</p>
              <h3 className="font-display text-lg font-semibold">Top productos</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm pt-2">
            {(consumption?.items ?? []).map((row) => (
              <div
                key={row.product?.id ?? row.product?.name ?? "consumption-row"}
                className="flex items-center justify-between"
              >
                <span>{row.product?.name ?? "Producto sin nombre"}</span>
                <span className="text-xs text-slate-400">{row.total}</span>
              </div>
            ))}
            {(consumption?.items ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos de consumo.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Retiros sanitarios</p>
              <h3 className="font-display text-lg font-semibold">
                Animales bloqueados ({withdrawals?.total ?? 0})
              </h3>
            </div>
            <ExportButton endpoint="/reports/withdrawals-active" filename="retiros.csv" />
          </CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-2 pt-2">
            {withdrawalsPreview.map((row) => (
              <div
                key={row.animal.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {getAnimalIdentifier(row.animal)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Carne: {formatDateOnlyUtc(row.meatUntil)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Leche: {formatDateOnlyUtc(row.milkUntil)}
                </p>
              </div>
            ))}
            {withdrawalsPreview.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin retiros activos.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pesajes</p>
            <h3 className="font-display text-lg font-semibold">Evolucion por animal</h3>
          </div>
          <ExportButton endpoint="/reports/weights" params={animalFilter ? { animalId: animalFilter } : {}} filename="pesajes.csv" />
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="max-w-sm space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Filtrar animal</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={animalFilter}
              onChange={(event) => setAnimalFilter(event.target.value)}
            >
              <option value="">Todos</option>
              {(animals?.items ?? []).map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {getAnimalIdentifier(animal)} - {animal.breed}
                </option>
              ))}
            </select>
          </div>

          {weightSeries.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightSeries}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(`${date}T00:00:00.000Z`).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })
                    }
                    stroke="#94a3b8"
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    labelFormatter={(label) => formatDateOnlyUtc(`${label}T00:00:00.000Z`)}
                  />
                  <Line type="monotone" dataKey="value" stroke="#4d7d66" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="Sin datos de pesajes"
              description="Registra eventos de tipo PESO para visualizar la evolucion."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
