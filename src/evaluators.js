import { createProvider } from "./provider.js";

export async function evaluateOutput({ evaluator, input, expected, output, provider = createProvider() }) {
  const judgeInput = JSON.stringify({ input, expected, output });
  const raw = await provider({
    purpose: "judge",
    model: evaluator.model,
    prompt: evaluator.prompt,
    input: judgeInput,
    temperature: 0
  });
  const parsed = parseJudgeResult(raw, evaluator.passingScore);

  return {
    score: parsed.score,
    passed: parsed.passed,
    reason: parsed.reason,
    raw
  };
}

export function parseJudgeResult(raw, passingScore = 0.7) {
  const parsed = safeJsonParse(raw);
  const score = clamp(Number(parsed?.score ?? 0));
  return {
    score,
    passed: typeof parsed?.passed === "boolean" ? parsed.passed : score >= passingScore,
    reason: parsed?.reason ? String(parsed.reason) : "Judge did not provide a reason"
  };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function clamp(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
