import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { PaginationQuery } from "../../shared/validators/common.validation";
import type { IdParam } from "../../shared/validators/common.validation";
import { userService } from "./user.service";
import type {
  CreateUserBody,
  UpdateUserBody,
} from "./user.validation";

class UserController {
  listUsers = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as PaginationQuery;
    const result = await userService.listUsers(query);
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Users fetched successfully"
    );
  });

  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const user = await userService.getUserById(id);
    successResponse(res, user, "User fetched successfully");
  });

  createUser = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateUserBody;
    const user = await userService.createUser(body, req.user?.id);
    createdResponse(res, user, "User created successfully");
  });

  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateUserBody;
    const user = await userService.updateUser(id, body, req.user?.id);
    successResponse(res, user, "User updated successfully");
  });

  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await userService.deleteUser(id, req.user?.id);
    successResponse(res, null, "User deleted successfully");
  });
}

export const userController = new UserController();
