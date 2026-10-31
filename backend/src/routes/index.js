import { Router } from "express";
import { siteRouter } from "./siteRoutes.js";
import { ticketRouter } from "./ticketRoutes.js";

export const apiRouter = Router();

apiRouter.use("/tickets", ticketRouter);
apiRouter.use("/sites", siteRouter);
