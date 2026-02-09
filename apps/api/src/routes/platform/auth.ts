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

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
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
    res.json(result);
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const data = refreshSchema.parse(req.body);
    const result = await platformRefresh(data.refreshToken);
    res.json(result);
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const data = refreshSchema.parse(req.body);
    const result = await platformLogout(data.refreshToken);
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
