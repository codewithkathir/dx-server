import { Router } from "express";
import { authenticateEmployee } from "../../middlewares/employee-auth.middleware";
import { requireEmployeeRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { employeeAccountController } from "./employee-account.controller";
import { entryListQuerySchema } from "./employee-account.validation";

/** Employee app, mounted at /v1/employee/account: the signed-in employee's own balance. */
const employeeAccountEmployeeRoutes = Router();

employeeAccountEmployeeRoutes.use(authenticateEmployee, requireEmployeeRole());

employeeAccountEmployeeRoutes.get("/", employeeAccountController.myAccount);
employeeAccountEmployeeRoutes.get("/entries", validate(entryListQuerySchema, "query"), employeeAccountController.myEntries);

export default employeeAccountEmployeeRoutes;
