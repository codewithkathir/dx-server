import { ApiError } from "../../shared/errors/api.error";
import { assetMaintenanceService } from "../asset-maintenance/asset-maintenance.service";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { categoryRepository } from "../categories/category.repository";
import { categoryService } from "../categories/category.service";
import { subCategoryRepository } from "../sub-categories/sub-category.repository";
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
      serviceTypeId: row.service_type_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listSubSubCategories(query: SubSubCategoryListQuery) {
    const { data, total } =
      await subSubCategoryRepository.findAllPaginated(query);
    const [categoryNames, subCategoryNames] = await Promise.all([
      categoryRepository.findNames(data.map((row) => row.category_id)),
      subCategoryRepository.findNames(data.map((row) => row.sub_category_id)),
    ]);
    return {
      data: data.map((row) => ({
        ...this.toPublic(row),
        categoryName: categoryNames.get(row.category_id) ?? null,
        subCategoryName: subCategoryNames.get(row.sub_category_id) ?? null,
      })),
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
    if (input.serviceTypeId) await assetMaintenanceService.assertServiceTypeExists(input.serviceTypeId);
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
    if (input.serviceTypeId) await assetMaintenanceService.assertServiceTypeExists(input.serviceTypeId);
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
