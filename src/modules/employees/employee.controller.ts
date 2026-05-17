import type { Request, Response } from "express";
import { getEmployeeProfilePhotoPath } from "../../middlewares/upload.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";
import {
  createdResponse,
  paginationResponse,
  successResponse,
} from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { employeeService } from "./employee.service";
import type {
  BulkCreateBody,
  BulkDeleteBody,
  BulkStatusBody,
  CreateEmployeeBody,
  EmployeeExportQueryParams,
  EmployeeListQueryParams,
  UpdateEmployeeBody,
} from "./employee.validation";

class EmployeeController {
  listEmployees = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as EmployeeListQueryParams;
    const result = await employeeService.listEmployees(query);
    paginationResponse(
      res,
      result.data,
      result.meta,
      "Employees fetched successfully"
    );
  });

  getEmployeeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const employee = await employeeService.getEmployeeById(id);
    successResponse(res, employee, "Employee fetched successfully");
  });

  createEmployee = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as CreateEmployeeBody;
    const profilePhoto = getEmployeeProfilePhotoPath(req.file);
    const employee = await employeeService.createEmployee(
      { ...body, profilePhoto },
      req.user?.id
    );
    createdResponse(res, employee, "Employee created successfully");
  });

  updateEmployee = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const body = req.validated!.body as UpdateEmployeeBody;
    const uploadedPath = getEmployeeProfilePhotoPath(req.file);
    const payload =
      uploadedPath !== null ? { ...body, profilePhoto: uploadedPath } : body;
    const employee = await employeeService.updateEmployee(
      id,
      payload,
      req.user?.id
    );
    successResponse(res, employee, "Employee updated successfully");
  });

  streamProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const file = await employeeService.getProfilePhotoFile(id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.filename)}"`
    );
    res.sendFile(file.absolutePath);
  });

  deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await employeeService.deleteEmployee(id, req.user?.id);
    successResponse(res, null, "Employee deleted successfully");
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as BulkDeleteBody;
    const affected = await employeeService.bulkDeleteEmployees(
      body.ids,
      req.user?.id
    );
    successResponse(
      res,
      { affected },
      "Employees deleted successfully"
    );
  });

  bulkUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as BulkStatusBody;
    const affected = await employeeService.bulkUpdateStatus(
      body.ids,
      body.status,
      req.user?.id
    );
    successResponse(
      res,
      { affected },
      "Employee statuses updated successfully"
    );
  });

  bulkCreate = asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated!.body as BulkCreateBody;
    const result = await employeeService.bulkCreateEmployees(
      body.employees,
      req.user?.id
    );
    createdResponse(res, result, "Bulk employee creation completed");
  });

  exportEmployees = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated!.query as EmployeeExportQueryParams;
    const { format, ...filters } = query;
    const result = await employeeService.exportEmployees(filters, format);

    if (result.format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="employees.csv"'
      );
      res.status(200).send(result.content);
      return;
    }

    successResponse(res, result.content, "Employees exported successfully");
  });
}

export const employeeController = new EmployeeController();
