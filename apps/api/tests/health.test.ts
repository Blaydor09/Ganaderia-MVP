import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

describe("health endpoint", () => {
  it("returns ok", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
