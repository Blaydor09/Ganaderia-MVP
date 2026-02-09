import { UsageMetricKey } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/errors";
import { writeAudit } from "../utils/audit";

type LimitAuditContext = {
  actorUserId?: string;
  actorType?: "platform" | "tenant" | "system";
  ip?: string;
  userAgent?: string;
  resource?: string;
};

const getMonthRangeUtc = (date = new Date()) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0) - 1
  );
  return { start, end };
};

const ensureUsageMetric = async (key: UsageMetricKey) => {
  const metric = await prisma.usageMetric.findUnique({ where: { key } });
  if (!metric) {
    throw new ApiError(500, `Missing usage metric: ${key}`);
  }
  return metric;
};

const ensureActiveSubscription = async (tenantId: string) => {
  let subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "TRIALING"] } },
    include: {
      plan: {
        include: {
          limits: {
            include: { usageMetric: true },
          },
        },
      },
    },
    orderBy: { startsAt: "desc" },
  });

  if (subscription) return subscription;

  const freePlan = await prisma.plan.findUnique({
    where: { code: "FREE" },
    include: {
      limits: {
        include: { usageMetric: true },
      },
    },
  });
  if (!freePlan) {
    throw new ApiError(500, "Missing FREE plan");
  }

  subscription = await prisma.tenantSubscription.create({
    data: {
      tenantId,
      planId: freePlan.id,
      status: "ACTIVE",
    },
    include: {
      plan: {
        include: {
          limits: {
            include: { usageMetric: true },
          },
        },
      },
    },
  });
  return subscription;
};

export const getCurrentUsageValue = async (tenantId: string, metricKey: UsageMetricKey) => {
  switch (metricKey) {
    case "USERS": {
      const members = await prisma.userRole.findMany({
        where: { tenantId, user: { isActive: true } },
        distinct: ["userId"],
        select: { userId: true },
      });
      return members.length;
    }
    case "ACTIVE_ANIMALS":
      return prisma.animal.count({
        where: { tenantId, deletedAt: null, status: "ACTIVO" },
      });
    case "PRODUCTS":
      return prisma.product.count({
        where: { tenantId, deletedAt: null },
      });
    case "ACTIVE_BATCHES":
      return prisma.batch.count({
        where: { tenantId, deletedAt: null },
      });
    case "API_REQUESTS_MONTHLY": {
      const metric = await ensureUsageMetric(metricKey);
      const range = getMonthRangeUtc();
      const counter = await prisma.usageCounter.findUnique({
        where: {
          tenantId_usageMetricId_periodStart_periodEnd: {
            tenantId,
            usageMetricId: metric.id,
            periodStart: range.start,
            periodEnd: range.end,
          },
        },
      });
      return counter?.value ?? 0;
    }
    case "STORAGE_MB": {
      const metric = await ensureUsageMetric(metricKey);
      const range = getMonthRangeUtc();
      const counter = await prisma.usageCounter.findUnique({
        where: {
          tenantId_usageMetricId_periodStart_periodEnd: {
            tenantId,
            usageMetricId: metric.id,
            periodStart: range.start,
            periodEnd: range.end,
          },
        },
      });
      return counter?.value ?? 0;
    }
    default:
      return 0;
  }
};

const buildLimitExceededError = (input: {
  metricKey: UsageMetricKey;
  planCode: string;
  hardLimit: number;
  currentValue: number;
  tenantId: string;
}) =>
  new ApiError(
    409,
    "Tenant limit exceeded",
    {
      code: "TENANT_LIMIT_EXCEEDED",
      metric: input.metricKey,
      plan: input.planCode,
      hardLimit: input.hardLimit,
      currentValue: input.currentValue,
      tenantId: input.tenantId,
    },
    "TENANT_LIMIT_EXCEEDED"
  );

export const assertTenantLimit = async (input: {
  tenantId: string;
  metricKey: UsageMetricKey;
  nextValue?: number;
  auditContext?: LimitAuditContext;
}) => {
  const subscription = await ensureActiveSubscription(input.tenantId);
  const planLimit = subscription.plan.limits.find((row) => row.usageMetric.key === input.metricKey);
  const hardLimit = planLimit?.hardLimit;

  if (hardLimit === null || hardLimit === undefined) {
    return;
  }

  const currentValue =
    input.nextValue !== undefined
      ? input.nextValue
      : await getCurrentUsageValue(input.tenantId, input.metricKey);

  if (currentValue <= hardLimit) {
    return;
  }

  await writeAudit({
    userId: input.auditContext?.actorUserId,
    actorUserId: input.auditContext?.actorUserId,
    actorType: input.auditContext?.actorType ?? "tenant",
    tenantId: input.tenantId,
    action: "TENANT_LIMIT_EXCEEDED",
    entity: "usage.limit",
    resource: input.auditContext?.resource ?? "usage.limit",
    metadata: {
      metric: input.metricKey,
      currentValue,
      hardLimit,
      planCode: subscription.plan.code,
    },
    ip: input.auditContext?.ip,
    userAgent: input.auditContext?.userAgent,
  });

  throw buildLimitExceededError({
    metricKey: input.metricKey,
    planCode: subscription.plan.code,
    hardLimit,
    currentValue,
    tenantId: input.tenantId,
  });
};

export const incrementUsageCounter = async (input: {
  tenantId: string;
  metricKey: UsageMetricKey;
  delta?: number;
  source: string;
  resourceId?: string;
  metadata?: unknown;
}) => {
  const metric = await ensureUsageMetric(input.metricKey);
  const delta = input.delta ?? 1;
  const { start, end } = getMonthRangeUtc();

  const counter = await prisma.usageCounter.upsert({
    where: {
      tenantId_usageMetricId_periodStart_periodEnd: {
        tenantId: input.tenantId,
        usageMetricId: metric.id,
        periodStart: start,
        periodEnd: end,
      },
    },
    update: {
      value: { increment: delta },
    },
    create: {
      tenantId: input.tenantId,
      usageMetricId: metric.id,
      periodStart: start,
      periodEnd: end,
      value: delta,
    },
  });

  await prisma.usageEvent.create({
    data: {
      tenantId: input.tenantId,
      usageMetricId: metric.id,
      delta,
      currentValue: counter.value,
      source: input.source,
      resourceId: input.resourceId,
      metadata: input.metadata as any,
    },
  });

  return counter.value;
};

export const getTenantUsageSummary = async (tenantId: string) => {
  const subscription = await ensureActiveSubscription(tenantId);
  const limits = subscription.plan.limits;

  const metrics = await Promise.all(
    limits.map(async (limit) => {
      const current = await getCurrentUsageValue(tenantId, limit.usageMetric.key);
      return {
        metric: limit.usageMetric.key,
        name: limit.usageMetric.name,
        unit: limit.usageMetric.unit,
        softLimit: limit.softLimit,
        hardLimit: limit.hardLimit,
        current,
        exceeded:
          limit.hardLimit !== null && limit.hardLimit !== undefined ? current > limit.hardLimit : false,
      };
    })
  );

  return {
    tenantId,
    subscription: {
      id: subscription.id,
      status: subscription.status,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
      plan: {
        code: subscription.plan.code,
        name: subscription.plan.name,
        description: subscription.plan.description,
      },
    },
    metrics,
    generatedAt: new Date().toISOString(),
  };
};
