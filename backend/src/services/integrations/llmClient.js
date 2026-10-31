import { setTimeout as sleep } from "timers/promises";
import { settings } from "../../config/env.js";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = ["openai/gpt-oss-120b"];
const MODEL_UNAVAILABLE_STATUSES = new Set([429, 498, 500, 502, 503, 504]);
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
const TRANSIENT_RETRY_DELAYS_MS = [3000, 8000];
const REQUEST_TIMEOUT_MS = 45000;

const isModelUnavailable = (error) =>
  MODEL_UNAVAILABLE_STATUSES.has(error.status) || /abort|timed? ?out/i.test(`${error.name} ${error.message}`);

// Groq answers 400 json_validate_failed when the model's output does not match the schema; a retry usually succeeds.
const isTransient = (error) => TRANSIENT_STATUSES.has(error?.status) || error?.code === "json_validate_failed";

const isLlmConfigured = () => Boolean(settings.groq.apiKey);

const summarizeLlmError = (error) =>
  (error.message.match(/"message":\s*"([^"\\]{0,160})/)?.[1] ?? error.message.slice(0, 160)).trim();

async function groqError(response) {
  const body = await response.text();
  const error = new Error(body || `Groq request failed with status ${response.status}`);
  error.status = response.status;
  try {
    error.code = JSON.parse(body).error?.code;
  } catch {}
  return error;
}

async function requestModel(model, prompt, responseJsonSchema) {
  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${settings.groq.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_schema", json_schema: { name: "response", schema: responseJsonSchema } },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw await groqError(response);
  }
  const completion = await response.json();
  return { data: JSON.parse(completion.choices[0].message.content), model };
}

async function requestModelWithRetry(model, prompt, responseJsonSchema) {
  let outcome = await requestModel(model, prompt, responseJsonSchema).catch((error) => ({ error }));
  for (const delayMs of TRANSIENT_RETRY_DELAYS_MS) {
    if (!isTransient(outcome.error)) {
      return outcome;
    }
    await sleep(delayMs);
    outcome = await requestModel(model, prompt, responseJsonSchema).catch((error) => ({ error }));
  }
  return outcome;
}

async function generateJson(prompt, responseJsonSchema) {
  const unavailableModels = [];
  for (const model of GROQ_MODELS) {
    const outcome = await requestModelWithRetry(model, prompt, responseJsonSchema);
    if (!outcome.error) {
      return outcome;
    }
    if (!isModelUnavailable(outcome.error)) {
      throw outcome.error;
    }
    unavailableModels.push(`${model} (${outcome.error.status ?? "timeout"}: ${summarizeLlmError(outcome.error)})`);
  }
  throw new Error(`Every configured Groq model is unavailable: ${unavailableModels.join("; ")}`);
}

export { isLlmConfigured, summarizeLlmError, generateJson };
