import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { createdResponse, paginationResponse, successResponse } from "../../shared/responses/response.handler";
import type { IdParam } from "../../shared/validators/common.validation";
import { assetMaintenanceService } from "./asset-maintenance.service";
import type {
  AssignmentIdParam,
  CreateOdometerReadingBody,
  CreateServiceRecordBody,
  CreateServiceTypeBody,
  EmployeeOdometerReadingBody,
  OdometerReadingListQueryParams,
  OdometerReadingParam,
  ServiceRecordListQueryParams,
  ServiceRecordParam,
  ServiceTypeListQueryParams,
  UpdateServiceRecordBody,
  UpdateServiceTypeBody,
  VehicleExpenseListQueryParams,
} from "./asset-maintenance.validation";

class AssetMaintenanceController {
  // ── Service records ────────────────────────────────────────────────────────

  listServiceRecords = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const result = await assetMaintenanceService.listServiceRecords(id, req.validated!.query as ServiceRecordListQueryParams);
    paginationResponse(res, result.data, result.meta, "Service records fetched successfully");
  });

  getServiceRecord = asyncHandler(async (req: Request, res: Response) => {
    const { id, recordId } = req.validated!.params as ServiceRecordParam;
    successResponse(res, await assetMaintenanceService.getServiceRecord(id, recordId), "Service record fetched successfully");
  });

  createServiceRecord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const record = await assetMaintenanceService.createServiceRecord(id, req.validated!.body as CreateServiceRecordBody, req.user?.id);
    createdResponse(res, record, "Service record added successfully");
  });

  updateServiceRecord = asyncHandler(async (req: Request, res: Response) => {
    const { id, recordId } = req.validated!.params as ServiceRecordParam;
    const record = await assetMaintenanceService.updateServiceRecord(
      id,
      recordId,
      req.validated!.body as UpdateServiceRecordBody,
      req.user?.id
    );
    successResponse(res, record, "Service record updated successfully");
  });

  removeServiceRecord = asyncHandler(async (req: Request, res: Response) => {
    const { id, recordId } = req.validated!.params as ServiceRecordParam;
    await assetMaintenanceService.removeServiceRecord(id, recordId, req.user?.id);
    successResponse(res, null, "Service record deleted successfully");
  });

  // ── Odometer readings ──────────────────────────────────────────────────────

  listOdometerReadings = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const result = await assetMaintenanceService.listOdometerReadings(id, req.validated!.query as OdometerReadingListQueryParams);
    paginationResponse(res, result.data, result.meta, "Odometer readings fetched successfully");
  });

  addOdometerReading = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const latest = await assetMaintenanceService.addOdometerReading(id, req.validated!.body as CreateOdometerReadingBody, req.user?.id);
    createdResponse(res, latest, "Odometer reading added successfully");
  });

  removeOdometerReading = asyncHandler(async (req: Request, res: Response) => {
    const { id, readingId } = req.validated!.params as OdometerReadingParam;
    const latest = await assetMaintenanceService.removeOdometerReading(id, readingId, req.user?.id);
    successResponse(res, latest, "Odometer reading deleted successfully");
  });

  /** Employee app: report the odometer of the vehicle the signed-in employee holds. */
  addMyOdometerReading = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId } = req.validated!.params as AssignmentIdParam;
    const latest = await assetMaintenanceService.addEmployeeOdometerReading(
      assignmentId,
      req.user!.id,
      req.validated!.body as EmployeeOdometerReadingBody
    );
    createdResponse(res, latest, "Odometer reading saved");
  });

  // ── Vehicle expenses ───────────────────────────────────────────────────────

  listVehicleExpenses = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const result = await assetMaintenanceService.listVehicleExpenses(id, req.validated!.query as VehicleExpenseListQueryParams);
    paginationResponse(res, result.data, result.meta, "Vehicle expenses fetched successfully");
  });

  vehicleExpenseSummary = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await assetMaintenanceService.vehicleExpenseSummary(id), "Vehicle expense summary fetched successfully");
  });

  /** Employee app: spend and due items for a vehicle the employee has. */
  myVehicleSummary = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await assetMaintenanceService.employeeVehicleSummary(req.user!.id, id), "Vehicle summary fetched successfully");
  });

  // ── Service types ──────────────────────────────────────────────────────────

  listServiceTypes = asyncHandler(async (req: Request, res: Response) => {
    const result = await assetMaintenanceService.listServiceTypes(req.validated!.query as ServiceTypeListQueryParams);
    paginationResponse(res, result.data, result.meta, "Service types fetched successfully");
  });

  getServiceType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    successResponse(res, await assetMaintenanceService.getServiceType(id), "Service type fetched successfully");
  });

  createServiceType = asyncHandler(async (req: Request, res: Response) => {
    const type = await assetMaintenanceService.createServiceType(req.validated!.body as CreateServiceTypeBody, req.user?.id);
    createdResponse(res, type, "Service type created successfully");
  });

  updateServiceType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    const type = await assetMaintenanceService.updateServiceType(id, req.validated!.body as UpdateServiceTypeBody, req.user?.id);
    successResponse(res, type, "Service type updated successfully");
  });

  removeServiceType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validated!.params as IdParam;
    await assetMaintenanceService.removeServiceType(id, req.user?.id);
    successResponse(res, null, "Service type deleted successfully");
  });
}

export const assetMaintenanceController = new AssetMaintenanceController();
