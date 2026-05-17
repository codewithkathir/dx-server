import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { categoryService } from "../categories/category.service";
import { subCategoryRepository } from "./sub-category.repository";
import type {
  CreateSubCategoryInput,
  SubCategoryListQuery,
  SubCategoryPublic,
  SubCategoryRow,
  UpdateSubCategoryInput,
} from "./sub-category.types";

class SubCategoryService {
  private toPublic(row: SubCategoryRow): SubCategoryPublic {
    return {
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listSubCategories(query: SubCategoryListQuery) {
    const { data, total } = await subCategoryRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublic(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getSubCategoryById(id: number): Promise<SubCategoryPublic> {
    const row = await subCategoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Sub category not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublic(row);
  }

  async createSubCategory(
    input: CreateSubCategoryInput,
    createdBy?: number
  ): Promise<SubCategoryPublic> {
    await categoryService.assertCategoryExists(input.categoryId);

    const existing = await subCategoryRepository.findByNameInCategory(
      input.categoryId,
      input.name
    );
    if (existing) {
      throw new ApiError(
        "Sub category with this name already exists for the category",
        ErrorCodes.CONFLICT,
        409
      );
    }

    const id = await subCategoryRepository.create(input, createdBy);
    return this.getSubCategoryById(id);
  }

  async updateSubCategory(
    id: number,
    input: UpdateSubCategoryInput,
    updatedBy?: number
  ): Promise<SubCategoryPublic> {
    const row = await subCategoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Sub category not found", ErrorCodes.NOT_FOUND, 404);
    }

    const categoryId = input.categoryId ?? row.category_id;
    if (input.categoryId) {
      await categoryService.assertCategoryExists(input.categoryId);
    }

    if (input.name) {
      const existing = await subCategoryRepository.findByNameInCategory(
        categoryId,
        input.name
      );
      if (existing && existing.id !== id) {
        throw new ApiError(
          "Sub category with this name already exists for the category",
          ErrorCodes.CONFLICT,
          409
        );
      }
    }

    await subCategoryRepository.updateById(id, input, updatedBy);
    return this.getSubCategoryById(id);
  }

  async deleteSubCategory(id: number, updatedBy?: number): Promise<void> {
    const row = await subCategoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Sub category not found", ErrorCodes.NOT_FOUND, 404);
    }
    await subCategoryRepository.softDelete(id, updatedBy);
  }

  async assertSubCategoryBelongsToCategory(
    subCategoryId: number,
    categoryId: number
  ): Promise<SubCategoryRow> {
    const row = await subCategoryRepository.findById(subCategoryId);
    if (!row || row.category_id !== categoryId) {
      throw new ApiError(
        "Sub category does not belong to the specified category",
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }
    return row;
  }

  async assertSubCategoryExists(subCategoryId: number): Promise<SubCategoryRow> {
    const row = await subCategoryRepository.findById(subCategoryId);
    if (!row) {
      throw new ApiError("Sub category not found", ErrorCodes.NOT_FOUND, 404);
    }
    return row;
  }
}

export const subCategoryService = new SubCategoryService();
