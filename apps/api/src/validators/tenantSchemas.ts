import { z } from "zod";

export const tenantCreateSchema = z.object({
  name: z.string().min(2),
});
