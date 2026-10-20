import { Router } from "express";
import dropdownEmployeeRoutes from "../../../modules/dropdowns/dropdown.employee.routes";
import expenseRoutes from "../../../modules/expenses/expense.routes";
import assetEmployeeRoutes from "../../../modules/assets/asset.employee.routes";
import employeeAccountEmployeeRoutes from "../../../modules/employee-accounts/employee-account.employee.routes";
import assetMaintenanceEmployeeRoutes from "../../../modules/asset-maintenance/asset-maintenance.employee.routes";

const employeeV1Router = Router();

employeeV1Router.use("/dropdowns", dropdownEmployeeRoutes);
employeeV1Router.use("/expenses", expenseRoutes);
employeeV1Router.use("/assets", assetEmployeeRoutes);
employeeV1Router.use("/assets", assetMaintenanceEmployeeRoutes);
employeeV1Router.use("/account", employeeAccountEmployeeRoutes);

export default employeeV1Router;
