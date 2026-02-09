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
