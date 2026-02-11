import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/utils/jwt";
import { prisma } from "../src/config/prisma";

const accessToken = signAccessToken({
  sub: "11111111-1111-4111-8111-111111111111",
  roles: ["ADMIN"],
  scope: "tenant",
  tenantId: "22222222-2222-4222-8222-222222222222",
});

describe("inventory and batch public contracts", () => {
  beforeEach(() => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      isActive: true,
    } as any);
    vi.spyOn(prisma.tenant, "findUnique").mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      status: "ACTIVE",
    } as any);
    vi.spyOn(prisma.userRole, "findMany").mockResolvedValue([
      {
        role: { name: "ADMIN" },
      },
    ] as any);
    vi.spyOn(prisma.tenantSubscription, "findFirst").mockResolvedValue({
      id: "sub-1",
      tenantId: "22222222-2222-4222-8222-222222222222",
      plan: {
        code: "PRO",
        limits: [
          {
            hardLimit: 1000000,
            usageMetric: { key: "API_REQUESTS_MONTHLY" },
          },
        ],
      },
    } as any);
    vi.spyOn(prisma.usageMetric, "findUnique").mockResolvedValue({
      id: "metric-api-requests-monthly",
      key: "API_REQUESTS_MONTHLY",
    } as any);
    vi.spyOn(prisma.usageCounter, "findUnique").mockResolvedValue({
      value: 10,
    } as any);
    vi.spyOn(prisma.usageCounter, "upsert").mockResolvedValue({
      value: 11,
    } as any);
    vi.spyOn(prisma.usageEvent, "create").mockResolvedValue({ id: "evt-1" } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects ADJUST transaction type on public inventory endpoint", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/v1/inventory/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        batchId: "33333333-3333-4333-8333-333333333333",
        type: "ADJUST",
        quantity: 1,
        unit: "dosis",
        occurredAt: "2026-02-09T12:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
  });

  it("rejects stock fields on batch PATCH endpoint", async () => {
    const app = createApp();
    const response = await request(app)
      .patch("/api/v1/batches/33333333-3333-4333-8333-333333333333")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ quantityAvailable: 999, quantityInitial: 999 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
  });

  it("rejects empty payload for batch PATCH endpoint", async () => {
    const app = createApp();
    const response = await request(app)
      .patch("/api/v1/batches/33333333-3333-4333-8333-333333333333")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
  });

  it("rejects inventory transaction without reason", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/v1/inventory/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        batchId: "33333333-3333-4333-8333-333333333333",
        type: "IN",
        quantity: 1,
        unit: "dosis",
        occurredAt: "2026-02-09T12:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
  });
});
