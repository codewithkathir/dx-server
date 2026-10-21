import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { createdResponse, paginationResponse, successResponse } from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { productService } from "./product.service";
import type { CreateProductBody, ProductListQueryParams, UpdateProductBody } from "./product.validation";

class ProductController {
  listProducts = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as ProductListQueryParams;
    const result = await productService.listProducts(query);
    paginationResponse(res, result.data, result.meta, "Products fetched successfully");
  });

  getProductById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await productService.getProductById(id), "Product fetched successfully");
  });

  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateProductBody;
    createdResponse(res, await productService.createProduct(body, req.user?.id), "Product created successfully");
  });

  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateProductBody;
    successResponse(res, await productService.updateProduct(id, body, req.user?.id), "Product updated successfully");
  });
}

export const productController = new ProductController();
