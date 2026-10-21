import { ApiError } from "../../shared/errors/api.error";
import { ErrorCodes } from "../../shared/errors/error-codes";
import { fromFils, toFils } from "../../shared/utils/money.util";
import { buildPaginationMeta } from "../../shared/utils/pagination.util";
import { productRepository } from "./product.repository";
import type {
  CreateProductInput,
  ProductListQuery,
  ProductOption,
  ProductPublic,
  ProductRow,
  UpdateProductInput,
} from "./product.types";

const conflict = (message: string) => new ApiError(message, ErrorCodes.CONFLICT, 409);

class ProductService {
  private toPublic(row: ProductRow): ProductPublic {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      unit: row.unit,
      unitPrice: fromFils(toFils(row.unit_price)),
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listProducts(query: ProductListQuery) {
    const { data, total } = await productRepository.findAllPaginated(query);
    return {
      data: data.map((row) => this.toPublic(row)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async listActiveOptions(): Promise<ProductOption[]> {
    const rows = await productRepository.findActive();
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      unit: r.unit,
      unitPrice: fromFils(toFils(r.unit_price)),
    }));
  }

  async getProductById(id: number): Promise<ProductPublic> {
    const row = await productRepository.findById(id);
    if (!row) throw new ApiError("Product not found", ErrorCodes.NOT_FOUND, 404);
    return this.toPublic(row);
  }

  private async assertUnique(input: { name?: string; code?: string | null }, id?: number): Promise<void> {
    if (input.name) {
      const existing = await productRepository.findByName(input.name);
      if (existing && existing.id !== id) throw conflict("A product with this name already exists");
    }
    if (input.code) {
      const existing = await productRepository.findByCode(input.code);
      if (existing && existing.id !== id) throw conflict("A product with this code already exists");
    }
  }

  async createProduct(input: CreateProductInput, createdBy?: number): Promise<ProductPublic> {
    await this.assertUnique(input);
    const id = await productRepository.create(input, createdBy);
    return this.getProductById(id);
  }

  /** Price changes apply to new invoice lines only; existing lines keep the price they were sold at. */
  async updateProduct(id: number, input: UpdateProductInput, updatedBy?: number): Promise<ProductPublic> {
    await this.getProductById(id);
    await this.assertUnique(input, id);
    await productRepository.updateById(id, input, updatedBy);
    return this.getProductById(id);
  }
}

export const productService = new ProductService();
