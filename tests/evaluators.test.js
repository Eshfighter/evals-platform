import assert from "node:assert/strict";
import test from "node:test";
import { parseJudgeResult } from "../src/evaluators.js";

test("parses JSON judge results", () => {
  const result = parseJudgeResult('{"score":0.82,"passed":true,"reason":"grounded"}');
  assert.equal(result.score, 0.82);
  assert.equal(result.passed, true);
  assert.equal(result.reason, "grounded");
});

test("clamps invalid judge scores", () => {
  const result = parseJudgeResult('{"score":4}');
  assert.equal(result.score, 1);
  assert.equal(result.passed, true);
});
