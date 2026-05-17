import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { subCategoryService } from "./sub-category.service";
import type {
  CreateSubCategoryBody,
  SubCategoryListQueryParams,
  UpdateSubCategoryBody,
} from "./sub-category.validation";

class SubCategoryController {
  listSubCategories = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as SubCategoryListQueryParams;
    const result = await subCategoryService.listSubCategories(query);
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Sub categories fetched successfully"
    );
  });

  listByCategoryId = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.validated!.params as {
      categoryId: number;
    };
    const query = req.validated!.query as SubCategoryListQueryParams;
    const result = await subCategoryService.listSubCategories({
      ...query,
      categoryId,
    });
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Sub categories fetched successfully"
    );
  });

  getSubCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const item = await subCategoryService.getSubCategoryById(id);
    successResponse(res, item, "Sub category fetched successfully");
  });

  createSubCategory = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateSubCategoryBody;
    const item = await subCategoryService.createSubCategory(body, req.user?.id);
    createdResponse(res, item, "Sub category created successfully");
  });

  updateSubCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateSubCategoryBody;
    const item = await subCategoryService.updateSubCategory(
      id,
      body,
      req.user?.id
    );
    successResponse(res, item, "Sub category updated successfully");
  });

  deleteSubCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await subCategoryService.deleteSubCategory(id, req.user?.id);
    successResponse(res, null, "Sub category deleted successfully");
  });
}

export const subCategoryController = new SubCategoryController();
