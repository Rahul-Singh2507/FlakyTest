import { z } from "zod";
import { ticketIdSchema } from "../validators/ticketSchemas.js";
import { getTicket, listMockTickets } from "../services/tickets/ticketService.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

export async function listTickets(req, res) {
  ApiResponse.success(res, await listMockTickets());
}

export async function showTicket(req, res) {
  const parsed = ticketIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }
  ApiResponse.success(res, await getTicket(parsed.data));
}
