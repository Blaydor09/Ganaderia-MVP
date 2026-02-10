import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { signRefreshToken } from "../src/utils/jwt";
import { hashPassword } from "../src/utils/password";
import { refresh as refreshSession } from "../src/services/authService";

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

  it("accepts refresh token from cookie when body is empty", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", ["ig_refresh_token=invalid-token"]);

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

  it("rotates refresh token and revokes previous token", async () => {
    const userId = "55555555-5555-4555-8555-555555555555";
    const tenantId = "66666666-6666-4666-8666-666666666666";
    const currentRefreshToken = signRefreshToken({
      sub: userId,
      roles: ["ADMIN"],
      scope: "tenant",
      tenantId,
    });
    const tokenHash = await hashPassword(currentRefreshToken);

    vi.spyOn(prisma.refreshToken, "findMany").mockResolvedValue([
      {
        id: "rt-old",
        userId,
        tokenHash,
        scope: "tenant",
        tenantId,
        impersonationSessionId: null,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        userAgent: null,
        ip: null,
        createdAt: new Date(),
      },
    ] as any);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: userId,
      name: "Test User",
      email: "test@example.com",
      isActive: true,
    } as any);
    vi.spyOn(prisma.tenant, "findUnique").mockResolvedValue({
      id: tenantId,
      status: "ACTIVE",
    } as any);
    vi.spyOn(prisma.userRole, "findMany").mockResolvedValue([
      { role: { name: "ADMIN" } },
    ] as any);

    const updateSpy = vi.fn().mockResolvedValue({ id: "rt-old" });
    const createSpy = vi.fn().mockResolvedValue({ id: "rt-new" });
    vi.spyOn(prisma as any, "$transaction").mockImplementation(async (callback: any) =>
      callback({
        refreshToken: {
          update: updateSpy,
          create: createSpy,
        },
      })
    );

    const result = await refreshSession(currentRefreshToken, "unit-test-agent", "127.0.0.1");

    expect(typeof result.accessToken).toBe("string");
    expect(typeof result.refreshToken).toBe("string");
    expect(result.refreshToken).not.toBe(currentRefreshToken);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: "rt-old" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          scope: "tenant",
          tenantId,
        }),
      })
    );
  });
});
