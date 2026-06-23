import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { compareModels } from "./comparison.js";
import { createDataStore } from "./dataStore.js";
import { createProvider } from "./provider.js";
import { loadSuite, runSuite } from "./runner.js";

const port = Number(process.env.PORT ?? 8081);
const host = process.env.HOST ?? "127.0.0.1";
const rootDir = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(rootDir, "public");
const store = createDataStore();
const provider = createProvider();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { ok: true });
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, response, url);
    }

    return await serveStatic(response, url.pathname);
  } catch (error) {
    return sendJson(response, 500, { error: "server_error", message: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`evals-platform listening on http://${host}:${port}`);
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/state") {
    const state = await store.state();
    return sendJson(response, 200, {
      ...state,
      models: availableModels(),
      provider: process.env.LLM_PROVIDER ?? "mock"
    });
  }

  if (request.method === "POST" && url.pathname === "/api/chat") {
    const body = await readJson(request);
    const answer = await provider({
      purpose: "chat",
      model: body.model,
      messages: normalizeMessages(body.messages),
      temperature: 0.2
    });
    return sendJson(response, 200, { answer });
  }

  if (request.method === "POST" && url.pathname === "/api/datasets") {
    const dataset = await store.createDataset(await readJson(request));
    return sendJson(response, 201, dataset);
  }

  const datasetItemMatch = /^\/api\/datasets\/([^/]+)\/items$/.exec(url.pathname);
  if (request.method === "POST" && datasetItemMatch) {
    const item = await store.addDatasetItem(datasetItemMatch[1], await readJson(request));
    return sendJson(response, 201, item);
  }

  if (request.method === "POST" && url.pathname === "/api/evaluators") {
    const evaluator = await store.createEvaluator(await readJson(request));
    return sendJson(response, 201, evaluator);
  }

  if (request.method === "POST" && url.pathname === "/api/compare") {
    const body = await readJson(request);
    const state = await store.state();
    const dataset = state.datasets.find((item) => item.id === body.datasetId);
    const evaluator = state.evaluators.find((item) => item.id === body.evaluatorId);
    const report = await compareModels({ dataset, evaluator, models: body.models, provider });
    return sendJson(response, 200, report);
  }

  if (request.method === "POST" && url.pathname === "/api/runs") {
    const body = await readJson(request);
    const suite = await loadSuite(body.suitePath ?? "evals/support-triage.json");
    const report = await runSuite(suite);
    return sendJson(response, 200, report);
  }

  return sendJson(response, 404, { error: "not_found" });
}

function availableModels() {
  return String(process.env.AVAILABLE_MODELS ?? process.env.LLM_MODEL ?? "mock-fast,mock-careful,mock-strict")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => ["system", "user", "assistant"].includes(message.role) && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.slice(0, 8000) }));
}

async function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) {
    return sendJson(response, 403, { error: "forbidden" });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return sendJson(response, 404, { error: "not_found" });
  } catch {
    return sendJson(response, 404, { error: "not_found" });
  }

  const stream = createReadStream(filePath);
  response.writeHead(200, { "content-type": contentType(filePath) });
  stream.pipe(response);
}

function contentType(filePath) {
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json"
  }[extname(filePath)] ?? "application/octet-stream";
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
