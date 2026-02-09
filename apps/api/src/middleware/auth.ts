import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/errors";
import {
  assertTenantLimit,
  getCurrentUsageValue,
  incrementUsageCounter,
} from "../services/usageService";

const extractBearerToken = (req: Request) => {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
};

const unauthorized = (res: Response) => res.status(401).json({ message: "Unauthorized" });

export const authenticateTenant = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);
  if (!token) {
    return unauthorized(res);
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.scope !== "tenant" || !payload.tenantId) {
      return res.status(401).json({ message: "Invalid token scope" });
    }

    const [user, tenant, memberships] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      }),
      prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: { id: true, status: true },
      }),
      prisma.userRole.findMany({
        where: { userId: payload.sub, tenantId: payload.tenantId },
        include: { role: { select: { name: true } } },
      }),
    ]);

    if (!user || !user.isActive) {
      return unauthorized(res);
    }
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    if (tenant.status !== "ACTIVE") {
      throw new ApiError(403, "Tenant suspended", { code: "TENANT_SUSPENDED" });
    }
    if (!memberships.length) {
      return res.status(403).json({ message: "Tenant access denied" });
    }

    const roles = Array.from(new Set(memberships.map((row) => row.role.name)));
    req.user = {
      id: payload.sub,
      roles,
      tenantId: payload.tenantId,
      scope: "tenant",
      actorType: "tenant",
      impersonationSessionId: payload.impersonationSessionId,
    };

    const monthlyRequests = await getCurrentUsageValue(payload.tenantId, "API_REQUESTS_MONTHLY");
    await assertTenantLimit({
      tenantId: payload.tenantId,
      metricKey: "API_REQUESTS_MONTHLY",
      nextValue: monthlyRequests + 1,
      auditContext: {
        actorUserId: payload.sub,
        actorType: "tenant",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        resource: "api.request",
      },
    });
    await incrementUsageCounter({
      tenantId: payload.tenantId,
      metricKey: "API_REQUESTS_MONTHLY",
      source: "api.request",
      resourceId: `${req.method} ${req.path}`,
      metadata: { method: req.method, path: req.path },
    });

    return next();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ message: error.message, details: error.details });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authenticatePlatform = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);
  if (!token) {
    return unauthorized(res);
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.scope !== "platform") {
      return res.status(401).json({ message: "Invalid token scope" });
    }

    const [user, rows] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      }),
      prisma.platformUserRole.findMany({
        where: { userId: payload.sub },
        include: { role: { select: { name: true } } },
      }),
    ]);

    if (!user || !user.isActive) {
      return unauthorized(res);
    }
    if (!rows.length) {
      return res.status(403).json({ message: "Platform access denied" });
    }

    req.user = {
      id: payload.sub,
      roles: Array.from(new Set(rows.map((row) => row.role.name))),
      tenantId: "",
      scope: "platform",
      actorType: "platform",
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authenticate = authenticateTenant;
