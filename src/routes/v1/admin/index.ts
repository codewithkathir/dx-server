import { Router } from "express";
import categoryRoutes from "../../../modules/categories/category.routes";
import subCategoryRoutes from "../../../modules/sub-categories/sub-category.routes";
import subSubCategoryRoutes from "../../../modules/sub-sub-categories/sub-sub-category.routes";
import paymentMethodRoutes from "../../../modules/payment-methods/payment-method.routes";
import dropdownAdminRoutes from "../../../modules/dropdowns/dropdown.admin.routes";
import adminExpenseRoutes from "../../../modules/expenses/admin-expense.routes";
import supplierRoutes from "../../../modules/suppliers/supplier.routes";
import payableRoutes from "../../../modules/payables/payable.routes";
import customerRoutes from "../../../modules/customers/customer.routes";
import receivableRoutes from "../../../modules/receivables/receivable.routes";
import { dashboardRoutes, searchRoutes } from "../../../modules/dashboard/dashboard.routes";
import assetRoutes from "../../../modules/assets/asset.routes";

const adminV1Router = Router();

adminV1Router.use("/dropdowns", dropdownAdminRoutes);
adminV1Router.use("/employee-expenses", adminExpenseRoutes);
adminV1Router.use("/categories", categoryRoutes);
adminV1Router.use("/sub-categories", subCategoryRoutes);
adminV1Router.use("/sub-sub-categories", subSubCategoryRoutes);
adminV1Router.use("/payment-methods", paymentMethodRoutes);
adminV1Router.use("/suppliers", supplierRoutes);
adminV1Router.use("/payables", payableRoutes);
adminV1Router.use("/customers", customerRoutes);
adminV1Router.use("/receivables", receivableRoutes);
adminV1Router.use("/assets", assetRoutes);
adminV1Router.use("/dashboard", dashboardRoutes);
adminV1Router.use("/search", searchRoutes);

export default adminV1Router;
