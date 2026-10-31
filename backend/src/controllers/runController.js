import path from "path";
import { z } from "zod";
import { paths } from "../config/env.js";
import { findRun, listRuns } from "../models/runModel.js";
import { findResult, listResults } from "../models/testResultModel.js";
import { listRepairs } from "../models/repairModel.js";
import { hasRunChannel, subscribeToRun } from "../services/execution/runEvents.js";
import { startRun } from "../services/execution/runService.js";
import { isLlmConfigured } from "../services/integrations/llmClient.js";
import { siteFromUrl } from "../services/sites/siteExplorer.js";
import { getTicket } from "../services/tickets/ticketService.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { screenshotQuerySchema, startRunSchema } from "../validators/runSchemas.js";

const requireRun = (runId) => {
  const run = findRun(runId);
  if (!run) {
    throw ApiError.notFound(`Run ${runId} not found`);
  }
  return run;
};

async function startNewRun(req, res) {
  const parsed = startRunSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }
  const { ticketId, siteUrl, pages, credentials, ...options } = parsed.data;
  if (!isLlmConfigured()) {
    throw new ApiError(503, "GROQ_API_KEY is not set. Test generation needs Groq, add the key to backend/.env");
  }
  const ticket = await getTicket(ticketId);
  if (ticket.acceptanceCriteria.length === 0) {
    throw ApiError.badRequest(`Ticket ${ticket.id} has no acceptance criteria. Add them as a bullet list under an "Acceptance Criteria" heading in its description`);
  }
  ApiResponse.success(res, { runId: startRun(ticket, siteFromUrl(siteUrl, pages, credentials), options) }, 202);
}

function listRunHistory(req, res) {
  ApiResponse.success(res, listRuns());
}

function showRun(req, res) {
  const run = requireRun(req.params.id);
  ApiResponse.success(res, { ...run, results: listResults(run.id) });
}

function listRunRepairs(req, res) {
  requireRun(req.params.id);
  ApiResponse.success(res, listRepairs(req.params.id));
}

function sendScreenshot(req, res) {
  const parsed = screenshotQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest(z.prettifyError(parsed.error));
  }
  const { variant } = parsed.data;
  const result = findResult(req.params.id, req.params.testId);
  const screenshotPath = result?.[variant === "after" ? "afterScreenshotPath" : "screenshotPath"];
  if (!screenshotPath) {
    throw ApiError.notFound("Screenshot not found");
  }
  res.sendFile(path.join(paths.screenshots, screenshotPath));
}

function streamRunEvents(req, res) {
  const run = requireRun(req.params.id);
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  if (!hasRunChannel(run.id)) {
    send({ type: "run-completed", runId: run.id, status: run.status, error: run.errorMessage });
    res.end();
    return;
  }

  const unsubscribe = subscribeToRun(run.id, (event) => {
    send(event);
    if (event.type === "run-completed") {
      res.end();
    }
  });
  req.on("close", unsubscribe);
}

export { startNewRun, listRunHistory, showRun, listRunRepairs, sendScreenshot, streamRunEvents };
