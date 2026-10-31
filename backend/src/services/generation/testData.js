const PLACEHOLDER_PATTERN = /\$(TEST_USERNAME|TEST_PASSWORD)\b/g;

const CREDENTIAL_BY_PLACEHOLDER = { TEST_USERNAME: "username", TEST_PASSWORD: "password" };

export const TEST_DATA_PLACEHOLDERS = {
  TEST_USERNAME: "username or email of a valid test account on the target site",
  TEST_PASSWORD: "correct password of that test account",
};

export function fillTestData(value, site) {
  return value.replace(PLACEHOLDER_PATTERN, (placeholder, key) => {
    const credential = site.credentials?.[CREDENTIAL_BY_PLACEHOLDER[key]];
    if (!credential) {
      throw new Error(`The test types ${placeholder} but no test account was entered for this run`);
    }
    return credential;
  });
}

export function renderTestDataLiteral(value) {
  const escaped = value.replace(/[`\\]/g, "\\$&").replace(/\$\{/g, "\\${");
  return value.match(PLACEHOLDER_PATTERN)
    ? `\`${escaped.replace(PLACEHOLDER_PATTERN, (placeholder, key) => `\${process.env.${key}}`)}\``
    : JSON.stringify(value);
}
