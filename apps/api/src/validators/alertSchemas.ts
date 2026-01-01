import { z } from "zod";

export const alertCreateSchema = z.object({
  type: z.enum(["STOCK", "EXPIRY", "WITHDRAWAL"]),
  title: z.string().min(1),
  message: z.string().min(1),
  dueAt: z.string().datetime(),
});
