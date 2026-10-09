import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { successResponse } from "../../shared/responses/response.handler";
import { dashboardService } from "./dashboard.service";
import type { SearchQuery } from "./dashboard.validation";

class DashboardController {
  getOverview = asyncHandler(async (req: Request, res: Response) => {
    successResponse(res, await dashboardService.getOverview(req.user!), "Dashboard fetched successfully");
  });

  getAlerts = asyncHandler(async (req: Request, res: Response) => {
    successResponse(res, await dashboardService.getAlerts(req.user!), "Alerts fetched successfully");
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.validated!.query as SearchQuery;
    successResponse(res, await dashboardService.search(req.user!, q), "Search results fetched successfully");
  });
}

export const dashboardController = new DashboardController();
