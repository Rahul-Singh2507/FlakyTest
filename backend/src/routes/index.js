import { Router } from "express";
import { ticketRouter } from "./ticketRoutes.js";

export const apiRouter = Router();

apiRouter.use("/tickets", ticketRouter);
