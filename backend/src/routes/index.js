import { Router } from "express";
import { authRouter } from "./authRoutes.js";
import { integrationRouter } from "./integrationRoutes.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { runRouter } from "./runRoutes.js";
import { siteRouter } from "./siteRoutes.js";
import { ticketRouter } from "./ticketRoutes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use(requireAuth);
apiRouter.use("/integrations", integrationRouter);
apiRouter.use("/tickets", ticketRouter);
apiRouter.use("/runs", runRouter);
apiRouter.use("/sites", siteRouter);

export { apiRouter };
