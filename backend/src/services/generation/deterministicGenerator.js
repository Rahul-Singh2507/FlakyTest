const VALID_EMAIL = "$TEST_USERNAME";
const VALID_PASSWORD = "$TEST_PASSWORD";

const emailField = { strategy: "label", value: "Email", idHint: "email" };
const passwordField = { strategy: "label", value: "Password", idHint: "password" };
const signInButton = { strategy: "role", role: "button", name: "Sign in", idHint: "sign-in-btn" };
const addToCartButton = { strategy: "role", role: "button", name: "Add to cart", idHint: "add-to-cart-btn-1" };

const loginSteps = (password) => [
  { action: "goto", path: "/login" },
  { action: "fill", target: emailField, value: VALID_EMAIL },
  { action: "fill", target: passwordField, value: password },
  { action: "click", target: signInButton },
];

const templates = [
  {
    matches: /invalid|wrong|incorrect|error/i,
    name: "Login with wrong password shows error",
    steps: [...loginSteps("not-the-right-password"), { action: "expectText", value: "Invalid credentials" }],
  },
  {
    matches: /cart/i,
    name: "Add item to cart updates count",
    steps: [
      { action: "goto", path: "/cart" },
      { action: "expectVisible", target: { strategy: "role", role: "heading", name: "Cart (0)" } },
      { action: "click", target: addToCartButton },
      { action: "expectVisible", target: { strategy: "role", role: "heading", name: "Cart (1)" } },
    ],
  },
  {
    matches: /log ?in|sign ?in/i,
    name: "Login with valid credentials shows welcome",
    steps: [
      ...loginSteps(VALID_PASSWORD),
      { action: "expectVisible", target: { strategy: "role", role: "heading", name: "Welcome" } },
      { action: "expectText", value: `You are logged in as ${VALID_EMAIL}` },
    ],
  },
];

export function generateDeterministicTest(criterion) {
  const template = templates.find(({ matches }) => matches.test(criterion));
  return template
    ? { name: template.name, steps: structuredClone(template.steps) }
    : { name: criterion, steps: [] };
}
