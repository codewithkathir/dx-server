import { Router } from "express";
import adminRouter from "./admin";
import v1Router from "./v1";

const apiRouter = Router();

apiRouter.use("/admin", adminRouter);
apiRouter.use("/v1", v1Router);

apiRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});

export default apiRouter;
