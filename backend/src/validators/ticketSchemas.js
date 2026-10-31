import { z } from "zod";
import { jiraCredentialsSchema } from "./authSchemas.js";

const ticketSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  acceptanceCriteria: z.array(z.string()).default([]),
  target: z.string().optional(),
});

const ticketIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z][A-Za-z0-9]*-\d+$/, "Ticket ID must look like PROJ-123")
  .transform((value) => value.toUpperCase());

const ticketLookupSchema = z.object({
  ticketId: ticketIdSchema,
  jiraCredentials: jiraCredentialsSchema.optional(),
});

const ticketSearchSchema = z.object({
  jiraCredentials: jiraCredentialsSchema,
  nextPageToken: z.string().min(1).max(2048).optional(),
});

export { ticketSchema, ticketIdSchema, ticketLookupSchema, ticketSearchSchema };
