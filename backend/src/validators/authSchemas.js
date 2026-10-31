import { z } from "zod";

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const passwordSchema = z.string().min(8).max(128);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const jiraCredentialsSchema = z.object({
  baseUrl: z
    .url()
    .refine((value) => new URL(value).protocol === "https:", "Jira URL must use HTTPS")
    .refine((value) => !new URL(value).username && !new URL(value).password, "Jira URL must not contain credentials")
    .transform((value) => value.replace(/\/+$/, "")),
  email: emailSchema,
  apiToken: z.string().trim().min(1).max(512),
});

export { jiraCredentialsSchema, loginSchema, registerSchema };
