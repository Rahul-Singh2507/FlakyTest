import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });

const blankAsMissing = (schema) => z.preprocess((value) => (value === "" ? undefined : value), schema);

const envSchema = z.object({
  PORT: blankAsMissing(z.coerce.number().int().positive().default(3001)),
  HEAL_CONFIDENCE_THRESHOLD: blankAsMissing(z.coerce.number().min(0).max(1).default(0.8)),
  STEP_TIMEOUT_MS: blankAsMissing(z.coerce.number().int().positive().default(3000)),
  NAVIGATION_TIMEOUT_MS: blankAsMissing(z.coerce.number().int().positive().default(20000)),
  GROQ_API_KEY: blankAsMissing(z.string().optional()),
  GROQ_MODEL: blankAsMissing(z.string().default("openai/gpt-oss-120b")),
  GROQ_FALLBACK_MODELS: blankAsMissing(z.string().default("")),
  JIRA_BASE_URL: blankAsMissing(z.url().optional()),
  JIRA_EMAIL: blankAsMissing(z.string().optional()),
  JIRA_API_TOKEN: blankAsMissing(z.string().optional()),
  JIRA_ACCEPTANCE_CRITERIA_FIELD: blankAsMissing(z.string().optional()),
  JIRA_TARGET_FIELD: blankAsMissing(z.string().optional()),
  JIRA_POST_COMMENT: blankAsMissing(z.stringbool().default(false)),
});

const env = envSchema.parse(process.env);

const paths = {
  backendRoot,
  database: path.join(backendRoot, "data", "flaketest.db"),
  mockTicket: path.join(backendRoot, "data", "mock-ticket.json"),
  mockTickets: path.join(backendRoot, "data", "mock-tickets"),
  screenshots: path.join(backendRoot, "data", "screenshots"),
};

const commaList = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);

const settings = {
  port: env.PORT,
  healConfidenceThreshold: env.HEAL_CONFIDENCE_THRESHOLD,
  stepTimeoutMs: env.STEP_TIMEOUT_MS,
  navigationTimeoutMs: env.NAVIGATION_TIMEOUT_MS,
  groq: {
    apiKey: env.GROQ_API_KEY,
    models: [...new Set([env.GROQ_MODEL, ...commaList(env.GROQ_FALLBACK_MODELS)])],
  },
  jira: {
    baseUrl: env.JIRA_BASE_URL,
    email: env.JIRA_EMAIL,
    apiToken: env.JIRA_API_TOKEN,
    acceptanceCriteriaField: env.JIRA_ACCEPTANCE_CRITERIA_FIELD,
    targetField: env.JIRA_TARGET_FIELD,
    postComment: env.JIRA_POST_COMMENT,
  },
};

export { paths, settings };
