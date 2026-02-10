import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../utils/asyncHandler";
import { refreshSchema } from "../../validators/authSchemas";
import { platformLoginSchema } from "../../validators/platformSchemas";
import {
  platformLogin,
  platformLogout,
  platformRefresh,
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

router.post(
  "/login",
  limiter,
  asyncHandler(async (req, res) => {
    const data = platformLoginSchema.parse(req.body);
    const result = await platformLogin({
      email: data.email,
      password: data.password,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    setPlatformRefreshCookie(res, result.refreshToken);
    res.json(result);
  })
);

router.post(
  "/refresh",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const bodyToken = refreshSchema.parse(req.body ?? {}).refreshToken;
    const cookieToken = readPlatformRefreshCookie(req);
    const refreshToken = bodyToken ?? cookieToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    const result = await platformRefresh(refreshToken, req.headers["user-agent"], req.ip);
    setPlatformRefreshCookie(res, result.refreshToken);
    res.json(result);
  })
);

router.post(
  "/logout",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const bodyToken = refreshSchema.parse(req.body ?? {}).refreshToken;
    const cookieToken = readPlatformRefreshCookie(req);
    const refreshToken = bodyToken ?? cookieToken;

    if (!refreshToken) {
      clearPlatformRefreshCookie(res);
      return res.json({ success: true });
    }

    const result = await platformLogout(refreshToken);
    clearPlatformRefreshCookie(res);
    res.json(result);
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
