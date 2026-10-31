import { settings } from "../../config/env.js";
import { captureSnapshot } from "./pageSnapshot.js";
import { describeInteractionTarget, describeTarget, resolveInteractionLocator, resolveLocator } from "./locators.js";
import { fillTestData } from "../generation/testData.js";

const HEALABLE_ACTIONS = new Set(["fill", "click"]);
const NETWORK_IDLE_WAIT_MS = 5000;

export const settlePage = (page) => page.waitForLoadState("networkidle", { timeout: NETWORK_IDLE_WAIT_MS }).catch(() => null);

export async function openPage(page, pagePath, site) {
  await page.goto(new URL(pagePath, site.baseUrl).href, { waitUntil: "load" });
  await settlePage(page);
}
const SCREENSHOT_OPTIONS = { animations: "disabled", caret: "hide" };

const stepHandlers = {
  goto: (page, step, site) => openPage(page, step.path, site),
  fill: (page, step, site) => resolveInteractionLocator(page, step.target).fill(fillTestData(step.value, site)),
  click: (page, step) => resolveInteractionLocator(page, step.target).click(),
  expectVisible: (page, step) => resolveLocator(page, step.target).waitFor({ state: "visible" }),
  expectText: (page, step, site) => page.getByText(fillTestData(step.value, site)).first().waitFor({ state: "visible" }),
};

export async function performSteps(page, steps, site) {
  for (const step of steps) {
    await stepHandlers[step.action](page, step, site);
  }
}

async function classifyFailure(page, step, error) {
  const isMissingElement =
    HEALABLE_ACTIONS.has(step.action) &&
    error.name === "TimeoutError" &&
    (await resolveInteractionLocator(page, step.target).count()) === 0;
  const firstLine = error.message.split("\n")[0];
  const classificationByKind = {
    "locator-missing": () => `Element not found: ${describeInteractionTarget(step.target)}`,
    assertion: () =>
      `Assertion failed: expected ${step.action === "expectText" ? `text "${step.value}"` : describeTarget(step.target)} to be visible`,
    error: () => firstLine,
  };
  const kind = isMissingElement
    ? "locator-missing"
    : step.action.startsWith("expect") && error.name === "TimeoutError"
      ? "assertion"
      : "error";
  return { kind, message: classificationByKind[kind]() };
}

export async function newTestPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 720 } });
  const page = await context.newPage();
  page.setDefaultTimeout(settings.stepTimeoutMs);
  page.setDefaultNavigationTimeout(settings.navigationTimeoutMs);
  return { context, page };
}

export async function executeSteps(browser, steps, site) {
  const { context, page } = await newTestPage(browser);
  const startedAt = Date.now();
  try {
    for (const [stepIndex, step] of steps.entries()) {
      const error = await stepHandlers[step.action](page, step, site).then(
        () => null,
        (stepError) => stepError
      );
      if (error) {
        const failure = await classifyFailure(page, step, error);
        return {
          passed: false,
          durationMs: Date.now() - startedAt,
          failedStepIndex: stepIndex,
          failureKind: failure.kind,
          errorMessage: `Step ${stepIndex + 1} (${step.action}): ${failure.message}`,
          snapshot: failure.kind === "locator-missing" ? await captureSnapshot(page) : [],
          screenshot: await page.screenshot(SCREENSHOT_OPTIONS),
        };
      }
    }
    await page.evaluate(() => document.fonts.ready);
    return {
      passed: true,
      durationMs: Date.now() - startedAt,
      screenshot: await page.screenshot(SCREENSHOT_OPTIONS),
    };
  } finally {
    await context.close();
  }
}
