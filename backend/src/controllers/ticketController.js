import { parseOrThrow } from "../validators/parseOrThrow.js";
import { ticketIdSchema } from "../validators/ticketSchemas.js";
import { getTicket, listMockTickets } from "../services/tickets/ticketService.js";
import { ApiResponse } from "../utils/apiResponse.js";

export async function listTickets(req, res) {
  ApiResponse.success(res, await listMockTickets());
}

export async function showTicket(req, res) {
  ApiResponse.success(res, await getTicket(parseOrThrow(ticketIdSchema, req.params.id)));
}
