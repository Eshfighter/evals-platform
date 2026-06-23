import { evaluateOutput } from "./evaluators.js";
import { createProvider } from "./provider.js";

export async function compareModels({ dataset, evaluator, models, provider = createProvider() }) {
  if (!dataset) throw new Error("Dataset is required");
  if (!evaluator) throw new Error("Evaluator is required");
  if (!Array.isArray(models) || models.length === 0) throw new Error("At least one model is required");

  const rows = [];
  for (const item of dataset.items) {
    for (const model of models) {
      const messages = item.messages?.length ? item.messages : [{ role: "user", content: item.input }];
      const output = await provider({ purpose: "chat", messages, model, temperature: 0.2 });
      const judgment = await evaluateOutput({
        evaluator,
        input: item.input,
        expected: item.expected,
        output,
        provider
      });
      rows.push({
        caseId: item.id,
        model,
        input: item.input,
        expected: item.expected,
        output,
        ...judgment
      });
    }
  }

  const summary = models.map((model) => {
    const modelRows = rows.filter((row) => row.model === model);
    const averageScore = modelRows.reduce((sum, row) => sum + row.score, 0) / Math.max(1, modelRows.length);
    return {
      model,
      cases: modelRows.length,
      averageScore,
      passed: modelRows.filter((row) => row.passed).length
    };
  });

  return {
    dataset: dataset.name,
    evaluator: evaluator.name,
    models,
    summary,
    rows,
    createdAt: new Date().toISOString()
  };
}
