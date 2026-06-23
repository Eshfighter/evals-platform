let state = {
  datasets: [],
  evaluators: [],
  models: [],
  provider: "mock"
};

let conversation = [
  {
    role: "assistant",
    content: "Start with a support scenario. I can answer it, then you can save the conversation as an eval case."
  }
];

const els = {
  providerBadge: document.querySelector("#providerBadge"),
  datasetCount: document.querySelector("#datasetCount"),
  evaluatorCount: document.querySelector("#evaluatorCount"),
  chatModel: document.querySelector("#chatModel"),
  messages: document.querySelector("#messages"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  saveDataset: document.querySelector("#saveDataset"),
  expectedAnswer: document.querySelector("#expectedAnswer"),
  saveConversation: document.querySelector("#saveConversation"),
  datasetForm: document.querySelector("#datasetForm"),
  datasetName: document.querySelector("#datasetName"),
  datasetDescription: document.querySelector("#datasetDescription"),
  datasetList: document.querySelector("#datasetList"),
  evaluatorForm: document.querySelector("#evaluatorForm"),
  evaluatorName: document.querySelector("#evaluatorName"),
  evaluatorModel: document.querySelector("#evaluatorModel"),
  evaluatorPrompt: document.querySelector("#evaluatorPrompt"),
  evaluatorList: document.querySelector("#evaluatorList"),
  compareForm: document.querySelector("#compareForm"),
  compareDataset: document.querySelector("#compareDataset"),
  compareEvaluator: document.querySelector("#compareEvaluator"),
  modelChecks: document.querySelector("#modelChecks"),
  summary: document.querySelector("#summary"),
  resultsBody: document.querySelector("#resultsBody")
};

await refreshState();
renderMessages();

els.chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = els.chatInput.value.trim();
  if (!text) return;

  conversation.push({ role: "user", content: text });
  els.chatInput.value = "";
  renderMessages();

  const { answer } = await api("/api/chat", {
    method: "POST",
    body: {
      model: els.chatModel.value,
      messages: conversation
    }
  });

  conversation.push({ role: "assistant", content: answer });
  renderMessages();
});

els.saveConversation.addEventListener("click", async () => {
  const datasetId = els.saveDataset.value;
  if (!datasetId) return;

  await api(`/api/datasets/${datasetId}/items`, {
    method: "POST",
    body: {
      messages: conversation,
      expected: els.expectedAnswer.value.trim()
    }
  });
  els.expectedAnswer.value = "";
  await refreshState();
});

els.datasetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await api("/api/datasets", {
    method: "POST",
    body: {
      name: els.datasetName.value,
      description: els.datasetDescription.value
    }
  });
  els.datasetForm.reset();
  await refreshState();
});

els.evaluatorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await api("/api/evaluators", {
    method: "POST",
    body: {
      name: els.evaluatorName.value,
      model: els.evaluatorModel.value,
      prompt: els.evaluatorPrompt.value,
      passingScore: 0.7
    }
  });
  els.evaluatorForm.reset();
  await refreshState();
});

els.compareForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const models = [...els.modelChecks.querySelectorAll("input:checked")].map((input) => input.value);
  const report = await api("/api/compare", {
    method: "POST",
    body: {
      datasetId: els.compareDataset.value,
      evaluatorId: els.compareEvaluator.value,
      models
    }
  });
  renderReport(report);
});

async function refreshState() {
  state = await api("/api/state");
  renderState();
}

function renderState() {
  els.providerBadge.textContent = `provider: ${state.provider}`;
  els.datasetCount.textContent = `${state.datasets.length} datasets`;
  els.evaluatorCount.textContent = `${state.evaluators.length} evaluators`;

  fillSelect(els.chatModel, state.models.map((model) => [model, model]));
  fillSelect(els.evaluatorModel, state.models.map((model) => [model, model]));
  fillSelect(els.saveDataset, state.datasets.map((dataset) => [dataset.id, dataset.name]));
  fillSelect(els.compareDataset, state.datasets.map((dataset) => [dataset.id, dataset.name]));
  fillSelect(els.compareEvaluator, state.evaluators.map((evaluator) => [evaluator.id, evaluator.name]));

  els.datasetList.innerHTML = state.datasets.map((dataset) => `
    <div class="list-item">
      <strong>${escapeHtml(dataset.name)}</strong>
      <span>${dataset.items.length} cases - ${escapeHtml(dataset.description || "No description")}</span>
    </div>
  `).join("");

  els.evaluatorList.innerHTML = state.evaluators.map((evaluator) => `
    <div class="list-item">
      <strong>${escapeHtml(evaluator.name)}</strong>
      <span>${escapeHtml(evaluator.model || "default model")} - passing score ${evaluator.passingScore}</span>
    </div>
  `).join("");

  els.modelChecks.innerHTML = state.models.map((model, index) => `
    <label><input type="checkbox" value="${escapeHtml(model)}" ${index < 2 ? "checked" : ""}> ${escapeHtml(model)}</label>
  `).join("");
}

function renderMessages() {
  els.messages.innerHTML = conversation.map((message) => `
    <div class="message ${message.role}">
      ${escapeHtml(message.content)}
    </div>
  `).join("");
  els.messages.scrollTop = els.messages.scrollHeight;
}

function renderReport(report) {
  els.summary.innerHTML = report.summary.map((item) => `
    <div class="summary-card">
      <strong>${escapeHtml(item.model)}</strong>
      <div>${item.passed}/${item.cases} passed</div>
      <div>${Math.round(item.averageScore * 100)} average score</div>
      <div class="score"><span style="width: ${Math.round(item.averageScore * 100)}%"></span></div>
    </div>
  `).join("");

  els.resultsBody.innerHTML = report.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.caseId)}</td>
      <td>${escapeHtml(row.model)}</td>
      <td>${Math.round(row.score * 100)}</td>
      <td>${escapeHtml(row.output)}</td>
      <td>${escapeHtml(row.reason)}</td>
    </tr>
  `).join("");
}

function fillSelect(select, entries) {
  const current = select.value;
  select.innerHTML = entries.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
  if (entries.some(([value]) => value === current)) select.value = current;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Request failed");
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
