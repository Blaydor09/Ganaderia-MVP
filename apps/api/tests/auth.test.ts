import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { signRefreshToken } from "../src/utils/jwt";
import { hashPassword } from "../src/utils/password";

describe("auth refresh/logout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 for invalid refresh token", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "invalid-token" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid refresh token");
  });

  it("returns 401 for invalid logout token", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: "invalid-token" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid refresh token");
  });

  it("blocks refresh for inactive users", async () => {
    const userId = "33333333-3333-4333-8333-333333333333";
    const tenantId = "44444444-4444-4444-8444-444444444444";
    const refreshToken = signRefreshToken({
      sub: userId,
      roles: ["ADMIN"],
      scope: "tenant",
      tenantId,
    });
    const tokenHash = await hashPassword(refreshToken);

    vi.spyOn(prisma.refreshToken, "findMany").mockResolvedValue([
      {
        id: "rt-1",
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        userAgent: null,
        ip: null,
        createdAt: new Date(),
      },
    ] as any);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: userId,
      isActive: false,
    } as any);

    const app = createApp();
    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid credentials");
  });
});
