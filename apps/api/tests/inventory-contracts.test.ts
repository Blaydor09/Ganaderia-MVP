import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/utils/jwt";

const accessToken = signAccessToken({
  sub: "11111111-1111-4111-8111-111111111111",
  roles: ["ADMIN"],
  tenantId: "22222222-2222-4222-8222-222222222222",
});

describe("inventory and batch public contracts", () => {
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
});
