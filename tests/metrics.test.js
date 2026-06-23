import assert from "node:assert/strict";
import test from "node:test";
import { normalizeText, scoreOutput } from "../src/metrics.js";

test("normalizes text for stable comparisons", () => {
  assert.equal(normalizeText("  Billing \n"), "billing");
});

test("scores exact matches", () => {
  assert.deepEqual(scoreOutput("bug", { type: "exact", value: "bug" }).passed, true);
  assert.deepEqual(scoreOutput("billing", { type: "exact", value: "bug" }).score, 0);
});

test("scores JSON field matches", () => {
  const result = scoreOutput('{"label":"account"}', { type: "json_field", field: "label", value: "account" });
  assert.equal(result.passed, true);
});
