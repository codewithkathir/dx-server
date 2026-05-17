import { Router } from "express";
import employeeRoutes from "../../modules/employees/employee.routes";

const adminRouter = Router();

adminRouter.use("/employees", employeeRoutes);

export default adminRouter;
