import { Router } from "express";
import { authenticateEmployee } from "../../middlewares/employee-auth.middleware";
import { requireEmployeeRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { dropdownController } from "./dropdown.controller";
import {
  subCategoryDropdownQuerySchema,
  subSubCategoryDropdownQuerySchema,
} from "./dropdown.validation";

const dropdownEmployeeRoutes = Router();

dropdownEmployeeRoutes.use(authenticateEmployee, requireEmployeeRole());

dropdownEmployeeRoutes.get("/categories", dropdownController.listCategories);

dropdownEmployeeRoutes.get(
  "/sub-categories",
  validate(subCategoryDropdownQuerySchema, "query"),
  dropdownController.listSubCategories
);

dropdownEmployeeRoutes.get(
  "/sub-sub-categories",
  validate(subSubCategoryDropdownQuerySchema, "query"),
  dropdownController.listSubSubCategories
);

dropdownEmployeeRoutes.get(
  "/payment-methods",
  dropdownController.listPaymentMethods
);

dropdownEmployeeRoutes.get("/whom", dropdownController.listWhom);

export default dropdownEmployeeRoutes;
