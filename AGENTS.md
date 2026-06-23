# Agent Development Guide

This file gives coding agents the project context needed to make useful changes without leaking secrets or turning the app into a framework-heavy prototype.

## Project Shape

- Runtime: Node.js 20+ with native ESM.
- Backend: `src/server.js` uses the built-in `http` module and serves static assets from `public/`.
- Frontend: plain HTML, CSS, and JavaScript. There is no bundler or frontend framework.
- Persistence: local JSON files under `data/`, which must remain ignored by Git.
- Providers: `src/provider.js` supports mock mode and OpenAI-compatible chat completion endpoints.
- Evaluation flow: datasets and evaluators are managed by `src/dataStore.js`; model comparisons live in `src/comparison.js`; LLM judge parsing lives in `src/evaluators.js`.

## Development Rules

- Keep the app public-safe. Do not add company names, private URLs, private Slack/workspace identifiers, real prompts, API keys, customer data, or production logs.
- Prefer the existing no-build architecture unless there is a strong reason to add tooling.
- Keep backend modules small and testable. Add tests for scoring, evaluator parsing, dataset handling, or comparison behavior when changing those areas.
- Treat UI-created `data/` files as local runtime state, not seed data for the repository.
- Maintain OpenAI-compatible provider support without hard-coding a single model vendor into the app.
- Avoid logging prompt text, conversation text, or provider responses in server logs.
- Keep `.env.example` generic and empty for secrets.

## Useful Commands

```bash
npm test
npm run run:sample
npm start
```

The default local UI is `http://127.0.0.1:8081`.

## Before Committing

Run:

```bash
npm test
npm run run:sample
rg -n "<private-identifiers-or-secret-patterns>" .
```

The final scan should return no matches except intentional documentation warnings, if any.
