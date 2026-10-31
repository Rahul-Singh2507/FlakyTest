import { Router } from "express";
import { runRouter } from "./runRoutes.js";
import { siteRouter } from "./siteRoutes.js";
import { ticketRouter } from "./ticketRoutes.js";

export const apiRouter = Router();

apiRouter.use("/tickets", ticketRouter);
apiRouter.use("/runs", runRouter);
apiRouter.use("/sites", siteRouter);
