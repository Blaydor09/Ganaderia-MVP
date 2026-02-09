import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/prisma";
import { assertTenantLimit } from "../src/services/usageService";

describe("tenant limit enforcement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws TENANT_LIMIT_EXCEEDED and writes audit", async () => {
    vi.spyOn(prisma.tenantSubscription, "findFirst").mockResolvedValue({
      id: "sub-1",
      tenantId: "tenant-1",
      plan: {
        id: "plan-free",
        code: "FREE",
        limits: [
          {
            id: "limit-users",
            hardLimit: 10,
            softLimit: 8,
            usageMetric: {
              id: "metric-users",
              key: "USERS",
              name: "Usuarios",
              unit: "count",
            },
          },
        ],
      },
    } as any);
    const auditSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({ id: "audit-1" } as any);

    await expect(
      assertTenantLimit({
        tenantId: "tenant-1",
        metricKey: "USERS",
        nextValue: 11,
        auditContext: { actorUserId: "actor-1", actorType: "tenant" },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "TENANT_LIMIT_EXCEEDED",
    });

    expect(auditSpy).toHaveBeenCalledTimes(1);
    const payload = auditSpy.mock.calls[0][0];
    expect(payload.data.action).toBe("TENANT_LIMIT_EXCEEDED");
    expect(payload.data.tenantId).toBe("tenant-1");
  });
});
