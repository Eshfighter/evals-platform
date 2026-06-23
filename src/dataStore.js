import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_DATASETS = [
  {
    id: "support-smoke",
    name: "Support smoke set",
    description: "Starter examples for comparing support assistant behavior.",
    items: [
      {
        id: "duplicate-charge",
        input: "I see two charges for the same monthly subscription.",
        expected: "billing",
        messages: [{ role: "user", content: "I see two charges for the same monthly subscription." }],
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "export-error",
        input: "The CSV export button shows an error every time I click it.",
        expected: "bug",
        messages: [{ role: "user", content: "The CSV export button shows an error every time I click it." }],
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  }
];

const DEFAULT_EVALUATORS = [
  {
    id: "helpfulness-judge",
    name: "Helpfulness judge",
    type: "llm_judge",
    model: "mock-careful",
    passingScore: 0.7,
    prompt: "Score whether the answer is helpful, grounded, concise, and avoids requesting secrets. Return JSON with score, passed, and reason."
  }
];

export function createDataStore({ dataDir = process.env.DATA_DIR ?? "data" } = {}) {
  const datasetsPath = path.join(dataDir, "datasets.json");
  const evaluatorsPath = path.join(dataDir, "evaluators.json");

  return {
    async state() {
      const [datasets, evaluators] = await Promise.all([
        readJson(datasetsPath, DEFAULT_DATASETS),
        readJson(evaluatorsPath, DEFAULT_EVALUATORS)
      ]);
      return { datasets, evaluators };
    },

    async createDataset({ name, description = "" }) {
      if (!name?.trim()) throw new Error("Dataset name is required");
      const datasets = await readJson(datasetsPath, DEFAULT_DATASETS);
      const dataset = {
        id: slug(`${name}-${Date.now()}`),
        name: name.trim(),
        description: description.trim(),
        items: []
      };
      datasets.push(dataset);
      await writeJson(datasetsPath, datasets);
      return dataset;
    },

    async addDatasetItem(datasetId, { messages = [], input, expected = "" }) {
      const datasets = await readJson(datasetsPath, DEFAULT_DATASETS);
      const dataset = datasets.find((item) => item.id === datasetId);
      if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);

      const normalizedInput = input || messages.filter((message) => message.role === "user").map((message) => message.content).join("\n");
      const item = {
        id: slug(`case-${Date.now()}`),
        input: normalizedInput,
        expected,
        messages,
        createdAt: new Date().toISOString()
      };
      dataset.items.push(item);
      await writeJson(datasetsPath, datasets);
      return item;
    },

    async createEvaluator({ name, prompt, model = "", passingScore = 0.7 }) {
      if (!name?.trim()) throw new Error("Evaluator name is required");
      if (!prompt?.trim()) throw new Error("Evaluator prompt is required");
      const evaluators = await readJson(evaluatorsPath, DEFAULT_EVALUATORS);
      const evaluator = {
        id: slug(`${name}-${Date.now()}`),
        name: name.trim(),
        type: "llm_judge",
        model: model.trim(),
        passingScore: Number(passingScore),
        prompt: prompt.trim()
      };
      evaluators.push(evaluator);
      await writeJson(evaluatorsPath, evaluators);
      return evaluator;
    }
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeJson(filePath, fallback);
    return structuredClone(fallback);
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
