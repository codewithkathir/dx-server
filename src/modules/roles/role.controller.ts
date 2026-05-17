import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { successResponse } from "../../shared/responses/response.handler";
import { roleService } from "./role.service";

class RoleController {
  listRoles = asyncHandler(async (_req: Request, res: Response) => {
    const roles = await roleService.listRoles();
    successResponse(res, roles, "Roles fetched successfully");
  });
}

export const roleController = new RoleController();
