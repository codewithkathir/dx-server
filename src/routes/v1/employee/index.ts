import { Router } from "express";
import dropdownEmployeeRoutes from "../../../modules/dropdowns/dropdown.employee.routes";
import expenseRoutes from "../../../modules/expenses/expense.routes";
import assetEmployeeRoutes from "../../../modules/assets/asset.employee.routes";

const employeeV1Router = Router();

employeeV1Router.use("/dropdowns", dropdownEmployeeRoutes);
employeeV1Router.use("/expenses", expenseRoutes);
employeeV1Router.use("/assets", assetEmployeeRoutes);

export default employeeV1Router;
