import { Router } from "express";
import categoryRoutes from "../../../modules/categories/category.routes";
import subCategoryRoutes from "../../../modules/sub-categories/sub-category.routes";
import subSubCategoryRoutes from "../../../modules/sub-sub-categories/sub-sub-category.routes";
import paymentMethodRoutes from "../../../modules/payment-methods/payment-method.routes";
import dropdownAdminRoutes from "../../../modules/dropdowns/dropdown.admin.routes";
import adminExpenseRoutes from "../../../modules/expenses/admin-expense.routes";

const adminV1Router = Router();

adminV1Router.use("/dropdowns", dropdownAdminRoutes);
adminV1Router.use("/employee-expenses", adminExpenseRoutes);
adminV1Router.use("/categories", categoryRoutes);
adminV1Router.use("/sub-categories", subCategoryRoutes);
adminV1Router.use("/sub-sub-categories", subSubCategoryRoutes);
adminV1Router.use("/payment-methods", paymentMethodRoutes);

export default adminV1Router;
