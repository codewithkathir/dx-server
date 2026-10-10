import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { createdResponse, paginationResponse, successResponse } from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { assetService } from "./asset.service";
import type {
  AssetListQueryParams,
  AssignAssetBody,
  AssignmentIdParam,
  CreateAssetBody,
  ReturnAssetBody,
  UpdateAssetBody,
} from "./asset.validation";

class AssetController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await assetService.list(req.validated!.query as AssetListQueryParams);
    paginationResponse(res, result.data, result.meta, "Assets fetched successfully");
  });

  summary = asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, await assetService.summary(), "Asset summary fetched successfully");
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await assetService.getById(id), "Asset fetched successfully");
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const asset = await assetService.create(req.validated!.body as CreateAssetBody, req.user?.id);
    createdResponse(res, asset, "Asset created successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const asset = await assetService.update(id, req.validated!.body as UpdateAssetBody, req.user?.id);
    successResponse(res, asset, "Asset updated successfully");
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await assetService.remove(id, req.user?.id);
    successResponse(res, null, "Asset deleted successfully");
  });

  assign = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const asset = await assetService.assign(id, req.validated!.body as AssignAssetBody, req.user?.id);
    successResponse(res, asset, "Asset assigned successfully");
  });

  returnAsset = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const asset = await assetService.returnAsset(id, req.validated!.body as ReturnAssetBody, req.user?.id);
    successResponse(res, asset, "Asset return recorded successfully");
  });

  /** Employee app: the signed-in employee's current and past assets. */
  listMine = asyncHandler(async (req: Request, res: Response) => {
    successResponse(res, await assetService.listForEmployee(req.user!.id), "Assets fetched successfully");
  });

  acknowledge = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId } = req.validated!.params as AssignmentIdParam;
    const item = await assetService.acknowledge(assignmentId, req.user!.id);
    successResponse(res, item, "Asset receipt confirmed");
  });
}

export const assetController = new AssetController();
