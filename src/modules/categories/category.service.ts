import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { categoryRepository } from "./category.repository";
import type {
  CategoryListQuery,
  CategoryPublic,
  CategoryRow,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.types";

class CategoryService {
  private toPublic(row: CategoryRow): CategoryPublic {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listCategories(query: CategoryListQuery) {
    const { data, total } = await categoryRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublic(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getCategoryById(id: number): Promise<CategoryPublic> {
    const row = await categoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Category not found", ErrorCodes.NOT_FOUND, 404);
    }
    return this.toPublic(row);
  }

  async createCategory(
    input: CreateCategoryInput,
    createdBy?: number
  ): Promise<CategoryPublic> {
    const existing = await categoryRepository.findByName(input.name);
    if (existing) {
      throw new ApiError(
        "Category with this name already exists",
        ErrorCodes.CONFLICT,
        409
      );
    }
    const id = await categoryRepository.create(input, createdBy);
    return this.getCategoryById(id);
  }

  async updateCategory(
    id: number,
    input: UpdateCategoryInput,
    updatedBy?: number
  ): Promise<CategoryPublic> {
    const row = await categoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Category not found", ErrorCodes.NOT_FOUND, 404);
    }

    if (input.name && input.name.toLowerCase() !== row.name.toLowerCase()) {
      const existing = await categoryRepository.findByName(input.name);
      if (existing && existing.id !== id) {
        throw new ApiError(
          "Category with this name already exists",
          ErrorCodes.CONFLICT,
          409
        );
      }
    }

    await categoryRepository.updateById(id, input, updatedBy);
    return this.getCategoryById(id);
  }

  async deleteCategory(id: number, updatedBy?: number): Promise<void> {
    const row = await categoryRepository.findById(id);
    if (!row) {
      throw new ApiError("Category not found", ErrorCodes.NOT_FOUND, 404);
    }
    await categoryRepository.softDelete(id, updatedBy);
  }

  async assertCategoryExists(categoryId: number): Promise<CategoryRow> {
    const row = await categoryRepository.findById(categoryId);
    if (!row) {
      throw new ApiError("Category not found", ErrorCodes.NOT_FOUND, 404);
    }
    return row;
  }
}

export const categoryService = new CategoryService();
