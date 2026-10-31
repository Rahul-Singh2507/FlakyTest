import { z } from "zod";

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

export { ticketSchema, ticketIdSchema };
