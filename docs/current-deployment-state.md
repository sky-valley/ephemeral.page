# ephemeral.page Current Deployment State

Last verified: 2026-05-11T02:42:50Z

This is the quick state snapshot for future agents. The longer chronological log lives in `docs/deployment-runbook.md`.

## Live Target

- Public origin: `https://ephemeral.page`
- workers.dev route: disabled in Wrangler; production traffic uses `https://ephemeral.page`
- GitHub repository: `sky-valley/ephemeral.page`
- Current local branch at verification: `main`
- Repo HEAD used for live verification before this documentation update: `9d61239`
- Cloudflare account: `Sky Valley Ambient Computing`
- Cloudflare account ID: `1a935388be529ecd78ebce737183a551`
- Worker: `ephemeral-page`
- Latest observed Worker deployment version: `e6a6366c-0459-476f-9d2c-c8f808126c56`
- Latest end-to-end smoke expression id: `expr_96yBjqGHpUB6Uyb07y`

## What Is Deployed

The production deployment is the Cloudflare-only MVP:

- A shared Cloudflare Worker exposes the public docs and expression API.
- Each expression uses one named Durable Object as its isolated state cell.
- Generated UI is served through expression-scoped capability URLs.
- The page only receives `window.ephemeral.submit(...)`.
- Mirrored materials are stored privately in R2 under expression-scoped keys.
- Callbacks are disabled; polling remains the reliable read path.
- Production page composition uses Workers AI with `@cf/google/gemma-4-26b-a4b-it`.
- Local development remains deterministic with `COMPOSER=fixture` and no local AI binding.
- The current public positioning is temporary web expression for agents: pages can ask, show, compare, preview, explain, acknowledge, or collect one response.

This is not yet a Dynamic Workers or Workers for Platforms implementation. The current shipped isolation unit is one Durable Object per expression.

## Cloudflare Resources

Wrangler source of truth: `wrangler.jsonc`.

Production bindings and triggers:

- Durable Object namespace: `EXPRESSIONS`, class `ExpressionObject`, migration tag `v1`.
- Durable Object namespace: `CREATE_RATE_LIMITER`, class `CreateRateLimiter`, migration tag `v2`.
- R2 bucket: `ephemeral-page-expression-assets`.
- R2 lifecycle rule: `expire-expression-materials`, prefix `expressions/`, expires objects after 2 days.
- Workers AI binding: `AI`.
- Static assets binding: `ASSETS` from `./public`.
- Custom domains: `ephemeral.page` and `www.ephemeral.page`.
- `workers_dev = false`, so `ephemeral-page.noam-1a9.workers.dev` is not an alternate production origin.

Production vars:

```text
PUBLIC_ORIGIN=https://ephemeral.page
RUNTIME_DRIVER=durable-object
COMPOSER=workers-ai
WORKERS_AI_MODEL=@cf/google/gemma-4-26b-a4b-it
```

Important: smoke tests must use `EPHEMERAL_ORIGIN=https://ephemeral.page`; workers.dev is intentionally not a supported production origin.

## Domain And DNS

- Registrar: Namecheap.
- Cloudflare zone: `ephemeral.page`.
- Cloudflare assigned nameservers: `dina.ns.cloudflare.com`, `jarred.ns.cloudflare.com`.
- Registry check at verification:
  - `dig @ns-tld1.charlestonroadregistry.com ephemeral.page NS` returned the two Cloudflare nameservers.
  - `dig @dina.ns.cloudflare.com ephemeral.page NS` returned the two Cloudflare nameservers.
  - `dig +short DS ephemeral.page` returned no DS record.
- Recursive DNS propagation note:
  - A normal `dig +short NS ephemeral.page` still returned stale Namecheap nameservers from one resolver path during verification.
  - The site itself served over HTTPS from Cloudflare, so this was cache propagation rather than an app-routing blocker.

The Cloudflare zone also has Cloudflare Managed robots content prepended to `robots.txt`. The repo's own crawler guidance is appended after that managed block.

## Public Surface

Verified live at `https://ephemeral.page`:

- `/` serves agent-first Markdown with `content-type: text/markdown`.
- `/humans.html` serves the human page with canonical, OG, Twitter, and JSON-LD metadata using apex URLs.
- `/openapi.json` serves OpenAPI 3.1 with `servers[0].url = https://ephemeral.page`.
- `/.well-known/api-catalog` links to the OpenAPI doc and human/agent docs.
- `/robots.txt` and `/sitemap.xml` use apex URLs.
- `/og-image.png` serves a 1200 x 630 PNG.
- `https://ephemeral-page.noam-1a9.workers.dev/` returns Cloudflare 404 after disabling `workers_dev`.

The agent-page URLs are dynamic from `env.PUBLIC_ORIGIN`; they should not be hardcoded to workers.dev in production.

## CI/CD

GitHub Actions is the active deployment path:

- `.github/workflows/ci.yml` runs `npm run check` on pushes and PRs.
- `.github/workflows/deploy.yml` runs `npm run check`, then deploys with Wrangler when `CLOUDFLARE_API_TOKEN` is present.
- CI and Deploy use `actions/checkout@v6` and `actions/setup-node@v6`; Deploy runs the repo-installed Wrangler CLI with `npm run deploy` rather than `cloudflare/wrangler-action`.
- Required secrets:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_TOKEN`

Recent successful runs:

- CI `25645959021` passed for commit `13b7fba`.
- Deploy `25645959012` passed for commit `13b7fba` after rerunning with the corrected Cloudflare API token. Latest successful job ID: `75276010590`.
- The Cloudflare API token `ephemeral-page-github-actions` now carries the required five permissions: Workers Scripts Write, Workers R2 Storage Write, Workers AI Write, Account Settings Read, and `ephemeral.page` Workers Routes Write. The stale Queues Write permission was removed.
- CI `25646699795` and Deploy `25646699783` passed for commit `11ff8b4`.
- Deploy `25646699783` used the direct `npm run deploy` step and no longer emitted the GitHub Actions `Node.js 20` action-runtime deprecation annotation.
- CI `25647374422` and Deploy `25647374427` passed for commit `9d61239`.
- Deploy `25647374427` shipped the web-expression prompt coverage pass and uploaded Worker version `e6a6366c-0459-476f-9d2c-c8f808126c56`.
- The post-deploy prompt eval created 8/8 representative pages with no generic fallback. Details: `docs/evals/2026-05-11-web-expression-live-prompt-eval.md`.

Known CI follow-up:

- `npm run check` on GitHub still logs Node's `DEP0040` `punycode` deprecation warning from the test/runtime stack. This is separate from the fixed GitHub Actions Node 20 runtime annotation.

## Re-Verify From Scratch

Run from the repo root:

```sh
git status --short
npm run check
npm run deploy:dry-run
EPHEMERAL_ORIGIN=https://ephemeral.page npm run smoke:remote
```

Check public docs and discovery:

```sh
curl -sS -D - https://ephemeral.page/ -o /tmp/ephemeral-root.md
curl -sS -D - https://ephemeral.page/humans.html -o /tmp/ephemeral-human.html
curl -sS https://ephemeral.page/openapi.json | jq '.servers, .paths | keys?'
curl -sS https://ephemeral.page/.well-known/api-catalog
curl -sS https://ephemeral.page/robots.txt
curl -sS https://ephemeral.page/sitemap.xml
```

Check DNS authority:

```sh
dig @ns-tld1.charlestonroadregistry.com ephemeral.page NS +noall +answer +authority
dig @dina.ns.cloudflare.com ephemeral.page NS +noall +answer +authority
dig +short A ephemeral.page
dig +short AAAA ephemeral.page
dig +short DS ephemeral.page
```

Check deployed Worker versions and GitHub runs:

```sh
npx wrangler deployments list --env production
gh run list --repo sky-valley/ephemeral.page --limit 6
```

## Work Completed In This Deployment Slice

- Added `ephemeral.page` as a Cloudflare zone in the Sky Valley account.
- Pointed Namecheap nameservers to Cloudflare.
- Removed imported Namecheap parking A/CNAME web records from Cloudflare during setup.
- Kept imported Namecheap email forwarding MX/SPF records.
- Added Worker custom domains for `ephemeral.page` and `www.ephemeral.page`.
- Moved production `PUBLIC_ORIGIN` to `https://ephemeral.page`.
- Deployed and verified HTTPS certificate activation.
- Verified the agent root, human page, OpenAPI, API catalog, robots, sitemap, OG asset, and end-to-end expression lifecycle.
- Updated `README.md`, `docs/remote-smoke.md`, `docs/deployment-runbook.md`, and this snapshot.
- Deployed commit `13b7fba` with security hardening, rate limiting, callbacks disabled, R2 lifecycle cleanup, and package updates.
- Deleted the stale `ephemeral-page-callbacks` queue after it had zero producers and zero consumers.
- Corrected the GitHub deploy token so CI can reconcile custom-domain Worker routes and confirmed the deploy job passes.
- Removed the remaining Node 20-targeted Cloudflare deploy action from GitHub Actions and confirmed direct Wrangler deploy works from CI.
- Repositioned the public agent/human surfaces around temporary web expression, added representative prompts, fixed benign API-key-step report overblocking, and fixed same-origin public asset mirroring for material previews.

## Current Follow-Ups

- Monitor production create latency. Workers AI/Gemma 4 can make first expression creation take tens of seconds; add an explicit composer timeout/fallback if usage feels slow.
- Dynamic Workers or Workers for Platforms remain future stricter isolation options, not the shipped runtime driver.
