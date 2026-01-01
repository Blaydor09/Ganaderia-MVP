import { z } from "zod";

export const taskCreateSchema = z.object({
  title: z.string().min(1),
  taskType: z.string().min(1),
  dueAt: z.string().datetime(),
  notes: z.string().optional(),
});

export const taskUpdateSchema = z.object({
  status: z.enum(["OPEN", "DONE"]).optional(),
  notes: z.string().optional(),
});
