import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/utils/jwt";
import { prisma } from "../src/config/prisma";

const userId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

const accessToken = signAccessToken({
  sub: userId,
  roles: ["ADMIN"],
  scope: "tenant",
  tenantId,
});

describe("establishments transition", () => {
  beforeEach(() => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: userId,
      isActive: true,
    } as any);
    vi.spyOn(prisma.tenant, "findUnique").mockResolvedValue({
      id: tenantId,
      status: "ACTIVE",
    } as any);
    vi.spyOn(prisma.userRole, "findMany").mockResolvedValue([
      {
        role: { name: "ADMIN" },
      },
    ] as any);
    vi.spyOn(prisma.tenantSubscription, "findFirst").mockResolvedValue({
      id: "sub-1",
      tenantId,
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
    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({ id: "audit-1" } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hides legacy corrals from the active establishments tree by default", async () => {
    const findMany = vi.spyOn(prisma.establishment, "findMany").mockResolvedValue([
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: "Finca Central",
        type: "FINCA",
        parentId: null,
        fincaId: "55555555-5555-4555-8555-555555555555",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Potrero Norte",
        type: "POTRERO",
        parentId: "55555555-5555-4555-8555-555555555555",
        fincaId: "55555555-5555-4555-8555-555555555555",
      },
    ] as any);

    const app = createApp();
    const response = await request(app)
      .get("/api/v1/establishments?tree=true")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          type: { in: ["FINCA", "POTRERO"] },
        }),
      })
    );
  });

  it("creates a finca together with its initial potreros", async () => {
    const create = vi.spyOn(prisma.establishment, "create").mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      name: "Finca Central",
      type: "FINCA",
      parentId: null,
      fincaId: "55555555-5555-4555-8555-555555555555",
    } as any);

    const app = createApp();
    const response = await request(app)
      .post("/api/v1/establishments")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Finca Central",
        type: "FINCA",
        potreros: ["Potrero Norte", "Potrero Sur"],
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe("55555555-5555-4555-8555-555555555555");

    const createArgs = create.mock.calls[0]?.[0] as any;
    expect(createArgs.data.name).toBe("Finca Central");
    expect(createArgs.data.type).toBe("FINCA");
    expect(createArgs.data.parentId).toBeNull();
    expect(createArgs.data.tenantId).toBe(tenantId);
    expect(createArgs.data.createdById).toBe(userId);
    expect(createArgs.data.id).toBeTypeOf("string");
    expect(createArgs.data.fincaId).toBe(createArgs.data.id);
    expect(createArgs.data.children).toEqual({
      create: [
        {
          name: "Potrero Norte",
          type: "POTRERO",
          fincaId: createArgs.data.id,
          tenantId,
          createdById: userId,
        },
        {
          name: "Potrero Sur",
          type: "POTRERO",
          fincaId: createArgs.data.id,
          tenantId,
          createdById: userId,
        },
      ],
    });
  });

  it("rejects finca creation without initial potreros", async () => {
    const create = vi.spyOn(prisma.establishment, "create");
    const app = createApp();
    const response = await request(app)
      .post("/api/v1/establishments")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Finca Central",
        type: "FINCA",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
    expect(create).not.toHaveBeenCalled();
  });

  it("deletes a finca together with its empty child locations", async () => {
    vi.spyOn(prisma.establishment, "findFirst").mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      name: "Finca Central",
      type: "FINCA",
      fincaId: "55555555-5555-4555-8555-555555555555",
    } as any);
    vi.spyOn(prisma.establishment, "findMany").mockResolvedValue([
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: "Finca Central",
        type: "FINCA",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Potrero Norte",
        type: "POTRERO",
      },
    ] as any);
    vi.spyOn(prisma.animal, "count").mockResolvedValue(0);
    vi.spyOn(prisma.animalEvent, "count").mockResolvedValue(0);
    const movementCount = vi.spyOn(prisma.movement, "count").mockResolvedValue(0);
    const deleteMany = vi.spyOn(prisma.establishment, "deleteMany").mockResolvedValue({
      count: 2,
    } as any);

    const app = createApp();
    const response = await request(app)
      .delete("/api/v1/establishments/55555555-5555-4555-8555-555555555555")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      deletedIds: [
        "55555555-5555-4555-8555-555555555555",
        "44444444-4444-4444-8444-444444444444",
      ],
    });
    expect(movementCount).toHaveBeenCalledTimes(2);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [
            "55555555-5555-4555-8555-555555555555",
            "44444444-4444-4444-8444-444444444444",
          ],
        },
        tenantId,
      },
    });
  });

  it("migrates active animals from a legacy corral to a potrero of the same finca", async () => {
    vi.spyOn(prisma.establishment, "findFirst")
      .mockResolvedValueOnce({
        id: "33333333-3333-4333-8333-333333333333",
        name: "Corral Legacy",
        type: "CORRAL",
        fincaId: "55555555-5555-4555-8555-555555555555",
      } as any)
      .mockResolvedValueOnce({
        id: "44444444-4444-4444-8444-444444444444",
        name: "Potrero Norte",
        type: "POTRERO",
        fincaId: "55555555-5555-4555-8555-555555555555",
      } as any);
    const updateMany = vi.spyOn(prisma.animal, "updateMany").mockResolvedValue({
      count: 3,
    } as any);

    const app = createApp();
    const response = await request(app)
      .post("/api/v1/establishments/legacy-corrals/corral-1/migrate-animals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ destinationId: "44444444-4444-4444-8444-444444444444" });

    expect(response.status).toBe(200);
    expect(response.body.movedAnimals).toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        establishmentId: "33333333-3333-4333-8333-333333333333",
        deletedAt: null,
        tenantId,
      },
      data: {
        establishmentId: "44444444-4444-4444-8444-444444444444",
      },
    });
  });

  it("rejects new corrales in establishment creation", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/v1/establishments")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Corral Principal",
        type: "CORRAL",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
  });
});
