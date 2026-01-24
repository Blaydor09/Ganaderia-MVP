import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/asyncHandler";
import { loginSchema, refreshSchema, registerSchema } from "../validators/authSchemas";
import { login, logout, refresh, registerFirstAdmin } from "../services/authService";
import { authenticate } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

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
    const data = loginSchema.parse(req.body);
    const result = await login(data.email, data.password, req.headers["user-agent"], req.ip);
    res.json(result);
  })
);

router.post(
  "/register",
  limiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const result = await registerFirstAdmin({
      name: data.name,
      email: data.email,
      password: data.password,
      registrationCode: data.registrationCode,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    res.status(201).json(result);
  })
);

router.get(
  "/registration-status",
  asyncHandler(async (_req, res) => {
    const count = await prisma.user.count();
    const isFirstUser = count === 0;
    const allowRegistration = isFirstUser && env.registrationMode !== "closed";
    res.json({
      allowRegistration,
      requiresCode: env.registrationMode === "protected",
      mode: env.registrationMode,
    });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const data = refreshSchema.parse(req.body);
    const result = await refresh(data.refreshToken);
    res.json(result);
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const data = refreshSchema.parse(req.body);
    const result = await logout(data.refreshToken);
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

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((row: { role: { name: string } }) => row.role.name),
    });
  })
);

export default router;
