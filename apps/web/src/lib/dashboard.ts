import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  DashboardFilterParams,
  DashboardOverviewResponse,
  DashboardRange,
  MovementType,
} from "@/lib/types";

export const dashboardRangeOptions: Array<{ value: DashboardRange; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

export const normalizeDashboardRange = (value?: string | null): DashboardRange => {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
};

export const buildDashboardQueryParams = (filters: DashboardFilterParams) => {
  const params: Record<string, string> = {
    range: filters.range,
  };
  if (filters.fincaId) params.fincaId = filters.fincaId;
  if (filters.establishmentId) params.establishmentId = filters.establishmentId;
  return params;
};

export const getMovementTypeLabel = (movementType: MovementType | string) => {
  const labels: Record<string, string> = {
    INTERNAL: "Interno",
    EXTERNAL: "Externo",
    SALE: "Venta",
    SLAUGHTER: "Faena",
  };
  return labels[movementType] ?? movementType;
};

export const useDashboardOverview = (filters: DashboardFilterParams) =>
  useQuery({
    queryKey: [
      "dashboard",
      "overview",
      filters.range,
      filters.fincaId ?? "",
      filters.establishmentId ?? "",
    ],
    queryFn: async () =>
      (await api.get("/dashboard/overview", { params: buildDashboardQueryParams(filters) }))
        .data as DashboardOverviewResponse,
  });
