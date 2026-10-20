import { Router } from "express";
import { authenticateAdmin } from "../../middlewares/admin-auth.middleware";
import { requireAdminRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { Permissions } from "../../shared/constants/permissions";
import { employeeAccountController as controller } from "./employee-account.controller";
import {
  accountListQuerySchema,
  adjustmentSchema,
  cashEntrySchema,
  employeeIdParamSchema,
  entryIdParamSchema,
  entryListQuerySchema,
  voidEntrySchema,
} from "./employee-account.validation";

const read = requirePermission(Permissions.EMPLOYEE_ACCOUNT_READ);
const manage = requirePermission(Permissions.EMPLOYEE_ACCOUNT_MANAGE);

/** Mounted at /v1/admin/employee-accounts. */
const employeeAccountRoutes = Router();

employeeAccountRoutes.use(authenticateAdmin, requireAdminRole());

employeeAccountRoutes.get("/", read, validate(accountListQuerySchema, "query"), controller.list);
employeeAccountRoutes.get("/summary", read, controller.summary);
employeeAccountRoutes.post(
  "/entries/:entryId/void",
  manage,
  validate(entryIdParamSchema, "params"),
  validate(voidEntrySchema, "body"),
  controller.voidEntry
);
employeeAccountRoutes.get("/:employeeId", read, validate(employeeIdParamSchema, "params"), controller.getAccount);
employeeAccountRoutes.get(
  "/:employeeId/entries",
  read,
  validate(employeeIdParamSchema, "params"),
  validate(entryListQuerySchema, "query"),
  controller.listEntries
);
employeeAccountRoutes.post(
  "/:employeeId/advances",
  manage,
  validate(employeeIdParamSchema, "params"),
  validate(cashEntrySchema, "body"),
  controller.addAdvance
);
employeeAccountRoutes.post(
  "/:employeeId/returns",
  manage,
  validate(employeeIdParamSchema, "params"),
  validate(cashEntrySchema, "body"),
  controller.addReturn
);
employeeAccountRoutes.post(
  "/:employeeId/adjustments",
  manage,
  validate(employeeIdParamSchema, "params"),
  validate(adjustmentSchema, "body"),
  controller.addAdjustment
);

export default employeeAccountRoutes;
