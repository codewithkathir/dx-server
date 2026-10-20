import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { assetMaintenanceController as controller } from "./asset-maintenance.controller";
import {
  createOdometerReadingSchema,
  createServiceRecordSchema,
  createServiceTypeSchema,
  idParamSchema,
  odometerReadingListQuerySchema,
  odometerReadingParamSchema,
  serviceRecordListQuerySchema,
  serviceRecordParamSchema,
  serviceTypeListQuerySchema,
  updateServiceRecordSchema,
  updateServiceTypeSchema,
  vehicleExpenseListQuerySchema,
} from "./asset-maintenance.validation";

const read = requirePermission(Permissions.ASSET_READ);
const manage = requirePermission(Permissions.ASSET_SERVICE_MANAGE);

/** Mounted at /v1/admin/assets, ahead of the asset routes. */
export const assetMaintenanceRoutes = Router();

assetMaintenanceRoutes.use(authenticateAdmin, requireAdminRole());

assetMaintenanceRoutes.get(
  "/:id/service-records",
  read,
  validate(idParamSchema, "params"),
  validate(serviceRecordListQuerySchema, "query"),
  controller.listServiceRecords
);
assetMaintenanceRoutes.post(
  "/:id/service-records",
  manage,
  validate(idParamSchema, "params"),
  validate(createServiceRecordSchema, "body"),
  controller.createServiceRecord
);
assetMaintenanceRoutes.get(
  "/:id/service-records/:recordId",
  read,
  validate(serviceRecordParamSchema, "params"),
  controller.getServiceRecord
);
assetMaintenanceRoutes.put(
  "/:id/service-records/:recordId",
  manage,
  validate(serviceRecordParamSchema, "params"),
  validate(updateServiceRecordSchema, "body"),
  controller.updateServiceRecord
);
assetMaintenanceRoutes.delete(
  "/:id/service-records/:recordId",
  manage,
  validate(serviceRecordParamSchema, "params"),
  controller.removeServiceRecord
);

assetMaintenanceRoutes.get(
  "/:id/odometer-readings",
  read,
  validate(idParamSchema, "params"),
  validate(odometerReadingListQuerySchema, "query"),
  controller.listOdometerReadings
);
assetMaintenanceRoutes.post(
  "/:id/odometer-readings",
  manage,
  validate(idParamSchema, "params"),
  validate(createOdometerReadingSchema, "body"),
  controller.addOdometerReading
);
assetMaintenanceRoutes.delete(
  "/:id/odometer-readings/:readingId",
  manage,
  validate(odometerReadingParamSchema, "params"),
  controller.removeOdometerReading
);

assetMaintenanceRoutes.get(
  "/:id/expenses/summary",
  read,
  validate(idParamSchema, "params"),
  controller.vehicleExpenseSummary
);
assetMaintenanceRoutes.get(
  "/:id/expenses",
  read,
  validate(idParamSchema, "params"),
  validate(vehicleExpenseListQuerySchema, "query"),
  controller.listVehicleExpenses
);

/** Mounted at /v1/admin/asset-service-types. */
export const assetServiceTypeRoutes = Router();

assetServiceTypeRoutes.use(authenticateAdmin, requireAdminRole());

assetServiceTypeRoutes.get("/", read, validate(serviceTypeListQuerySchema, "query"), controller.listServiceTypes);
assetServiceTypeRoutes.post("/", manage, validate(createServiceTypeSchema, "body"), controller.createServiceType);
assetServiceTypeRoutes.get("/:id", read, validate(idParamSchema, "params"), controller.getServiceType);
assetServiceTypeRoutes.put(
  "/:id",
  manage,
  validate(idParamSchema, "params"),
  validate(updateServiceTypeSchema, "body"),
  controller.updateServiceType
);
assetServiceTypeRoutes.delete("/:id", manage, validate(idParamSchema, "params"), controller.removeServiceType);
