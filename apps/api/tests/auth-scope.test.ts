import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatePlatform, authenticateTenant } from "../src/middleware/auth";
import { prisma } from "../src/config/prisma";
import * as jwt from "../src/utils/jwt";
import * as usageService from "../src/services/usageService";

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("auth scope and tenant status", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks tenant routes for platform scoped token", async () => {
    const req: any = {
      headers: { authorization: "Bearer token" },
      method: "GET",
      path: "/animals",
    };
    const res = mockResponse();
    const next = vi.fn();

    vi.spyOn(jwt, "verifyAccessToken").mockReturnValue({
      sub: "u1",
      roles: ["platform_super_admin"],
      scope: "platform",
    });

    await authenticateTenant(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token scope" });
  });

  it("blocks access when tenant is suspended", async () => {
    const req: any = {
      headers: { authorization: "Bearer token" },
      method: "GET",
      path: "/animals",
      ip: "127.0.0.1",
    };
    const res = mockResponse();
    const next = vi.fn();

    vi.spyOn(jwt, "verifyAccessToken").mockReturnValue({
      sub: "u1",
      roles: ["ADMIN"],
      scope: "tenant",
      tenantId: "t1",
    });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: "u1", isActive: true } as any);
    vi.spyOn(prisma.tenant, "findUnique").mockResolvedValue({
      id: "t1",
      status: "SUSPENDED",
    } as any);
    vi.spyOn(prisma.userRole, "findMany").mockResolvedValue([
      { role: { name: "ADMIN" } },
    ] as any);
    vi.spyOn(usageService, "getCurrentUsageValue").mockResolvedValue(0);
    vi.spyOn(usageService, "assertTenantLimit").mockResolvedValue(undefined as never);
    vi.spyOn(usageService, "incrementUsageCounter").mockResolvedValue(1 as never);

    await authenticateTenant(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.message).toBe("Tenant suspended");
    expect(payload.details.code).toBe("TENANT_SUSPENDED");
  });

  it("blocks platform routes for tenant scoped token", async () => {
    const req: any = {
      headers: { authorization: "Bearer token" },
    };
    const res = mockResponse();
    const next = vi.fn();

    vi.spyOn(jwt, "verifyAccessToken").mockReturnValue({
      sub: "u1",
      roles: ["ADMIN"],
      scope: "tenant",
      tenantId: "t1",
    });

    await authenticatePlatform(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token scope" });
  });
});
