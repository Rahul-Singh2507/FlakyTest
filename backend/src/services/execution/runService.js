import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { chromium } from "playwright";
import { insertRepair } from "../../models/repairModel.js";
import { attachTicketToRun, createRun, finishRun } from "../../models/runModel.js";
import { insertTestResult } from "../../models/testResultModel.js";
import { findSuite, saveSuite } from "../../models/testSuiteModel.js";
import { paths, settings } from "../../config/env.js";
import { findReplacement } from "../healing/healer.js";
import { isJiraConfigured, postJiraComment } from "../integrations/jiraClient.js";
import { describeInteractionTarget } from "./locators.js";
import { emitRunEvent } from "./runEvents.js";
import { renderSpec } from "../generation/specRenderer.js";
import { findLabelClicks, generateTests, SUITE_FORMAT_VERSION } from "../generation/testGenerator.js";
import { executeSteps } from "./testRunner.js";

const HEAL_CONFIDENCE_THRESHOLD = 0.8;

async function saveScreenshot(runId, fileName, screenshot) {
  const relativePath = path.join(runId, fileName);
  await mkdir(path.join(paths.screenshots, runId), { recursive: true });
  await writeFile(path.join(paths.screenshots, relativePath), screenshot);
  return relativePath;
}

async function healAndRerun(browser, runId, site, test, firstAttempt) {
  const emit = (event) => emitRunEvent(runId, { ...event, testName: test.name });
  const repairs = [];
  let steps = test.steps;
  let attempt = firstAttempt;
  let rejection = null;

  while (!attempt.passed && attempt.failureKind === "locator-missing" && repairs.length < steps.length && !rejection) {
    const stepIndex = attempt.failedStepIndex;
    const failedStep = steps[stepIndex];
    emit({ type: "healing-started", stepIndex, oldLocator: describeInteractionTarget(failedStep.target) });
    const replacement = await findReplacement(failedStep, attempt.snapshot, HEAL_CONFIDENCE_THRESHOLD);
    const repairBase = {
      runId,
      testName: test.name,
      stepIndex,
      oldLocator: describeInteractionTarget(failedStep.target),
      newLocator: replacement ? describeInteractionTarget(replacement.target) : "none",
      reason: replacement?.reason ?? "No candidate element found on the page",
      method: replacement?.method ?? "heuristic",
      confidence: replacement?.confidence ?? 0,
      timestamp: new Date().toISOString(),
    };

    if (repairBase.confidence < HEAL_CONFIDENCE_THRESHOLD) {
      rejection = { ...repairBase, outcome: "rejected" };
    } else {
      steps = steps.with(stepIndex, { ...failedStep, target: replacement.target });
      repairs.push(repairBase);
      emit({ type: "heal-found", stepIndex, newLocator: repairBase.newLocator, method: repairBase.method, confidence: repairBase.confidence });
      attempt = await executeSteps(browser, steps, site);
    }
  }

  const outcome = attempt.passed ? "applied" : "discarded";
  [...repairs.map((repair) => ({ ...repair, outcome })), ...(rejection ? [rejection] : [])].forEach(insertRepair);
  const rejectionNote = !rejection
    ? ""
    : rejection.newLocator === "none"
      ? " Heal rejected: no candidate element found on the page."
      : ` Heal rejected: best match ${rejection.newLocator} scored ${rejection.confidence}, below threshold ${HEAL_CONFIDENCE_THRESHOLD}.`;
  const discardNote = repairs.length > 0 && !attempt.passed ? " Healed locator discarded because the re-run still failed." : "";
  const healNote = `${rejectionNote}${discardNote}`;
  emit({ type: attempt.passed ? "heal-success" : "heal-failed", reason: healNote.trim() || attempt.errorMessage });

  return { attempt, steps: attempt.passed ? steps : test.steps, healNote };
}

async function runSingleTest(browser, runId, site, test, testIndex, repeatCount) {
  if (test.steps.length === 0) {
    return {
      status: "failed",
      steps: test.steps,
      attempts: ["failed"],
      duration: 0,
      errorMessage: test.generationNote,
      failureKind: "generation",
    };
  }

  const firstAttempt = await executeSteps(browser, test.steps, site);
  const needsHeal = !firstAttempt.passed && firstAttempt.failureKind === "locator-missing";
  const healing = needsHeal ? await healAndRerun(browser, runId, site, test, firstAttempt) : null;
  const finalAttempt = healing?.attempt ?? firstAttempt;
  const finalSteps = healing?.steps ?? test.steps;
  const status = finalAttempt.passed ? (healing ? "healed" : "passed") : "failed";

  const extraAttempts = [];
  for (let repetition = 1; repetition < repeatCount; repetition += 1) {
    extraAttempts.push(await executeSteps(browser, finalSteps, site));
  }
  const attempts = [finalAttempt, ...extraAttempts].map((attempt) => (attempt.passed ? "passed" : "failed"));

  return {
    status,
    steps: finalSteps,
    attempts,
    flaky: new Set(attempts).size > 1,
    duration: firstAttempt.durationMs + (healing ? finalAttempt.durationMs : 0),
    errorMessage: finalAttempt.passed ? null : `${finalAttempt.errorMessage}.${healing?.healNote ?? ""}`,
    failureKind: finalAttempt.passed ? null : finalAttempt.failureKind,
    screenshotPath: firstAttempt.passed ? null : await saveScreenshot(runId, `${testIndex}-failure.png`, (finalAttempt.passed ? firstAttempt : finalAttempt).screenshot),
    afterScreenshotPath: healing && finalAttempt.passed ? await saveScreenshot(runId, `${testIndex}-after.png`, finalAttempt.screenshot) : null,
  };
}

async function postResultsToJira(runId, ticket, results) {
  const counts = results.reduce((tally, result) => ({ ...tally, [result.status]: (tally[result.status] ?? 0) + 1 }), {});
  const summary = `FlakeTest run ${runId.slice(0, 8)}: ${counts.passed ?? 0} passed, ${counts.healed ?? 0} healed, ${counts.failed ?? 0} failed`;
  const lines = results.map(
    (result) =>
      `${result.status.toUpperCase()}${result.flaky ? " (FLAKY)" : ""} - ${result.testName}${result.errorMessage ? `: ${result.errorMessage}` : ""}`
  );
  await postJiraComment(ticket.id, summary, lines)
    .then(() => emitRunEvent(runId, { type: "jira-comment-posted" }))
    .catch((error) => emitRunEvent(runId, { type: "jira-comment-failed", reason: error.message }));
}

const isReusableSuite = (suite, ticket, site) =>
  suite.length === ticket.acceptanceCriteria.length &&
  findLabelClicks(suite).length === 0 &&
  suite.every(
    (test) =>
      test.formatVersion === SUITE_FORMAT_VERSION &&
      test.siteName === site.name &&
      test.criterion === ticket.acceptanceCriteria[test.criterionIndex] &&
      test.generatedBy === "groq" &&
      test.steps.length > 0
  );

async function executeRun(runId, ticket, site, { repeat, regenerate }) {
  const storedSuite = regenerate ? null : findSuite(ticket.id);
  const savedSuite = storedSuite && isReusableSuite(storedSuite, ticket, site) ? storedSuite : null;
  const suiteSource = savedSuite ? "saved" : "generated";
  emitRunEvent(runId, { type: "generating-tests", suiteSource });
  const tests = savedSuite ?? (await generateTests(ticket, site));
  saveSuite(ticket.id, tests);
  attachTicketToRun(runId, ticket, suiteSource);
  emitRunEvent(runId, {
    type: "tests-generated",
    tests: tests.map((test, testIndex) => ({
      testIndex,
      testName: test.name,
      generatedBy: test.generatedBy,
      generationNote: test.generationNote,
    })),
  });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [testIndex, test] of tests.entries()) {
      emitRunEvent(runId, { type: "test-started", testIndex, testName: test.name });
      const outcome = await runSingleTest(browser, runId, site, test, testIndex, repeat);
      const result = {
        runId,
        testIndex,
        testName: test.name,
        criterion: test.criterion,
        generatedBy: test.generatedBy,
        generationNote: test.generationNote,
        screenshotPath: null,
        afterScreenshotPath: null,
        flaky: false,
        ...outcome,
        specCode: renderSpec({ ...test, steps: outcome.steps }, site),
      };
      insertTestResult(result);
      results.push(result);
      emitRunEvent(runId, {
        type: "test-completed",
        testIndex,
        testName: test.name,
        status: result.status,
        flaky: result.flaky,
        duration: result.duration,
      });
    }
  } finally {
    await browser.close();
  }

  const healedSteps = new Map(results.filter((result) => result.status === "healed").map((result) => [result.testIndex, result.steps]));
  saveSuite(
    ticket.id,
    tests.map((test, testIndex) =>
      healedSteps.has(testIndex) ? { ...test, steps: healedSteps.get(testIndex), specCode: renderSpec({ ...test, steps: healedSteps.get(testIndex) }, site) } : test
    )
  );

  if (settings.jira.postComment && isJiraConfigured() && ticket.source === "jira") {
    await postResultsToJira(runId, ticket, results);
  }
}

function startRun(ticket, site, options) {
  const runId = randomUUID();
  createRun({ id: runId, ticketId: ticket.id, repeatCount: options.repeat, siteName: site.name, siteUrl: site.baseUrl });
  emitRunEvent(runId, { type: "run-started", ticketId: ticket.id });
  executeRun(runId, ticket, site, options)
    .then(() => {
      finishRun(runId, "completed");
      emitRunEvent(runId, { type: "run-completed", status: "completed" });
    })
    .catch((error) => {
      finishRun(runId, "error", error.message);
      emitRunEvent(runId, { type: "run-completed", status: "error", error: error.message });
    });
  return runId;
}

export { startRun };
