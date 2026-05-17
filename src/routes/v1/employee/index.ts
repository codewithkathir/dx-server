import { Router } from "express";
import dropdownEmployeeRoutes from "../../../modules/dropdowns/dropdown.employee.routes";
import expenseRoutes from "../../../modules/expenses/expense.routes";

const employeeV1Router = Router();

employeeV1Router.use("/dropdowns", dropdownEmployeeRoutes);
employeeV1Router.use("/expenses", expenseRoutes);

export default employeeV1Router;
