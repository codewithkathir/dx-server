import { Router } from "express";
import { authenticateEmployee } from "../../middlewares/employee-auth.middleware";
import { requireEmployeeRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { assetMaintenanceController } from "./asset-maintenance.controller";
import { assignmentIdParamSchema, employeeOdometerReadingSchema, idParamSchema } from "./asset-maintenance.validation";

/** Employee app, mounted at /v1/employee/assets: only for the employee's own open assignment. */
const assetMaintenanceEmployeeRoutes = Router();

assetMaintenanceEmployeeRoutes.use(authenticateEmployee, requireEmployeeRole());

assetMaintenanceEmployeeRoutes.post(
  "/:assignmentId/odometer-readings",
  validate(assignmentIdParamSchema, "params"),
  validate(employeeOdometerReadingSchema, "body"),
  assetMaintenanceController.addMyOdometerReading
);

assetMaintenanceEmployeeRoutes.get(
  "/vehicles/:id/summary",
  validate(idParamSchema, "params"),
  assetMaintenanceController.myVehicleSummary
);

export default assetMaintenanceEmployeeRoutes;
