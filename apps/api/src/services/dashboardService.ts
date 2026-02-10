import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { buildTreatmentLocationWhere } from "./treatmentService";

export type DashboardRange = "7d" | "30d" | "90d";

export type DashboardOverviewInput = {
  tenantId: string;
  range: DashboardRange;
  fincaId?: string;
  establishmentId?: string;
};

export type DashboardOverview = {
  kpis: {
    animalsActive: { value: number };
    treatmentsInRange: { value: number; deltaPct: number };
    movementsInRange: { value: number; deltaPct: number };
    withdrawalsActive: { value: number };
    inventoryAlerts: { value: number; expiring: number; lowStock: number };
  };
  animalDistribution: {
    byCategory: { category: string; count: number }[];
    bySex: { sex: string; count: number }[];
  };
  treatmentsSeries: { date: string; count: number }[];
  lifecycleSeries: { date: string; births: number; deaths: number; sales: number }[];
  inventoryTop: {
    productId: string;
    productName: string;
    unit: string;
    stock: number;
    minStock: number;
  }[];
  movementsRecent: {
    id: string;
    movementType: string;
    occurredAt: string;
    animalId: string;
    animalTag: string | null;
    originName: string | null;
    destinationName: string | null;
  }[];
  appliedFilters: {
    range: DashboardRange;
    from: string;
    to: string;
    fincaId: string | null;
    establishmentId: string | null;
  };
  generatedAt: string;
};

const rangeToDays: Record<DashboardRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const createDayBuckets = (from: Date, days: number) => {
  const items: { date: string; count: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const current = new Date(from);
    current.setUTCDate(from.getUTCDate() + i);
    items.push({
      date: current.toISOString().slice(0, 10),
      count: 0,
    });
  }
  return items;
};

const createLifecycleBuckets = (from: Date, days: number) => {
  const items: { date: string; births: number; deaths: number; sales: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const current = new Date(from);
    current.setUTCDate(from.getUTCDate() + i);
    items.push({
      date: current.toISOString().slice(0, 10),
      births: 0,
      deaths: 0,
      sales: 0,
    });
  }
  return items;
};

const calculateDeltaPct = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const applyLocationFilterToAnimals = (
  tenantId: string,
  establishmentId?: string,
  fincaId?: string
): Prisma.AnimalWhereInput => {
  const where: Prisma.AnimalWhereInput = { tenantId, deletedAt: null };
  if (establishmentId) {
    where.establishmentId = establishmentId;
    return where;
  }
  if (fincaId) {
    where.establishment = { fincaId, tenantId };
  }
  return where;
};

const withLocationByAnimal = (
  tenantId: string,
  establishmentId?: string,
  fincaId?: string
) => {
  if (establishmentId) {
    return { animal: { establishmentId, tenantId } };
  }
  if (fincaId) {
    return { animal: { establishment: { fincaId, tenantId } } };
  }
  return {};
};

export const getDashboardOverview = async (
  input: DashboardOverviewInput
): Promise<DashboardOverview> => {
  const days = rangeToDays[input.range];
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  from.setUTCDate(from.getUTCDate() - (days - 1));

  const previousFrom = new Date(from);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - days);
  const previousTo = new Date(from);
  previousTo.setUTCMilliseconds(previousTo.getUTCMilliseconds() - 1);

  const animalWhere = applyLocationFilterToAnimals(
    input.tenantId,
    input.establishmentId,
    input.fincaId
  );

  const treatmentLocationWhere = buildTreatmentLocationWhere(
    input.tenantId,
    input.establishmentId,
    input.fincaId
  );
  const scopedTreatmentLocationWhere =
    Object.keys(treatmentLocationWhere).length > 0 ? treatmentLocationWhere : undefined;

  const treatmentWhere: Prisma.TreatmentWhereInput = {
    tenantId: input.tenantId,
    startedAt: { gte: from, lte: now },
    ...(scopedTreatmentLocationWhere ?? {}),
  };

  const previousTreatmentWhere: Prisma.TreatmentWhereInput = {
    tenantId: input.tenantId,
    startedAt: { gte: previousFrom, lte: previousTo },
    ...(scopedTreatmentLocationWhere ?? {}),
  };

  const movementWhere: Prisma.MovementWhereInput = {
    tenantId: input.tenantId,
    occurredAt: { gte: from, lte: now },
    ...withLocationByAnimal(input.tenantId, input.establishmentId, input.fincaId),
  };

  const previousMovementWhere: Prisma.MovementWhereInput = {
    tenantId: input.tenantId,
    occurredAt: { gte: previousFrom, lte: previousTo },
    ...withLocationByAnimal(input.tenantId, input.establishmentId, input.fincaId),
  };

  const withdrawalWhere: Prisma.AdministrationWhereInput = {
    tenantId: input.tenantId,
    OR: [{ meatWithdrawalUntil: { gt: now } }, { milkWithdrawalUntil: { gt: now } }],
    treatment: scopedTreatmentLocationWhere,
  };

  const lifecycleWhere: Prisma.AnimalEventWhereInput = {
    tenantId: input.tenantId,
    type: { in: ["NACIMIENTO", "MUERTE", "VENTA"] },
    occurredAt: { gte: from, lte: now },
    ...withLocationByAnimal(input.tenantId, input.establishmentId, input.fincaId),
  };

  const administrationsInRangeWhere: Prisma.AdministrationWhereInput = {
    tenantId: input.tenantId,
    administeredAt: { gte: from, lte: now },
    treatment: scopedTreatmentLocationWhere,
  };

  const [animalsActive, byCategory, bySex] = await Promise.all([
    prisma.animal.count({ where: animalWhere }),
    prisma.animal.groupBy({ by: ["category"], where: animalWhere, _count: { _all: true } }),
    prisma.animal.groupBy({ by: ["sex"], where: animalWhere, _count: { _all: true } }),
  ]);

  const [
    treatmentsInRange,
    treatmentsPreviousRange,
    movementsInRange,
    movementsPreviousRange,
  ] = await Promise.all([
    prisma.treatment.count({ where: treatmentWhere }),
    prisma.treatment.count({ where: previousTreatmentWhere }),
    prisma.movement.count({ where: movementWhere }),
    prisma.movement.count({ where: previousMovementWhere }),
  ]);

  const [withdrawalRows, lifecycleRows, administrationsInRange, movementsRecentRows] =
    await Promise.all([
      prisma.administration.findMany({
        where: withdrawalWhere,
        select: { treatmentId: true },
      }),
      prisma.animalEvent.findMany({
        where: lifecycleWhere,
        select: { type: true, occurredAt: true },
      }),
      prisma.administration.findMany({
        where: administrationsInRangeWhere,
        select: { administeredAt: true },
      }),
      prisma.movement.findMany({
        where: movementWhere,
        include: {
          animal: { select: { id: true, tag: true } },
          origin: { select: { id: true, name: true } },
          destination: { select: { id: true, name: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: 8,
      }),
    ]);

  const uniqueActiveTreatments = new Set(withdrawalRows.map((row) => row.treatmentId));
  const withdrawalsActive = uniqueActiveTreatments.size;

  const products = await prisma.product.findMany({
    where: { tenantId: input.tenantId, deletedAt: null },
    select: { id: true, name: true, minStock: true, unit: true },
    orderBy: { name: "asc" },
  });

  const [batchTotals, expiringCount] = await Promise.all([
    prisma.batch.groupBy({
      by: ["productId"],
      where: { tenantId: input.tenantId, deletedAt: null },
      _sum: { quantityAvailable: true },
    }),
    prisma.batch.count({
      where: {
        tenantId: input.tenantId,
        deletedAt: null,
        expiresAt: {
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const totalByProduct = new Map<string, number>();
  for (const row of batchTotals) {
    totalByProduct.set(row.productId, row._sum.quantityAvailable ?? 0);
  }

  const stockRows = products.map((product) => {
    const stock = totalByProduct.get(product.id) ?? 0;
    return {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      stock,
      minStock: product.minStock,
    };
  });

  const lowStockCount = stockRows.filter((row) => row.stock <= row.minStock).length;
  const inventoryTop = [...stockRows].sort((a, b) => b.stock - a.stock).slice(0, 8);

  const treatmentsSeries = createDayBuckets(from, days);
  const treatmentsSeriesMap = new Map(treatmentsSeries.map((item) => [item.date, item]));
  for (const row of administrationsInRange) {
    const key = row.administeredAt.toISOString().slice(0, 10);
    const bucket = treatmentsSeriesMap.get(key);
    if (!bucket) continue;
    bucket.count += 1;
  }

  const lifecycleSeries = createLifecycleBuckets(from, days);
  const lifecycleMap = new Map(lifecycleSeries.map((item) => [item.date, item]));
  for (const row of lifecycleRows) {
    const key = row.occurredAt.toISOString().slice(0, 10);
    const bucket = lifecycleMap.get(key);
    if (!bucket) continue;
    if (row.type === "NACIMIENTO") bucket.births += 1;
    if (row.type === "MUERTE") bucket.deaths += 1;
    if (row.type === "VENTA") bucket.sales += 1;
  }

  return {
    kpis: {
      animalsActive: { value: animalsActive },
      treatmentsInRange: {
        value: treatmentsInRange,
        deltaPct: calculateDeltaPct(treatmentsInRange, treatmentsPreviousRange),
      },
      movementsInRange: {
        value: movementsInRange,
        deltaPct: calculateDeltaPct(movementsInRange, movementsPreviousRange),
      },
      withdrawalsActive: { value: withdrawalsActive },
      inventoryAlerts: {
        value: expiringCount + lowStockCount,
        expiring: expiringCount,
        lowStock: lowStockCount,
      },
    },
    animalDistribution: {
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count._all,
      })),
      bySex: bySex.map((item) => ({
        sex: item.sex,
        count: item._count._all,
      })),
    },
    treatmentsSeries,
    lifecycleSeries,
    inventoryTop,
    movementsRecent: movementsRecentRows.map((row) => ({
      id: row.id,
      movementType: row.movementType,
      occurredAt: row.occurredAt.toISOString(),
      animalId: row.animalId,
      animalTag: row.animal?.tag ?? null,
      originName: row.origin?.name ?? null,
      destinationName: row.destination?.name ?? null,
    })),
    appliedFilters: {
      range: input.range,
      from: from.toISOString(),
      to: now.toISOString(),
      fincaId: input.fincaId ?? null,
      establishmentId: input.establishmentId ?? null,
    },
    generatedAt: now.toISOString(),
  };
};
