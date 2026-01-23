import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { taskCreateSchema, taskUpdateSchema } from "../validators/taskSchemas";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const organizationId = _req.user!.organizationId;
    const tasks = await prisma.task.findMany({
      where: { organizationId },
      orderBy: { dueAt: "asc" },
    });
    res.json(tasks);
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const data = taskCreateSchema.parse(req.body);
    const created = await prisma.task.create({
      data: {
        title: data.title,
        taskType: data.taskType,
        organizationId,
        dueAt: new Date(data.dueAt),
        notes: data.notes,
      },
    });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const data = taskUpdateSchema.parse(req.body);
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }
    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  })
);

export default router;
