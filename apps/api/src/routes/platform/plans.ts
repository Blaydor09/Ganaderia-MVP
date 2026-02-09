import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticatePlatform } from "../../middleware/auth";
import { requirePlatformRoles } from "../../middleware/rbac";
import { platformPlanLimitsUpdateSchema } from "../../validators/platformSchemas";
import { ApiError } from "../../utils/errors";
import { writeAudit } from "../../utils/audit";

const router = Router();

router.get(
  "/",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin", "platform_support"),
  asyncHandler(async (_req, res) => {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        limits: {
          include: { usageMetric: true },
          orderBy: { usageMetric: { key: "asc" } },
        },
      },
    });

    res.json(
      plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        isActive: plan.isActive,
        limits: plan.limits.map((limit) => ({
          id: limit.id,
          metric: limit.usageMetric.key,
          metricName: limit.usageMetric.name,
          unit: limit.usageMetric.unit,
          softLimit: limit.softLimit,
          hardLimit: limit.hardLimit,
        })),
      }))
    );
  })
);

router.patch(
  "/:code/limits",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const data = platformPlanLimitsUpdateSchema.parse(req.body);
    const code = req.params.code.toUpperCase();
    if (!["FREE", "PRO", "ENTERPRISE"].includes(code)) {
      throw new ApiError(400, "Invalid plan code");
    }

    const plan = await prisma.plan.findUnique({
      where: { code: code as "FREE" | "PRO" | "ENTERPRISE" },
    });
    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }

    const metrics = await prisma.usageMetric.findMany({
      where: { key: { in: data.limits.map((limit) => limit.metric) } },
    });
    const metricMap = new Map(metrics.map((metric) => [metric.key, metric.id]));

    const updates = [];
    for (const limit of data.limits) {
      const usageMetricId = metricMap.get(limit.metric);
      if (!usageMetricId) {
        throw new ApiError(400, `Missing usage metric: ${limit.metric}`);
      }
      const updated = await prisma.planLimit.upsert({
        where: {
          planId_usageMetricId: {
            planId: plan.id,
            usageMetricId,
          },
        },
        update: {
          softLimit: limit.softLimit ?? null,
          hardLimit: limit.hardLimit ?? null,
        },
        create: {
          planId: plan.id,
          usageMetricId,
          softLimit: limit.softLimit ?? null,
          hardLimit: limit.hardLimit ?? null,
        },
      });
      updates.push(updated);
    }

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      action: "UPDATE_PLAN_LIMITS",
      entity: "plan",
      entityId: plan.id,
      resource: "platform.plan",
      resourceId: plan.id,
      metadata: data,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ planId: plan.id, updated: updates.length });
  })
);

export default router;
