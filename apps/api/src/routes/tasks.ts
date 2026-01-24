import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { taskCreateSchema, taskUpdateSchema } from "../validators/taskSchemas";
import { writeAudit } from "../utils/audit";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const tasks = await prisma.task.findMany({ orderBy: { dueAt: "asc" } });
    res.json(tasks);
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = taskCreateSchema.parse(req.body);
    const created = await prisma.task.create({
      data: {
        title: data.title,
        taskType: data.taskType,
        dueAt: new Date(data.dueAt),
        notes: data.notes,
        createdById: req.user?.id,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      action: "CREATE",
      entity: "task",
      entityId: created.id,
      after: created,
      ip: req.ip,
    });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO"),
  asyncHandler(async (req, res) => {
    const data = taskUpdateSchema.parse(req.body);
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });

    await writeAudit({
      userId: req.user?.id,
      action: "UPDATE",
      entity: "task",
      entityId: updated.id,
      before: existing,
      after: updated,
      ip: req.ip,
    });
    res.json(updated);
  })
);

export default router;
