import type { Request, Response } from "express";
import { getAssetImagePath } from "../../middlewares/upload.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import { createdResponse, paginationResponse, successResponse } from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { assetService } from "./asset.service";
import type { AssetImageFile } from "./asset.types";
import type {
  AssetImageParam,
  AssetListQueryParams,
  AssignmentImageParam,
  AssignAssetBody,
  AssignmentIdParam,
  CreateAssetBody,
  ReturnAssetBody,
  UpdateAssetBody,
} from "./asset.validation";

function sendImage(res: Response, file: AssetImageFile): void {
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(file.absolutePath);
}

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

  addImage = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const file = req.file!;
    const asset = await assetService.addImage(
      id,
      { filePath: getAssetImagePath(file), originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size },
      req.user?.id
    );
    createdResponse(res, asset, "Photo added successfully");
  });

  removeImage = asyncHandler(async (req: Request, res: Response) => {
    const { id, imageId } = req.validated!.params as AssetImageParam;
    successResponse(res, await assetService.removeImage(id, imageId, req.user?.id), "Photo deleted successfully");
  });

  streamImage = asyncHandler(async (req: Request, res: Response) => {
    const { id, imageId } = req.validated!.params as AssetImageParam;
    sendImage(res, await assetService.getImageFile(id, imageId));
  });

  streamMyImage = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId, imageId } = req.validated!.params as AssignmentImageParam;
    sendImage(res, await assetService.getImageFileForEmployee(assignmentId, imageId, req.user!.id));
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
