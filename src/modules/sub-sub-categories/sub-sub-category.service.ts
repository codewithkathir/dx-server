import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { categoryService } from "../categories/category.service";
import { subCategoryService } from "../sub-categories/sub-category.service";
import { subSubCategoryRepository } from "./sub-sub-category.repository";
import type {
  CreateSubSubCategoryInput,
  SubSubCategoryListQuery,
  SubSubCategoryPublic,
  SubSubCategoryRow,
  UpdateSubSubCategoryInput,
} from "./sub-sub-category.types";

class SubSubCategoryService {
  private toPublic(row: SubSubCategoryRow): SubSubCategoryPublic {
    return {
      id: row.id,
      categoryId: row.category_id,
      subCategoryId: row.sub_category_id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listSubSubCategories(query: SubSubCategoryListQuery) {
    const { data, total } =
      await subSubCategoryRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublic(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getSubSubCategoryById(id: number): Promise<SubSubCategoryPublic> {
    const row = await subSubCategoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Sub sub category not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublic(row);
  }

  private async validateHierarchy(
    categoryId: number,
    subCategoryId: number
  ): Promise<void> {
    await categoryService.assertCategoryExists(categoryId);
    await subCategoryService.assertSubCategoryBelongsToCategory(
      subCategoryId,
      categoryId
    );
  }

  async createSubSubCategory(
    input: CreateSubSubCategoryInput,
    createdBy?: number
  ): Promise<SubSubCategoryPublic> {
    await this.validateHierarchy(input.categoryId, input.subCategoryId);

    const existing = await subSubCategoryRepository.findByNameInHierarchy(
      input.categoryId,
      input.subCategoryId,
      input.name
    );
    if (existing) {
      throw new ApiError(
        "Sub sub category with this name already exists",
        ErrorCodes.CONFLICT,
        409
      );
    }

    const id = await subSubCategoryRepository.create(input, createdBy);
    return this.getSubSubCategoryById(id);
  }

  async updateSubSubCategory(
    id: number,
    input: UpdateSubSubCategoryInput,
    updatedBy?: number
  ): Promise<SubSubCategoryPublic> {
    const row = await subSubCategoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Sub sub category not found", ErrorCodes.NOT_FOUND, 404);
    }

    const categoryId = input.categoryId ?? row.category_id;
    const subCategoryId = input.subCategoryId ?? row.sub_category_id;
    await this.validateHierarchy(categoryId, subCategoryId);

    if (input.name) {
      const existing = await subSubCategoryRepository.findByNameInHierarchy(
        categoryId,
        subCategoryId,
        input.name
      );
      if (existing && existing.id !== id) {
        throw new ApiError(
          "Sub sub category with this name already exists",
          ErrorCodes.CONFLICT,
          409
        );
      }
    }

    await subSubCategoryRepository.updateById(id, input, updatedBy);
    return this.getSubSubCategoryById(id);
  }

  async deleteSubSubCategory(id: number, updatedBy?: number): Promise<void> {
    const row = await subSubCategoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Sub sub category not found", ErrorCodes.NOT_FOUND, 404);
    }
    await subSubCategoryRepository.softDelete(id, updatedBy);
  }
}

export const subSubCategoryService = new SubSubCategoryService();
