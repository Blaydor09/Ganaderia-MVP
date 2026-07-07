import { prisma } from "../config/prisma";
import { Parser } from "json2csv";

export async function getDemographicsReport(tenantId: string, filters: any) {
  const { establishmentId } = filters;
  const where: any = { tenantId, deletedAt: null };
  if (establishmentId) where.establishmentId = establishmentId;

  // Group by category
  const byCategory = await prisma.animal.groupBy({
    by: ["category"],
    where,
    _count: { id: true },
  });

  // Group by sex
  const bySex = await prisma.animal.groupBy({
    by: ["sex"],
    where,
    _count: { id: true },
  });

  // Group by status
  const byStatus = await prisma.animal.groupBy({
    by: ["status"],
    where,
    _count: { id: true },
  });

  // Total active vs others
  const total = await prisma.animal.count({ where });

  return {
    byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
    bySex: bySex.map((s) => ({ sex: s.sex, count: s._count.id })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    total,
  };
}

export async function getReproductionReport(tenantId: string, filters: any) {
  const { startDate, endDate, establishmentId } = filters;
  const where: any = { tenantId, type: { in: ["PARTO", "PRENEZ", "CELO"] } };
  if (startDate && endDate) {
    where.occurredAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }
  if (establishmentId) {
    where.establishmentId = establishmentId;
  }

  const events = await prisma.animalEvent.groupBy({
    by: ["type"],
    where,
    _count: { id: true },
  });

  return events.map((e) => ({ type: e.type, count: e._count.id }));
}

export async function getHealthReport(tenantId: string, filters: any) {
  const { startDate, endDate } = filters;
  const where: any = { tenantId };
  if (startDate && endDate) {
    where.startedAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const treatments = await prisma.treatment.groupBy({
    by: ["status"],
    where,
    _count: { id: true },
  });

  const totalTreatments = await prisma.treatment.count({ where });

  return {
    treatmentsByStatus: treatments.map((t) => ({ status: t.status, count: t._count.id })),
    totalTreatments,
  };
}

export async function getAuditReport(tenantId: string, filters: any) {
  const { startDate, endDate, userId, action } = filters;
  const where: any = { tenantId };
  if (startDate && endDate) {
    where.occurredAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }
  if (userId) where.actorUserId = userId;
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
    take: 1000, // Reasonable limit for UI, export could be more
  });

  return logs;
}

export function exportToCsv(data: any[], fields: string[]) {
  try {
    const safeData = data.map((row) =>
      Object.fromEntries(
        fields.map((field) => {
          const value = row?.[field];
          return [
            field,
            typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value,
          ];
        })
      )
    );
    const parser = new Parser({ fields });
    return parser.parse(safeData);
  } catch (err) {
    console.error("CSV export error", err);
    throw new Error("Failed to export to CSV");
  }
}
