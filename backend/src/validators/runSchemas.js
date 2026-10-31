import { z } from "zod";
import { siteUrl } from "./siteSchemas.js";
import { ticketIdSchema } from "./ticketSchemas.js";

const pagePath = z.string().startsWith("/");

const MAX_SITE_PAGES = 8;

const startRunSchema = z.object({
  ticketId: ticketIdSchema,
  repeat: z.number().int().min(1).max(5).default(1),
  regenerate: z.boolean().default(false),
  siteUrl,
  pages: z.array(pagePath).max(MAX_SITE_PAGES).default([]),
  credentials: z.object({ username: z.string().min(1), password: z.string().min(1) }).optional(),
});

const screenshotQuerySchema = z.object({
  variant: z.enum(["failure", "after"]).default("failure"),
});

export { startRunSchema, screenshotQuerySchema };
