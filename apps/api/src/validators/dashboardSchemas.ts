import { z } from "zod";

const optionalUuid = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return value;
  },
  z.string().uuid().optional()
);

export const dashboardQuerySchema = z
  .object({
    range: z.enum(["7d", "30d", "90d"]).default("30d"),
    fincaId: optionalUuid,
    establishmentId: optionalUuid,
  })
  .strict();

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
