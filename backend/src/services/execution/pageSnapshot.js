function collectVisibleElements() {
  const implicitRoleByTag = {
    A: "link",
    BUTTON: "button",
    H1: "heading",
    H2: "heading",
    H3: "heading",
    H4: "heading",
    H5: "heading",
    H6: "heading",
    SELECT: "combobox",
    TEXTAREA: "textbox",
    P: "paragraph",
    LABEL: "label",
  };
  const inputRoleByType = { checkbox: "checkbox", radio: "radio", submit: "button", button: "button", range: "slider" };
  const roleOf = (element) =>
    element.getAttribute("role") ||
    (element.tagName === "INPUT" ? inputRoleByType[element.type] ?? "textbox" : implicitRoleByTag[element.tagName]);
  const labelText = (element) => [...(element.labels ?? [])].map((label) => label.textContent).join(" ");
  const accessibleName = (element) =>
    (
      element.getAttribute("aria-label") ||
      labelText(element) ||
      element.getAttribute("placeholder") ||
      (element.tagName === "INPUT" ? element.value : element.textContent) ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim();

  const containerRoles = ["main", "navigation", "banner", "contentinfo", "region", "form", "group", "list", "listitem", "presentation", "none", "document", "application"];
  const structuralSelector = [
    "a, button, input, select, textarea, h1, h2, h3, h4, h5, h6, p, label",
    `[role]${containerRoles.map((role) => `:not([role="${role}"])`).join("")}`,
  ].join(", ");
  const ownText = (element) =>
    [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  const isLooseText = (element) =>
    !["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName) && ownText(element) !== "" && !element.closest(structuralSelector);

  return [...document.querySelectorAll("body *")]
    .filter((element) => element.matches(structuralSelector) || isLooseText(element))
    .filter((element) => element.getClientRects().length > 0)
    .slice(0, 200)
    .map((element) => ({
      role: element.matches(structuralSelector) ? roleOf(element) : "text",
      name: (element.matches(structuralSelector) ? accessibleName(element) : ownText(element)).slice(0, 160),
      id: element.id,
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") ?? "",
      ariaLabel: element.getAttribute("aria-label") ?? "",
    }));
}

export const captureSnapshot = (page) => page.evaluate(collectVisibleElements);
