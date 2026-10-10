import { Router } from "express";
import { authenticateEmployee } from "../../middlewares/employee-auth.middleware";
import { requireEmployeeRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { assetController } from "./asset.controller";
import { assignmentIdParamSchema } from "./asset.validation";

/** Employee app: an employee only ever sees their own assignments. */
const assetEmployeeRoutes = Router();

assetEmployeeRoutes.use(authenticateEmployee, requireEmployeeRole());

assetEmployeeRoutes.get("/", assetController.listMine);
assetEmployeeRoutes.post(
  "/:assignmentId/acknowledge",
  validate(assignmentIdParamSchema, "params"),
  assetController.acknowledge
);

export default assetEmployeeRoutes;
