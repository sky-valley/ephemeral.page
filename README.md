# ephemeral.page

ephemeral.page is an instant web expression service for agents. An agent creates a one-off public page, a human submits one focused response, and the invoking agent retrieves the result.

This repository currently implements the local MVP loop on Cloudflare Workers primitives:

```text
create expression -> open page -> submit once -> poll result -> expire/cleanup
```

## Local Development

Install dependencies:

```sh
npm install
```

Run tests:

```sh
npm run check
```

Run the local Worker:

```sh
npm run dev
```

Create an expression:

```sh
curl -s http://localhost:8787/api/expressions \
  -H "content-type: application/json" \
  -d '{
    "intent": "Ask the user whether this audio clip sounds calm, urgent, or confused.",
    "result": {
      "desired_shape": "{ mood: string, notes?: string }"
    },
    "expires_in": "24h"
  }'
```

Open the returned `url`, submit the page, then poll the returned `result_url`.

## API

The public root of the service is intentionally agent-first:

- `/` serves AGENTS.md-style Markdown instructions for a cold agent.
- `/humans.html` serves the human explanation.
- `/humans` redirects to `/humans.html` for a clean, guessable human URL.
- `/llms.txt` and `/llms-full.txt` serve LLM-friendly context.
- `/openapi.json` and `/.well-known/api-catalog` expose the API for machine discovery.
- `/og-image.png` and `/og-square.png` serve the social preview images referenced by the human page.
- Search explainer pages such as `/what-is-ephemeral-page`, `/for-agents`, `/compare/human-in-the-loop`, `/compare/form-builders`, and `/compare/mcp-ui` give classic search engines and AI search systems focused crawl targets.

The research and rationale are recorded in [docs/agent-readiness-research.md](docs/agent-readiness-research.md). The headless onboarding evidence is recorded in [docs/agent-onboarding-evals/2026-05-09-headless-codex-claude.md](docs/agent-onboarding-evals/2026-05-09-headless-codex-claude.md).

### `POST /api/expressions`

Creates one expression.

```json
{
  "intent": "Ask the user whether this audio clip sounds calm, urgent, or confused.",
  "materials": [
    {
      "type": "audio",
      "url": "https://example.com/clip.mp3",
      "label": "Audio clip"
    }
  ],
  "result": {
    "desired_shape": "{ mood: string, notes?: string }",
    "callback_url": "https://agent.example/result"
  },
  "expires_in": "24h"
}
```

The response includes a human page URL plus agent-only status/result URLs. The MVP uses separate bearer capability links for the human and agent surfaces.

### `GET /e/:id/:view_token`

Serves the generated human page while active. After submission or expiry, the same URL shows only a terminal state.

### `POST /api/expressions/:id/submit?token=:view_token`

Used by the generated page through:

```js
await window.ephemeral.submit({ mood: "urgent" });
```

Only the first valid submission is accepted.

### `GET /api/expressions/:id/result?token=:agent_token`

Polls the result. Returns pending before submission, submitted after submission, expired if the expression expired before a response, and gone after retention is purged.

### `GET /api/expressions/:id/status?token=:agent_token`

Polls lifecycle status without requiring the generated page.

## Security Model

- The request/API surface is shared.
- The human URL and agent URLs use separate high-entropy capabilities.
- Capability hashes, not plaintext tokens, are stored.
- The generated page receives only `window.ephemeral.submit`.
- The generated page does not receive R2, Durable Object, Queue, AI, secret, account, or result-read bindings.
- External materials must use `https:` and are mirrored into private R2 before being served through expression-scoped routes.
- The page sends `no-store`, `no-referrer`, `nosniff`, `DENY`, and a strict CSP.

Future Welcome Mat / DPoP agent auth can replace the agent result capability without changing the expression lifecycle.

## Lifecycle

```text
active -> submitted -> purged
active -> expired -> purged
```

Submission immediately closes the active human flow. The result remains pollable by the agent until the retention cutoff, which defaults to `expires_at` in the MVP. Cleanup is idempotent and can be retried safely.

## Cloudflare Bindings

Configured in `wrangler.jsonc`:

- `EXPRESSIONS`: Durable Object namespace for one expression state cell per expression.
- `EXPRESSION_ASSETS`: private R2 bucket for mirrored materials.
- `CALLBACK_QUEUE`: queue for optional callback delivery.
- `AI`: Workers AI binding for production page composition.

Local development uses Cloudflare's local runtime simulation plus a fixture composer and local expression runtime approximation. Production can enable Workers AI by setting `COMPOSER=workers-ai`; the default production model is Gemma 4:

```text
@cf/google/gemma-4-26b-a4b-it
```

The `production` Wrangler environment config binds Workers AI as `AI` and sets `COMPOSER=workers-ai`. The default local environment intentionally does not bind `AI`, so local tests and `wrangler dev` stay fixture-only and do not create remote AI usage.

Production isolation still needs a remote smoke test for Dynamic Workers or Workers for Platforms.

## Deployment

The production target runs on Cloudflare Workers at:

```text
https://ephemeral.page
```

Deploy and verify:

```sh
npm run deploy
EPHEMERAL_ORIGIN=https://ephemeral.page npm run smoke:remote
```

The `https://ephemeral-page.noam-1a9.workers.dev` route remains enabled as a fallback while DNS and certificate changes settle.

The deployment runbook is the source of truth for bootstrapping new environments, CI secrets, Cloudflare resources, and domain cutover:

- [docs/deployment-runbook.md](docs/deployment-runbook.md)

## Sources

- Requirements: [docs/brainstorms/2026-05-01-ephemeral-page-cloudflare-isolated-mvp-requirements.md](docs/brainstorms/2026-05-01-ephemeral-page-cloudflare-isolated-mvp-requirements.md)
- Plan: [docs/plans/2026-05-01-001-feat-cloudflare-isolated-expression-mvp-plan.md](docs/plans/2026-05-01-001-feat-cloudflare-isolated-expression-mvp-plan.md)
- Remote smoke checklist: [docs/remote-smoke.md](docs/remote-smoke.md)
