import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { subSubCategoryService } from "./sub-sub-category.service";
import type {
  CreateSubSubCategoryBody,
  SubSubCategoryListQueryParams,
  UpdateSubSubCategoryBody,
} from "./sub-sub-category.validation";

class SubSubCategoryController {
  listSubSubCategories = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as SubSubCategoryListQueryParams;
    const result = await subSubCategoryService.listSubSubCategories(query);
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Sub sub categories fetched successfully"
    );
  });

  getSubSubCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const item = await subSubCategoryService.getSubSubCategoryById(id);
    successResponse(res, item, "Sub sub category fetched successfully");
  });

  createSubSubCategory = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateSubSubCategoryBody;
    const item = await subSubCategoryService.createSubSubCategory(
      body,
      req.user?.id
    );
    createdResponse(res, item, "Sub sub category created successfully");
  });

  updateSubSubCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateSubSubCategoryBody;
    const item = await subSubCategoryService.updateSubSubCategory(
      id,
      body,
      req.user?.id
    );
    successResponse(res, item, "Sub sub category updated successfully");
  });

  deleteSubSubCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await subSubCategoryService.deleteSubSubCategory(id, req.user?.id);
    successResponse(res, null, "Sub sub category deleted successfully");
  });
}

export const subSubCategoryController = new SubSubCategoryController();
