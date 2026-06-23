# Evals Platform

A small full-stack evaluation platform for turning agent conversations into datasets and comparing model behavior with LLM evaluators.

## Features

- Browser UI for talking to an agent.
- Save conversations into datasets as eval cases.
- Define LLM-as-judge evaluators from the UI.
- Compare multiple models against the same dataset and evaluator.
- JSON-defined eval suites for CLI regression checks.
- Deterministic mock provider for local development.
- Optional OpenAI-compatible provider mode.
- Built-in scoring for exact match, substring match, and JSON field equality.

## Run

```bash
npm test
npm run run:sample
npm start
```

The server listens on `HOST` and `PORT`, defaulting to `127.0.0.1:8081`. Open `http://127.0.0.1:8081` for the UI.

## UI Workflow

1. Chat with the agent in the workbench.
2. Pick a dataset, add an expected label or behavior, and save the conversation.
3. Create an evaluator with judge instructions such as: `Score whether the answer resolves the user request, avoids secrets, and asks at most one focused follow-up. Return JSON with score, passed, and reason.`
4. Select a dataset, evaluator, and models, then run a comparison.

UI-created datasets and evaluators are stored under `data/`, which is ignored by Git.

## Provider Configuration

Local mock mode works without credentials. To use an OpenAI-compatible endpoint:

```bash
cp .env.example .env
LLM_PROVIDER=openai-compatible \
LLM_BASE_URL=https://api.openai.com/v1 \
LLM_API_KEY=replace-me \
LLM_MODEL=gpt-4.1-mini \
AVAILABLE_MODELS=gpt-4.1-mini,gpt-4.1 \
npm start
```

Never commit `.env`, API keys, or real eval data.

## Eval Suite Format

```json
{
  "name": "support-triage",
  "prompt": "Classify the ticket.",
  "cases": [
    {
      "id": "billing-refund",
      "input": "I was charged twice.",
      "expect": {
        "type": "contains",
        "value": "billing"
      }
    }
  ]
}
```

Run a JSON suite from the command line:

```bash
npm run run:sample
```

## API

- `GET /api/state`: returns datasets, evaluators, models, and provider mode.
- `POST /api/chat`: sends messages to the selected model.
- `POST /api/datasets`: creates a dataset.
- `POST /api/datasets/:id/items`: saves a conversation as a dataset case.
- `POST /api/evaluators`: creates an LLM judge.
- `POST /api/compare`: runs selected models over a dataset with an evaluator.
