export type AuthMeResponse = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  tenantId: string;
  tenant: {
    id: string;
    name: string;
  } | null;
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
  animalId: string;
  diagnosis: string;
  startedAt: string;
  endedAt?: string | null;
  status: "ACTIVE" | "CLOSED";
  animal?: {
    id: string;
    tag: string | null;
  } | null;
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
  quantityAvailable: number;
  product?: {
    id: string;
    name: string;
    unit: string;
  } | null;
};

export type BatchListResponse = {
  items: BatchForSelect[];
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
