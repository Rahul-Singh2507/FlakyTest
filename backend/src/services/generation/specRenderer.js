import { idSelector, pinnedId, roleNamePattern } from "../execution/locators.js";
import { renderTestDataLiteral } from "./testData.js";

const quote = (value) => JSON.stringify(value);

function renderBaseLocator(root, target) {
  const codeByStrategy = {
    role: () => `${root}.getByRole(${quote(target.role)}, { name: ${roleNamePattern(target.name)} })`,
    label: () => `${root}.getByLabel(${quote(target.value)}, { exact: true })`,
    text: () => `${root}.getByText(${quote(target.value)}, { exact: true })`,
    css: () => `${root}.locator(${quote(target.value)})`,
  };
  return codeByStrategy[target.strategy]();
}

function renderSemanticLocator(target) {
  const root = target.withinText
    ? `page.locator("*").filter({ hasText: ${quote(target.withinText)} }).filter({ has: ${renderBaseLocator("page", target)} }).last()`
    : "page";
  return renderBaseLocator(root, target);
}

const renderLocator = (target) => `${renderSemanticLocator(target)}.first()`;

const renderInteractionLocator = (target) =>
  pinnedId(target)
    ? `${renderSemanticLocator(target)}.and(page.locator(${quote(idSelector(pinnedId(target)))})).first()`
    : renderLocator(target);

const renderStepByAction = {
  goto: (step, site) => `await page.goto(${quote(new URL(step.path, site.baseUrl).href)});`,
  fill: (step) => `await ${renderInteractionLocator(step.target)}.fill(${renderTestDataLiteral(step.value)});`,
  click: (step) => `await ${renderInteractionLocator(step.target)}.click();`,
  expectVisible: (step) => `await expect(${renderLocator(step.target)}).toBeVisible();`,
  expectText: (step) => `await expect(page.getByText(${renderTestDataLiteral(step.value)}).first()).toBeVisible();`,
};

function renderSpec(test, site) {
  const body = test.steps.map((step) => `  ${renderStepByAction[step.action](step, site)}`).join("\n");
  return `import { test, expect } from "@playwright/test";\n\ntest(${quote(test.name)}, async ({ page }) => {\n${body}\n});\n`;
}

export { renderSpec };
