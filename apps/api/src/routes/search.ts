import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const q = String(req.query.q ?? "");
    if (!q) {
      return res.json({ animals: [], products: [], batches: [] });
    }

    const [animals, products, batches] = await Promise.all([
      prisma.animal.findMany({
        where: {
          organizationId,
          tag: { contains: q, mode: "insensitive" },
          deletedAt: null,
        },
        take: 5,
      }),
      prisma.product.findMany({
        where: {
          organizationId,
          name: { contains: q, mode: "insensitive" },
          deletedAt: null,
        },
        take: 5,
      }),
      prisma.batch.findMany({
        where: {
          organizationId,
          batchNumber: { contains: q, mode: "insensitive" },
          deletedAt: null,
        },
        take: 5,
      }),
    ]);

    res.json({ animals, products, batches });
  })
);

export default router;
