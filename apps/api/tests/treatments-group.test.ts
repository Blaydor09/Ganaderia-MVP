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

const setupAuthAndUsageMocks = () => {
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
};

describe("grouped treatments", () => {
  beforeEach(() => {
    setupAuthAndUsageMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates grouped treatment and administrations", async () => {
    const tx = {
      animal: {
        findMany: vi.fn().mockResolvedValue([
          { id: "animal-1", tag: "A-1", internalCode: "IC-1" },
          { id: "animal-2", tag: "A-2", internalCode: "IC-2" },
        ]),
      },
      batch: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "33333333-3333-4333-8333-333333333333",
            productId: "product-1",
            batchNumber: "B-1",
            quantityAvailable: 200,
            deletedAt: null,
            expiresAt: new Date("2027-01-01T00:00:00.000Z"),
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      treatment: {
        create: vi.fn().mockResolvedValue({
          id: "treatment-1",
          mode: "GROUP",
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "treatment-1",
          mode: "GROUP",
          description: "Aplicacion grupal",
          animals: [],
          administrations: [],
        }),
      },
      treatmentAnimal: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      administration: {
        create: vi.fn().mockResolvedValue({ id: "admin-1" }),
      },
      inventoryTransaction: {
        create: vi.fn().mockResolvedValue({ id: "tx-1" }),
      },
    };

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({ id: "audit-1" } as any);

    const app = createApp();
    const response = await request(app)
      .post("/api/v1/treatments/group")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        description: "Aplicacion grupal",
        startedAt: "2026-02-10T09:00:00.000Z",
        filters: { category: "VACA" },
        scope: "ALL_FILTERED",
        medications: [
          {
            batchId: "33333333-3333-4333-8333-333333333333",
            dose: 2,
            doseUnit: "ml",
            route: "subcutanea",
            administeredAt: "2026-02-10T09:15:00.000Z",
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe("treatment-1");
    expect(response.body.selectedAnimalsCount).toBe(2);
    expect(tx.batch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          quantityAvailable: { decrement: 4 },
        },
      })
    );
  });

  it("fails with insufficient stock and rolls back", async () => {
    const tx = {
      animal: {
        findMany: vi.fn().mockResolvedValue([
          { id: "animal-1", tag: "A-1", internalCode: "IC-1" },
          { id: "animal-2", tag: "A-2", internalCode: "IC-2" },
          { id: "animal-3", tag: "A-3", internalCode: "IC-3" },
        ]),
      },
      batch: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "33333333-3333-4333-8333-333333333333",
            productId: "product-1",
            batchNumber: "B-1",
            quantityAvailable: 2,
            deletedAt: null,
            expiresAt: new Date("2027-01-01T00:00:00.000Z"),
          },
        ]),
      },
      treatment: {
        create: vi.fn(),
      },
    };

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => callback(tx));
    const auditSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({ id: "audit-1" } as any);

    const app = createApp();
    const response = await request(app)
      .post("/api/v1/treatments/group")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        description: "Aplicacion grupal",
        startedAt: "2026-02-10T09:00:00.000Z",
        filters: { category: "VACA" },
        scope: "ALL_FILTERED",
        medications: [
          {
            batchId: "33333333-3333-4333-8333-333333333333",
            dose: 1.5,
            doseUnit: "ml",
            route: "subcutanea",
            administeredAt: "2026-02-10T09:15:00.000Z",
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Insufficient stock");
    expect(tx.treatment.create).not.toHaveBeenCalled();
    expect(auditSpy).not.toHaveBeenCalled();
  });

  it("returns grouped treatments in by-animal query", async () => {
    const findManySpy = vi.spyOn(prisma.treatment, "findMany").mockResolvedValue([
      {
        id: "treatment-1",
        mode: "GROUP",
        description: "Aplicacion grupal",
      },
    ] as any);

    const app = createApp();
    const response = await request(app)
      .get("/api/v1/treatments/by-animal/animal-1")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body[0].mode).toBe("GROUP");
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ animalId: "animal-1" }),
            expect.objectContaining({ animals: expect.any(Object) }),
          ]),
        }),
      })
    );
  });

  it("expands active withdrawals for grouped treatments", async () => {
    vi.spyOn(prisma.administration, "findMany").mockResolvedValue([
      {
        meatWithdrawalUntil: new Date("2026-02-20T00:00:00.000Z"),
        milkWithdrawalUntil: new Date("2026-02-14T00:00:00.000Z"),
        product: { name: "Ivermectina" },
        treatment: {
          animal: null,
          animals: [
            {
              animal: { id: "animal-1", tag: "A-1", internalCode: "IC-1" },
            },
            {
              animal: { id: "animal-2", tag: "A-2", internalCode: "IC-2" },
            },
          ],
        },
      },
    ] as any);

    const app = createApp();
    const response = await request(app)
      .get("/api/v1/reports/withdrawals-active")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.items.map((row: any) => row.animal.id).sort()).toEqual([
      "animal-1",
      "animal-2",
    ]);
  });
});
