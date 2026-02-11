export type AuthMeResponse = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  tenantId: string;
  scope: "tenant";
  tenant: {
    id: string;
    name: string;
    status: "ACTIVE" | "SUSPENDED";
  } | null;
};

export type TenantUsageMetricKey =
  | "USERS"
  | "ACTIVE_ANIMALS"
  | "PRODUCTS"
  | "ACTIVE_BATCHES"
  | "API_REQUESTS_MONTHLY"
  | "STORAGE_MB";

export type TenantPlanUsageMetric = {
  metric: TenantUsageMetricKey;
  name: string;
  unit: string;
  softLimit: number | null;
  hardLimit: number | null;
  current: number;
  exceeded: boolean;
};

export type TenantPlanUsageSummary = {
  tenantId: string;
  subscription: {
    id: string;
    status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";
    startsAt: string;
    endsAt: string | null;
    plan: {
      code: "FREE" | "PRO" | "ENTERPRISE";
      name: string;
      description: string | null;
    };
  };
  metrics: TenantPlanUsageMetric[];
  generatedAt: string;
};

export type SearchAnimal = {
  id: string;
  tag: string | null;
  breed: string;
};

export type SearchBatch = {
  id: string;
  batchNumber: string;
};

export type SearchProduct = {
  id: string;
  name: string;
};

export type SearchResponse = {
  animals: SearchAnimal[];
  products: SearchProduct[];
  batches: SearchBatch[];
};

export type AnimalListItem = {
  id: string;
  tag: string | null;
  breed: string;
};

export type AnimalListResponse = {
  items: AnimalListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type EstablishmentNode = {
  id: string;
  name: string;
  type: "FINCA" | "POTRERO" | "CORRAL";
  children?: EstablishmentNode[];
};

export type EventType =
  | "PESO"
  | "NACIMIENTO"
  | "DESTETE"
  | "CELO"
  | "PRENEZ"
  | "PARTO"
  | "VACUNACION"
  | "DESPARASITACION"
  | "ENFERMEDAD"
  | "MUERTE"
  | "VENTA"
  | "COMPRA"
  | "OBSERVACION";

export type AnimalEvent = {
  id: string;
  animalId: string;
  type: EventType;
  occurredAt: string;
  establishmentId?: string | null;
  valueNumber?: number | null;
  valueText?: string | null;
  notes?: string | null;
};

export type EventListResponse = {
  items: AnimalEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export type MovementType = "INTERNAL" | "EXTERNAL" | "SALE" | "SLAUGHTER";

export type Movement = {
  id: string;
  animalId: string;
  occurredAt: string;
  movementType: MovementType;
  originId?: string | null;
  destinationId?: string | null;
  transporter?: string | null;
  notes?: string | null;
};

export type MovementListResponse = {
  items: Movement[];
  total: number;
  page: number;
  pageSize: number;
};

export type Treatment = {
  id: string;
  animalId?: string | null;
  description: string;
  mode: "INDIVIDUAL" | "GROUP";
  startedAt: string;
  endedAt?: string | null;
  status: "ACTIVE" | "CLOSED";
  animal?: {
    id: string;
    tag: string | null;
    internalCode?: string | null;
    category?: string;
    sex?: string;
  } | null;
  animals?: Array<{
    animalId: string;
    animal?: {
      id: string;
      tag: string | null;
      internalCode?: string | null;
      category?: string;
      sex?: string;
    } | null;
  } | null>;
  administrations?: Array<{
    id: string;
    dose: number;
    doseUnit: string;
    batchId?: string;
    batch?: {
      id: string;
      batchNumber: string;
    } | null;
    product?: {
      id: string;
      name: string;
      unit?: string;
    } | null;
  } | null>;
};

export type TreatmentListResponse = {
  items: Treatment[];
  total: number;
  page: number;
  pageSize: number;
};

export type BatchForSelect = {
  id: string;
  productId: string;
  batchNumber: string;
  expiresAt: string;
  quantityAvailable: number;
  product?: {
    id: string;
    name: string;
    unit: string;
    recommendedRoute?: string | null;
  } | null;
};

export type BatchListResponse = {
  items: BatchForSelect[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductType = "VITAMINAS" | "ANTIBIOTICOS" | "DESPARASITANTE" | "VACUNAS";

export type ProductItem = {
  id: string;
  name: string;
  type?: ProductType | null;
  vaccineTypes: string[];
  unit: string;
  species: string;
  recommendedRoute?: string | null;
  notes?: string | null;
  minStock: number;
};

export type ProductListResponse = {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type DashboardRange = "7d" | "30d" | "90d";

export type DashboardFilterParams = {
  range: DashboardRange;
  fincaId?: string;
  establishmentId?: string;
};

export type DashboardKpiMetric = {
  value: number;
  deltaPct?: number;
};

export type DashboardKpis = {
  animalsActive: DashboardKpiMetric;
  treatmentsInRange: DashboardKpiMetric;
  movementsInRange: DashboardKpiMetric;
  withdrawalsActive: DashboardKpiMetric;
  inventoryAlerts: {
    value: number;
    expiring: number;
    lowStock: number;
  };
};

export type TreatmentSeriesPoint = {
  date: string;
  count: number;
};

export type LifecycleSeriesPoint = {
  date: string;
  births: number;
  deaths: number;
  sales: number;
};

export type InventoryTopRow = {
  productId: string;
  productName: string;
  unit: string;
  stock: number;
  minStock: number;
};

export type MovementRecentRow = {
  id: string;
  movementType: MovementType;
  occurredAt: string;
  animalId: string;
  animalTag: string | null;
  originName: string | null;
  destinationName: string | null;
};

export type DashboardOverviewResponse = {
  kpis: DashboardKpis;
  animalDistribution: {
    byCategory: Array<{ category: string; count: number }>;
    bySex: Array<{ sex: string; count: number }>;
  };
  treatmentsSeries: TreatmentSeriesPoint[];
  lifecycleSeries: LifecycleSeriesPoint[];
  inventoryTop: InventoryTopRow[];
  movementsRecent: MovementRecentRow[];
  appliedFilters: {
    range: DashboardRange;
    from: string;
    to: string;
    fincaId: string | null;
    establishmentId: string | null;
  };
  generatedAt: string;
};

export type InventoryBatch = {
  id: string;
  batchNumber: string;
  expiresAt: string;
  quantityAvailable: number;
  product?: {
    id: string;
    name: string;
    unit: string;
  } | null;
};

export type InventoryBatchListResponse = {
  items: InventoryBatch[];
  total: number;
  page: number;
  pageSize: number;
};

export type InventorySummaryRow = {
  product: {
    id: string;
    name: string;
    minStock: number;
    unit: string;
  };
  total: number;
};

export type InventorySummaryResponse = {
  items: InventorySummaryRow[];
};

export type InventoryTransactionItem = {
  id: string;
  batchId: string;
  productId: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  unit: string;
  occurredAt: string;
  reason?: string | null;
  batch?: {
    id: string;
    batchNumber: string;
  } | null;
  product?: {
    id: string;
    name: string;
    unit: string;
  } | null;
};

export type InventoryTransactionListResponse = {
  items: InventoryTransactionItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type InventoryLowStockRow = {
  product: {
    id: string;
    name: string;
    minStock: number;
  };
  total: number;
};

export type InventoryAlertsResponse = {
  expiring: InventoryBatch[];
  expiring7: InventoryBatch[];
  expiring15: InventoryBatch[];
  lowStock: InventoryLowStockRow[];
};

export type AlertRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  dueAt?: string | null;
};

export type ReportConsumptionRow = {
  product?: {
    id: string;
    name: string;
  } | null;
  total: number;
};

export type ReportConsumptionResponse = {
  items: ReportConsumptionRow[];
};

export type ReportWithdrawalItem = {
  animal: {
    id: string;
    tag: string | null;
    internalCode?: string | null;
  };
  meatUntil: string;
  milkUntil: string;
  products: string[];
};

export type ReportWithdrawalsActiveResponse = {
  items: ReportWithdrawalItem[];
  total: number;
};

export type ReportWeightRow = {
  id: string;
  animalId: string;
  occurredAt: string;
  valueNumber?: number | null;
};

export type ReportWeightsResponse = {
  items: ReportWeightRow[];
};
