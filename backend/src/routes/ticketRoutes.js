import { Router } from "express";
import { listTickets, showTicket } from "../controllers/ticketController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const ticketRouter = Router();

ticketRouter.get("/", asyncHandler(listTickets));
ticketRouter.get("/:id", asyncHandler(showTicket));

export { ticketRouter };
