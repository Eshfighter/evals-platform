export function createProvider(env = process.env) {
  if ((env.LLM_PROVIDER ?? "mock") === "openai-compatible") {
    return openAICompatibleProvider(env);
  }

  return mockProvider();
}

function mockProvider() {
  return async ({ input = "", messages = [], model = "mock-fast", purpose = "completion" }) => {
    const text = input.toLowerCase();

    if (purpose === "judge") {
      return mockJudge(input);
    }

    if (messages.length > 0) {
      return mockChat(messages, model);
    }

    if (text.includes("charge") || text.includes("subscription") || text.includes("invoice")) return "billing";
    if (text.includes("error") || text.includes("fails") || text.includes("button")) return "bug";
    if (text.includes("password") || text.includes("login") || text.includes("account")) return "account";
    return "general";
  };
}

function openAICompatibleProvider(env) {
  const baseUrl = env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const apiKey = env.LLM_API_KEY;
  const defaultModel = env.LLM_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("LLM_API_KEY is required when LLM_PROVIDER=openai-compatible");
  }

  return async ({ prompt, input, messages, model, temperature = 0 }) => {
    const payloadMessages = messages ?? [
      { role: "system", content: prompt },
      { role: "user", content: input }
    ];

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: model ?? defaultModel,
        temperature,
        messages: payloadMessages
      })
    });

    if (!response.ok) {
      throw new Error(`Provider request failed with ${response.status}`);
    }

    const payload = await response.json();
    return payload.choices?.[0]?.message?.content ?? "";
  };
}

function mockChat(messages, model) {
  const last = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const label = classify(last);

  if (model.includes("strict")) {
    return `Category: ${label}. Required next step: collect only the minimum details needed to verify the request.`;
  }

  if (model.includes("careful")) {
    return `This looks like a ${label} request. I would ask one follow-up question, confirm the user's goal, and avoid requesting secrets or payment details.`;
  }

  return `This is likely ${label}. What detail should I check next?`;
}

function mockJudge(input) {
  const payload = safeJsonParse(input) ?? {};
  const output = String(payload.output ?? "").toLowerCase();
  const expected = String(payload.expected ?? "").toLowerCase();
  const score = expected && output.includes(expected) ? 1 : output.length > 20 ? 0.7 : 0.4;
  return JSON.stringify({
    score,
    passed: score >= 0.7,
    reason: expected ? `Checked whether the answer covered ${expected}.` : "Checked whether the answer was specific enough."
  });
}

function classify(text) {
  const value = text.toLowerCase();
  if (value.includes("charge") || value.includes("subscription") || value.includes("invoice")) return "billing";
  if (value.includes("error") || value.includes("fails") || value.includes("button") || value.includes("export")) return "bug";
  if (value.includes("password") || value.includes("login") || value.includes("account")) return "account";
  return "general";
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
