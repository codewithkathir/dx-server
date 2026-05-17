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

  listWhom = asyncHandler(async (_req: Request, res: Response) => {
    const data = await dropdownService.listWhom();
    successResponse(res, data, "Whom list fetched successfully");
  });
}

export const dropdownController = new DropdownController();
