import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/asyncHandler";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/authSchemas";
import {
  changePassword,
  login,
  logout,
  listSessions,
  refresh,
  registerAccount,
  revokeSession,
  switchTenant,
} from "../services/authService";
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
import { requestPasswordReset, resetPassword } from "../services/passwordRecoveryService";

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
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
});
const accountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => String(req.body?.email ?? "unknown").trim().toLowerCase(),
  standardHeaders: true,
  legacyHeaders: false,
});

const toPublicSession = <T extends { refreshToken: string }>(session: T) => {
  const { refreshToken, ...publicSession } = session;
  return publicSession;
};

router.post(
  "/login",
  limiter,
  accountLoginLimiter,
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
    res.json(toPublicSession(result));
  })
);

router.post(
  "/password/forgot",
  recoveryLimiter,
  asyncHandler(async (req, res) => {
    const data = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(data.email).catch(() => undefined);
    res.status(202).json({
      message: "If the account exists, password recovery instructions will be sent",
    });
  })
);

router.post(
  "/password/reset",
  recoveryLimiter,
  asyncHandler(async (req, res) => {
    const data = resetPasswordSchema.parse(req.body);
    await resetPassword({
      token: data.token,
      newPassword: data.newPassword,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    clearTenantRefreshCookie(res);
    res.json({ success: true });
  })
);

router.post(
  "/register",
  registrationLimiter,
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
    res.status(201).json(toPublicSession(result));
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
    const refreshToken = readTenantRefreshCookie(req);
    if (!refreshToken) {
      throw new ApiError(400, "Refresh token is required");
    }
    const result = await refresh(refreshToken, req.headers["user-agent"], req.ip);
    setTenantRefreshCookie(res, result.refreshToken);
    res.json(toPublicSession(result));
  })
);

router.post(
  "/logout",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const refreshToken = readTenantRefreshCookie(req);

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
    res.json(toPublicSession(result));
  })
);

router.patch(
  "/me/password",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = changePasswordSchema.parse(req.body);
    await changePassword({
      userId: req.user!.id,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      scope: "tenant",
      tenantId: req.user!.tenantId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    clearTenantRefreshCookie(res);
    res.json({ success: true });
  })
);

router.get(
  "/sessions",
  authenticate,
  asyncHandler(async (req, res) => {
    const sessions = await listSessions({
      userId: req.user!.id,
      scope: "tenant",
      tenantId: req.user!.tenantId,
    });
    res.json({ items: sessions });
  })
);

router.delete(
  "/sessions/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    await revokeSession({
      sessionId: req.params.id,
      userId: req.user!.id,
      scope: "tenant",
      tenantId: req.user!.tenantId,
    });
    res.json({ success: true });
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
