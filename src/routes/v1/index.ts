import { Router } from "express";
import authRoutes from "../../modules/auth/auth.routes";
import userRoutes from "../../modules/users/user.routes";
import roleRoutes from "../../modules/roles/role.routes";
import adminV1Router from "./admin";
import employeeV1Router from "./employee";

const v1Router = Router();

v1Router.use("/auth", authRoutes);
v1Router.use("/admin", adminV1Router);
v1Router.use("/employee", employeeV1Router);
v1Router.use("/users", userRoutes);
v1Router.use("/roles", roleRoutes);

export default v1Router;
