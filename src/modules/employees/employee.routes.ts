import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { sanitizeEmployeeBody } from "../../middlewares/sanitize-employee-body.middleware";
import { optionalEmployeeProfilePhotoUpload } from "../../middlewares/upload.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { employeeController } from "./employee.controller";
import {
  bulkCreateSchema,
  bulkDeleteSchema,
  bulkStatusSchema,
  createEmployeeSchema,
  employeeExportQuerySchema,
  employeeListQuerySchema,
  idParamSchema,
  updateEmployeeSchema,
} from "./employee.validation";

const employeeRoutes = Router();

employeeRoutes.use(authenticateAdmin, requireAdminRole());

employeeRoutes.get(
  "/export",
  requirePermission(Permissions.EMPLOYEE_EXPORT),
  validate(employeeExportQuerySchema, "query"),
  employeeController.exportEmployees
);

employeeRoutes.post(
  "/bulk-delete",
  requirePermission(Permissions.EMPLOYEE_DELETE),
  validate(bulkDeleteSchema, "body"),
  employeeController.bulkDelete
);

employeeRoutes.post(
  "/bulk-status",
  requirePermission(Permissions.EMPLOYEE_UPDATE),
  validate(bulkStatusSchema, "body"),
  employeeController.bulkUpdateStatus
);

employeeRoutes.post(
  "/bulk-create",
  requirePermission(Permissions.EMPLOYEE_CREATE),
  validate(bulkCreateSchema, "body"),
  employeeController.bulkCreate
);

employeeRoutes.get(
  "/",
  requirePermission(Permissions.EMPLOYEE_READ),
  validate(employeeListQuerySchema, "query"),
  employeeController.listEmployees
);

employeeRoutes.post(
  "/",
  requirePermission(Permissions.EMPLOYEE_CREATE),
  optionalEmployeeProfilePhotoUpload,
  sanitizeEmployeeBody,
  validate(createEmployeeSchema, "body"),
  employeeController.createEmployee
);

employeeRoutes.get(
  "/:id/profile-photo",
  requirePermission(Permissions.EMPLOYEE_READ),
  validate(idParamSchema, "params"),
  employeeController.streamProfilePhoto
);

employeeRoutes.get(
  "/:id",
  requirePermission(Permissions.EMPLOYEE_READ),
  validate(idParamSchema, "params"),
  employeeController.getEmployeeById
);

employeeRoutes.put(
  "/:id",
  requirePermission(Permissions.EMPLOYEE_UPDATE),
  validate(idParamSchema, "params"),
  optionalEmployeeProfilePhotoUpload,
  sanitizeEmployeeBody,
  validate(updateEmployeeSchema, "body"),
  employeeController.updateEmployee
);

employeeRoutes.delete(
  "/:id",
  requirePermission(Permissions.EMPLOYEE_DELETE),
  validate(idParamSchema, "params"),
  employeeController.deleteEmployee
);

export default employeeRoutes;
