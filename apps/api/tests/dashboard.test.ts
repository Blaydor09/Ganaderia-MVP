import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/utils/jwt";
import { prisma } from "../src/config/prisma";

const accessToken = signAccessToken({
  sub: "11111111-1111-4111-8111-111111111111",
  roles: ["ADMIN"],
  tenantId: "22222222-2222-4222-8222-222222222222",
});

describe("dashboard overview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid range values", async () => {
    const app = createApp();
    const response = await request(app)
      .get("/api/v1/dashboard/overview?range=15d")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
  });

  it("returns overview payload for valid requests", async () => {
    vi.spyOn(prisma.animal, "count").mockResolvedValue(12);
    vi.spyOn(prisma.animal, "groupBy")
      .mockResolvedValueOnce([
        { category: "VACA", _count: { _all: 7 } },
        { category: "TORO", _count: { _all: 5 } },
      ] as any)
      .mockResolvedValueOnce([
        { sex: "FEMALE", _count: { _all: 8 } },
        { sex: "MALE", _count: { _all: 4 } },
      ] as any);
    vi.spyOn(prisma.treatment, "count").mockResolvedValueOnce(6).mockResolvedValueOnce(3);
    vi.spyOn(prisma.movement, "count").mockResolvedValueOnce(9).mockResolvedValueOnce(6);
    vi.spyOn(prisma.administration, "findMany")
      .mockResolvedValueOnce([{ treatmentId: "t-1" }, { treatmentId: "t-1" }] as any)
      .mockResolvedValueOnce([
        { administeredAt: new Date("2026-02-08T12:00:00.000Z") },
      ] as any);
    vi.spyOn(prisma.animalEvent, "findMany").mockResolvedValue([
      { type: "NACIMIENTO", occurredAt: new Date("2026-02-08T00:00:00.000Z") },
    ] as any);
    vi.spyOn(prisma.movement, "findMany").mockResolvedValue([
      {
        id: "move-1",
        movementType: "INTERNAL",
        occurredAt: new Date("2026-02-08T13:00:00.000Z"),
        animalId: "animal-1",
        animal: { id: "animal-1", tag: "TAG-1" },
        origin: { id: "origin-1", name: "Potrero Norte" },
        destination: { id: "destination-1", name: "Corral Principal" },
      },
    ] as any);
    vi.spyOn(prisma.product, "findMany").mockResolvedValue([
      {
        id: "prod-1",
        name: "Ivermectina",
        minStock: 10,
        unit: "ml",
      },
    ] as any);
    vi.spyOn(prisma.batch, "groupBy").mockResolvedValue([
      { productId: "prod-1", _sum: { quantityAvailable: 25 } },
    ] as any);
    vi.spyOn(prisma.batch, "count").mockResolvedValue(2);

    const app = createApp();
    const response = await request(app)
      .get("/api/v1/dashboard/overview?range=7d")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.kpis.animalsActive.value).toBe(12);
    expect(response.body.kpis.withdrawalsActive.value).toBe(1);
    expect(response.body.kpis.inventoryAlerts.expiring).toBe(2);
    expect(response.body.appliedFilters.range).toBe("7d");
    expect(response.body.treatmentsSeries).toHaveLength(7);
    expect(response.body.lifecycleSeries).toHaveLength(7);
    expect(response.body.inventoryTop[0].productName).toBe("Ivermectina");
    expect(response.body.movementsRecent[0].animalTag).toBe("TAG-1");
  });
});
