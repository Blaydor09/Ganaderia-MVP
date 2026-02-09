import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { dashboardQuerySchema } from "../validators/dashboardSchemas";
import { getDashboardOverview } from "../services/dashboardService";

const router = Router();

router.get(
  "/overview",
  authenticate,
  asyncHandler(async (req, res) => {
    const query = dashboardQuerySchema.parse(req.query);
    const overview = await getDashboardOverview({
      tenantId: req.user!.tenantId,
      range: query.range,
      fincaId: query.fincaId,
      establishmentId: query.establishmentId,
    });
    res.json(overview);
  })
);

export default router;
