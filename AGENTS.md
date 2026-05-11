# Agent Notes

This repo is a Cloudflare-only MVP for ephemeral.page.

Before changing deployment behavior, read:

- `docs/deployment-runbook.md`
- `README.md`
- `wrangler.jsonc`
- `docs/remote-smoke.md`

Operational rules:

- Use `npm run check` before deploys and before pushing.
- Use `npm run deploy` for production deploys; it runs `wrangler deploy --env production`.
- Use `EPHEMERAL_ORIGIN=https://ephemeral.page npm run smoke:remote` after deploys.
- Keep `wrangler.jsonc` as the Cloudflare source of truth.
- Named Wrangler environments do not inherit bindings; repeat Durable Object, R2, and AI bindings inside `env.production`.
- Do not commit API tokens, OAuth tokens, `.dev.vars`, `.env`, or Wrangler local state.
- Keep local dev deterministic: local mode uses the fixture composer; production uses Workers AI.
- The current production isolation unit is one Durable Object per expression. Dynamic Workers / Workers for Platforms are documented future stricter runtime drivers, not the current shipped driver.

If you provision or change Cloudflare resources, add a dated entry to `docs/deployment-runbook.md`.
