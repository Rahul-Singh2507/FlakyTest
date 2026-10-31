import { Router } from "express";
import { listTickets, lookupTicket, searchTickets, showTicket } from "../controllers/ticketController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const ticketRouter = Router();

ticketRouter.get("/", asyncHandler(listTickets));
ticketRouter.post("/lookup", asyncHandler(lookupTicket));
ticketRouter.post("/search", asyncHandler(searchTickets));
ticketRouter.get("/:id", asyncHandler(showTicket));

export { ticketRouter };
