import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { categoryService } from "./category.service";
import type {
  CategoryListQueryParams,
  CreateCategoryBody,
  UpdateCategoryBody,
} from "./category.validation";

class CategoryController {
  listCategories = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as CategoryListQueryParams;
    const result = await categoryService.listCategories(query);
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Categories fetched successfully"
    );
  });

  getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const category = await categoryService.getCategoryById(id);
    successResponse(res, category, "Category fetched successfully");
  });

  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateCategoryBody;
    const category = await categoryService.createCategory(body, req.user?.id);
    createdResponse(res, category, "Category created successfully");
  });

  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateCategoryBody;
    const category = await categoryService.updateCategory(
      id,
      body,
      req.user?.id
    );
    successResponse(res, category, "Category updated successfully");
  });

  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await categoryService.deleteCategory(id, req.user?.id);
    successResponse(res, null, "Category deleted successfully");
  });
}

export const categoryController = new CategoryController();
