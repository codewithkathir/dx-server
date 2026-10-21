import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { successResponse } from "../../shared/responses/response.handler";
import { dropdownService } from "./dropdown.service";
import type {
  SubCategoryDropdownQueryParams,
  SubSubCategoryDropdownQueryParams,
} from "./dropdown.validation";

class DropdownController {
  listCategories = asyncHandler(async (_req: Request, res: Response) => {
    const data = await dropdownService.listCategories();
    successResponse(res, data, "Categories fetched successfully");
  });

  listSubCategories = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as SubCategoryDropdownQueryParams;
    const data = await dropdownService.listSubCategories(query);
    successResponse(res, data, "Sub categories fetched successfully");
  });

  listSubSubCategories = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as SubSubCategoryDropdownQueryParams;
    const data = await dropdownService.listSubSubCategories(query);
    successResponse(res, data, "Sub sub categories fetched successfully");
  });

  listPaymentMethods = asyncHandler(async (_req: Request, res: Response) => {
    const data = await dropdownService.listPaymentMethods();
    successResponse(res, data, "Payment methods fetched successfully");
  });

  /** Admin: every vehicle. */
  listVehicles = asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, await dropdownService.listVehicles(), "Vehicles fetched successfully");
  });

  /** Employee app: the vehicles the signed-in employee currently has. */
  listMyVehicles = asyncHandler(async (req: Request, res: Response) => {
    successResponse(res, await dropdownService.listVehicles(req.user!.id), "Vehicles fetched successfully");
  });

  listProducts = asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, await dropdownService.listProducts(), "Products fetched successfully");
  });

  listCountries = asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, await dropdownService.listCountries(), "Countries fetched successfully");
  });

  listWhom = asyncHandler(async (_req: Request, res: Response) => {
    const data = await dropdownService.listWhom();
    successResponse(res, data, "Whom list fetched successfully");
  });
}

export const dropdownController = new DropdownController();
