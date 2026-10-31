const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

const roleNamePattern = (name) => new RegExp(`^[\\p{Co}\\s]*${escapeRegExp(name)}[\\p{Co}\\s]*$`, "u");

const AUTO_GENERATED_ID = /^:|\d{3,}|[0-9a-f]{8}-/i;

const pinnedId = (target) => (target.idHint && !AUTO_GENERATED_ID.test(target.idHint) ? target.idHint : null);

const idSelector = (id) => `[id=${JSON.stringify(id)}]`;

function buildLocator(root, target) {
  const locatorByStrategy = {
    role: () => root.getByRole(target.role, { name: roleNamePattern(target.name) }),
    label: () => root.getByLabel(target.value, { exact: true }),
    text: () => root.getByText(target.value, { exact: true }),
    css: () => root.locator(target.value),
  };
  return locatorByStrategy[target.strategy]();
}

function semanticLocator(page, target) {
  const root = target.withinText
    ? page.locator("*").filter({ hasText: target.withinText }).filter({ has: buildLocator(page, target) }).last()
    : page;
  return buildLocator(root, target);
}

const resolveLocator = (page, target) => semanticLocator(page, target).first();

function resolveInteractionLocator(page, target) {
  const id = pinnedId(target);
  const locator = semanticLocator(page, target);
  return (id ? locator.and(page.locator(idSelector(id))) : locator).first();
}

function describeTarget(target) {
  const descriptionByStrategy = {
    role: () => `role=${target.role}[name="${target.name}"]`,
    label: () => `label="${target.value}"`,
    text: () => `text="${target.value}"`,
    css: () => `css=${target.value}`,
  };
  return `${descriptionByStrategy[target.strategy]()}${target.withinText ? ` within "${target.withinText}"` : ""}`;
}

const describeInteractionTarget = (target) => `${describeTarget(target)}${pinnedId(target) ? ` id="${pinnedId(target)}"` : ""}`;

function targetFromElement(element, withinText) {
  return element.name
    ? { strategy: "role", role: element.role, name: element.name, idHint: element.id || undefined, withinText }
    : { strategy: "css", value: `#${element.id}` };
}

export {
  roleNamePattern,
  pinnedId,
  idSelector,
  resolveLocator,
  resolveInteractionLocator,
  describeTarget,
  describeInteractionTarget,
  targetFromElement,
};
