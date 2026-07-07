import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../utils/asyncHandler";
import { changePasswordSchema } from "../../validators/authSchemas";
import {
  platformLoginSchema,
  platformMfaConfirmSchema,
  platformMfaSetupSchema,
} from "../../validators/platformSchemas";
import { changePassword } from "../../services/authService";
import { listSessions, revokeSession } from "../../services/authService";
import {
  platformLogin,
  platformLogout,
  platformRefresh,
  beginPlatformMfaEnrollment,
  confirmPlatformMfaEnrollment,
} from "../../services/platformAuthService";
import { authenticatePlatform } from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import {
  clearPlatformRefreshCookie,
  readPlatformRefreshCookie,
  setPlatformRefreshCookie,
} from "../../utils/authCookies";

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
const accountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
    const data = platformLoginSchema.parse(req.body);
    const result = await platformLogin({
      email: data.email,
      password: data.password,
      mfaCode: data.mfaCode,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    if ("mfaEnrollmentRequired" in result) {
      return res.json(result);
    }
    setPlatformRefreshCookie(res, result.refreshToken);
    res.json(toPublicSession(result));
  })
);

router.post(
  "/mfa/setup",
  limiter,
  asyncHandler(async (req, res) => {
    const data = platformMfaSetupSchema.parse(req.body);
    const result = await beginPlatformMfaEnrollment(data.enrollmentToken);
    res.json(result);
  })
);

router.post(
  "/mfa/confirm",
  limiter,
  asyncHandler(async (req, res) => {
    const data = platformMfaConfirmSchema.parse(req.body);
    const result = await confirmPlatformMfaEnrollment({
      enrollmentToken: data.enrollmentToken,
      code: data.code,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    setPlatformRefreshCookie(res, result.refreshToken);
    res.json(toPublicSession(result));
  })
);

router.post(
  "/refresh",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const refreshToken = readPlatformRefreshCookie(req);
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    const result = await platformRefresh(refreshToken, req.headers["user-agent"], req.ip);
    setPlatformRefreshCookie(res, result.refreshToken);
    res.json(toPublicSession(result));
  })
);

router.post(
  "/logout",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const refreshToken = readPlatformRefreshCookie(req);

    if (!refreshToken) {
      clearPlatformRefreshCookie(res);
      return res.json({ success: true });
    }

    const result = await platformLogout(refreshToken);
    clearPlatformRefreshCookie(res);
    res.json(result);
  })
);

router.patch(
  "/me/password",
  authenticatePlatform,
  asyncHandler(async (req, res) => {
    const data = changePasswordSchema.parse(req.body);
    await changePassword({
      userId: req.user!.id,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      scope: "platform",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    clearPlatformRefreshCookie(res);
    res.json({ success: true });
  })
);

router.get(
  "/sessions",
  authenticatePlatform,
  asyncHandler(async (req, res) => {
    const sessions = await listSessions({ userId: req.user!.id, scope: "platform" });
    res.json({ items: sessions });
  })
);

router.delete(
  "/sessions/:id",
  authenticatePlatform,
  asyncHandler(async (req, res) => {
    await revokeSession({
      sessionId: req.params.id,
      userId: req.user!.id,
      scope: "platform",
    });
    res.json({ success: true });
  })
);

router.get(
  "/me",
  authenticatePlatform,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        platformRoles: {
          include: { role: true },
        },
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      scope: "platform",
      roles: Array.from(new Set(user.platformRoles.map((row) => row.role.name))),
    });
  })
);

export default router;
