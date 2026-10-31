import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });

const blankAsMissing = (schema) => z.preprocess((value) => (value === "" ? undefined : value), schema);

const envSchema = z.object({
  PORT: blankAsMissing(z.coerce.number().int().positive().default(3001)),
  MONGODB_URI: blankAsMissing(z.string()),
  FRONTEND_ORIGIN: blankAsMissing(z.url().default("http://localhost:5173")),
  GROQ_API_KEY: blankAsMissing(z.string().optional()),
  JIRA_BASE_URL: blankAsMissing(z.url().optional()),
  JIRA_EMAIL: blankAsMissing(z.string().optional()),
  JIRA_API_TOKEN: blankAsMissing(z.string().optional()),
  JIRA_POST_COMMENT: blankAsMissing(z.stringbool().default(false)),
});

const env = envSchema.parse(process.env);

const paths = {
  backendRoot,
  mockTicket: path.join(backendRoot, "data", "mock-ticket.json"),
  mockTickets: path.join(backendRoot, "data", "mock-tickets"),
  screenshots: path.join(backendRoot, "data", "screenshots"),
};

const settings = {
  port: env.PORT,
  frontendOrigin: env.FRONTEND_ORIGIN,
  mongo: {
    uri: env.MONGODB_URI,
  },
  groq: {
    apiKey: env.GROQ_API_KEY,
  },
  jira: {
    baseUrl: env.JIRA_BASE_URL,
    email: env.JIRA_EMAIL,
    apiToken: env.JIRA_API_TOKEN,
    postComment: env.JIRA_POST_COMMENT,
  },
};

export { paths, settings };
