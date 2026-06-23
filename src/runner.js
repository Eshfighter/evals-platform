import { readFile } from "node:fs/promises";
import { scoreOutput } from "./metrics.js";
import { createProvider } from "./provider.js";

export async function loadSuite(path) {
  const raw = await readFile(path, "utf8");
  const suite = JSON.parse(raw);
  validateSuite(suite);
  return suite;
}

export async function runSuite(suite, provider = createProvider()) {
  const startedAt = new Date().toISOString();
  const results = [];

  for (const testCase of suite.cases) {
    const output = await provider({ prompt: suite.prompt, input: testCase.input, case: testCase });
    const score = scoreOutput(output, testCase.expect);
    results.push({
      id: testCase.id,
      input: testCase.input,
      output,
      ...score
    });
  }

  const passed = results.filter((result) => result.passed).length;
  return {
    suite: suite.name,
    startedAt,
    completedAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    score: results.length === 0 ? 0 : passed / results.length,
    results
  };
}

function validateSuite(suite) {
  if (!suite.name || !suite.prompt || !Array.isArray(suite.cases)) {
    throw new Error("Eval suite requires name, prompt, and cases");
  }
}
