import { readdir, readFile } from "fs/promises";
import path from "path";
import { paths } from "../../config/env.js";
import { ApiError } from "../../utils/apiError.js";
import { ticketSchema } from "../../validators/ticketSchemas.js";
import { fetchJiraTicket, isJiraConfigured } from "../integrations/jiraClient.js";

const readTicketFile = async (filePath) => ticketSchema.parse(JSON.parse(await readFile(filePath, "utf8")));

export async function listMockTickets() {
  const extraFiles = (await readdir(paths.mockTickets)).filter((fileName) => fileName.endsWith(".json"));
  const tickets = await Promise.all([
    readTicketFile(paths.mockTicket),
    ...extraFiles.map((fileName) => readTicketFile(path.join(paths.mockTickets, fileName))),
  ]);
  return tickets.map((ticket) => ({ ...ticket, source: "mock" }));
}

async function loadMockTicket(ticketId) {
  const tickets = await listMockTickets();
  const ticket = tickets.find((candidate) => candidate.id.toUpperCase() === ticketId);
  if (!ticket) {
    throw ApiError.notFound(`Ticket ${ticketId} not found in Jira or mock tickets (${tickets.map((known) => known.id).join(", ")})`);
  }
  return ticket;
}

const fetchJiraOrMock = (ticketId) =>
  fetchJiraTicket(ticketId)
    .then((ticket) => ({ ...ticket, source: "jira" }))
    .catch((error) => (error.status === 404 ? loadMockTicket(ticketId) : Promise.reject(error)));

export async function getTicket(ticketId) {
  return isJiraConfigured() ? fetchJiraOrMock(ticketId) : loadMockTicket(ticketId);
}
