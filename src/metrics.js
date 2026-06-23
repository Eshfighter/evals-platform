export function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function scoreOutput(output, expectation) {
  if (!expectation || typeof expectation !== "object") {
    return { passed: false, score: 0, reason: "Missing expectation" };
  }

  const actual = normalizeText(output);
  const expected = normalizeText(expectation.value);

  if (expectation.type === "exact") {
    const passed = actual === expected;
    return { passed, score: passed ? 1 : 0, reason: passed ? "Exact match" : `Expected ${expected}, received ${actual}` };
  }

  if (expectation.type === "contains") {
    const passed = actual.includes(expected);
    return { passed, score: passed ? 1 : 0, reason: passed ? "Contains expected text" : `Missing ${expected}` };
  }

  if (expectation.type === "json_field") {
    const parsed = safeJsonParse(output);
    const actualField = normalizeText(parsed?.[expectation.field]);
    const passed = actualField === expected;
    return { passed, score: passed ? 1 : 0, reason: passed ? "JSON field match" : `Expected ${expectation.field}=${expected}` };
  }

  return { passed: false, score: 0, reason: `Unsupported expectation type: ${expectation.type}` };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
