import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { dashboardController } from "./dashboard.controller";
import { searchQuerySchema } from "./dashboard.validation";

/** Sections are filtered per permission inside the service, so any admin may call these. */
export const dashboardRoutes = Router();
dashboardRoutes.use(authenticateAdmin, requireAdminRole());
dashboardRoutes.get("/", dashboardController.getOverview);
dashboardRoutes.get("/alerts", dashboardController.getAlerts);

export const searchRoutes = Router();
searchRoutes.use(authenticateAdmin, requireAdminRole());
searchRoutes.get("/", validate(searchQuerySchema, "query"), dashboardController.search);
