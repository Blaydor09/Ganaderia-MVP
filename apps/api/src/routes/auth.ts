import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/asyncHandler";
import { loginSchema, refreshSchema, registerSchema } from "../validators/authSchemas";
import { login, logout, refresh, registerAccount, switchTenant } from "../services/authService";
import { authenticate } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { z } from "zod";
import {
  clearTenantRefreshCookie,
  readTenantRefreshCookie,
  setTenantRefreshCookie,
} from "../utils/authCookies";
import { ApiError } from "../utils/errors";

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const resolveRefreshToken = (body: unknown, cookieToken?: string) => {
  const parsed = refreshSchema.parse(body ?? {});
  const token = parsed.refreshToken ?? cookieToken;
  if (!token) {
    throw new ApiError(400, "Refresh token is required");
  }
  return token;
};

router.post(
  "/login",
  limiter,
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const result = await login(
      data.email,
      data.password,
      data.tenantId,
      req.headers["user-agent"],
      req.ip
    );
    setTenantRefreshCookie(res, result.refreshToken);
    res.json(result);
  })
);

router.post(
  "/register",
  limiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const result = await registerAccount({
      name: data.name,
      email: data.email,
      password: data.password,
      tenantName: data.tenantName,
      registrationCode: data.registrationCode,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    setTenantRefreshCookie(res, result.refreshToken);
    res.status(201).json(result);
  })
);

router.get(
  "/registration-status",
  asyncHandler(async (_req, res) => {
    const allowRegistration = env.registrationMode !== "closed";
    res.json({
      allowRegistration,
      requiresCode: env.registrationMode === "protected",
      mode: env.registrationMode,
    });
  })
);

router.post(
  "/refresh",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const refreshToken = resolveRefreshToken(req.body, readTenantRefreshCookie(req));
    const result = await refresh(refreshToken, req.headers["user-agent"], req.ip);
    setTenantRefreshCookie(res, result.refreshToken);
    res.json(result);
  })
);

router.post(
  "/logout",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const bodyToken = refreshSchema.parse(req.body ?? {}).refreshToken;
    const cookieToken = readTenantRefreshCookie(req);
    const refreshToken = bodyToken ?? cookieToken;

    if (!refreshToken) {
      clearTenantRefreshCookie(res);
      return res.json({ success: true });
    }

    const result = await logout(refreshToken);
    clearTenantRefreshCookie(res);
    res.json(result);
  })
);

router.post(
  "/switch-tenant",
  authenticate,
  asyncHandler(async (req, res) => {
    const schema = z.object({ tenantId: z.string().uuid() });
    const data = schema.parse(req.body);
    const result = await switchTenant({
      userId: req.user!.id,
      tenantId: data.tenantId,
      previousTenantId: req.user!.tenantId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    setTenantRefreshCookie(res, result.refreshToken);
    res.json(result);
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles
        .filter((row: { tenantId?: string }) => row.tenantId === req.user!.tenantId)
        .map((row: { role: { name: string } }) => row.role.name),
      tenantId: req.user!.tenantId,
      scope: req.user!.scope,
      tenant: tenant ? { id: tenant.id, name: tenant.name, status: tenant.status } : null,
    });
  })
);

export default router;
