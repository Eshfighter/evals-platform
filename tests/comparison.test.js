import assert from "node:assert/strict";
import test from "node:test";
import { compareModels } from "../src/comparison.js";
import { createProvider } from "../src/provider.js";

test("compares multiple models over a dataset", async () => {
  const report = await compareModels({
    dataset: {
      name: "Sample",
      items: [
        {
          id: "case-1",
          input: "The export button fails.",
          expected: "bug",
          messages: [{ role: "user", content: "The export button fails." }]
        }
      ]
    },
    evaluator: {
      name: "Judge",
      type: "llm_judge",
      model: "mock-careful",
      passingScore: 0.7,
      prompt: "Return JSON with score, passed, and reason."
    },
    models: ["mock-fast", "mock-careful"],
    provider: createProvider({ LLM_PROVIDER: "mock" })
  });

  assert.equal(report.rows.length, 2);
  assert.equal(report.summary.length, 2);
  assert.equal(report.summary[0].cases, 1);
});
