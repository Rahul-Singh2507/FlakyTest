import { z } from "zod";
import { ticketIdSchema, ticketLookupSchema, ticketSearchSchema } from "../validators/ticketSchemas.js";
import { getTicket, listMockTickets } from "../services/tickets/ticketService.js";
import { searchJiraTickets } from "../services/integrations/jiraClient.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

async function listTickets(req, res) {
  ApiResponse.success(res, await listMockTickets());
}

async function showTicket(req, res) {
  const parsed = ticketIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }
  ApiResponse.success(res, await getTicket(parsed.data));
}

async function lookupTicket(req, res) {
  const parsed = ticketLookupSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }
  ApiResponse.success(
    res,
    await getTicket(parsed.data.ticketId, parsed.data.jiraCredentials)
  );
}

async function searchTickets(req, res) {
  const parsed = ticketSearchSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }
  ApiResponse.success(
    res,
    await searchJiraTickets(parsed.data.jiraCredentials, parsed.data.nextPageToken)
  );
}

export { listTickets, lookupTicket, searchTickets, showTicket };
