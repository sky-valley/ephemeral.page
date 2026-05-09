# ephemeral.page Deployment Runbook

This is the operational guide for booting and tending Cloudflare environments for ephemeral.page.

Last reviewed: 2026-05-09

## Current Production Target

- GitHub repository: `sky-valley/ephemeral.page`
- Cloudflare account: `Sky Valley Ambient Computing`
- Cloudflare account ID: `1a935388be529ecd78ebce737183a551`
- Worker: `ephemeral-page`
- Temporary public origin: `https://ephemeral-page.noam-1a9.workers.dev`
- Future public origin: `https://ephemeral.page`
- Deployment command: `npm run deploy`
- Remote smoke command: `EPHEMERAL_ORIGIN=https://ephemeral-page.noam-1a9.workers.dev npm run smoke:remote`

## Runtime Shape

The current deployment is a Cloudflare-only MVP:

- A shared Worker exposes the API and routes requests.
- Each expression maps to one named Durable Object instance. That object is the authoritative isolated state cell for the expression, capability checks, one-response locking, expiry, result polling, and cleanup.
- Generated page HTML/CSS/JS is stored on the expression object and served through the expression capability URL.
- The page receives only `window.ephemeral.submit(...)`; it does not receive R2, Queue, Durable Object, AI, secret, account API, or result-read bindings.
- R2 stores mirrored materials privately, expression-scoped by object key.
- Queues deliver optional callbacks, while polling remains authoritative.
- Workers AI composes production pages with `@cf/google/gemma-4-26b-a4b-it`; local dev uses the fixture composer.

This is not yet a Dynamic Workers implementation. If we later need stricter server-side generated-runtime isolation, add a runtime driver that provisions/deletes Dynamic Workers or Workers for Platforms units per expression, then rerun `docs/remote-smoke.md`.

## Cloudflare Resources

Wrangler configuration is the source of truth. Binding definitions must be repeated under `env.production`; Cloudflare docs state bindings such as vars and KV namespaces are not inherited by named environments, and Wrangler emitted the same warning during this setup.

Required production resources:

- Durable Object namespace for `ExpressionObject`, created by Wrangler migration tag `v1`.
- R2 bucket: `ephemeral-page-expression-assets`
- Queue: `ephemeral-page-callbacks`
- Workers AI binding: `AI`
- `workers.dev` route enabled until the custom domain is ready.

Bootstrap commands:

```sh
npm ci
npm run check
npx wrangler r2 bucket create ephemeral-page-expression-assets
npx wrangler queues create ephemeral-page-callbacks
npm run deploy
EPHEMERAL_ORIGIN=https://ephemeral-page.noam-1a9.workers.dev npm run smoke:remote
```

The R2 and Queue create commands are idempotent in spirit but not in exit code. If they say the resource already exists, continue.

## GitHub Automation

The repo uses GitHub Actions because it is explicit, portable, and easy for future agents to inspect from the repository.

- `.github/workflows/ci.yml` runs `npm run check` on PRs and pushes to `main`.
- `.github/workflows/deploy.yml` runs `npm run check`, then `wrangler deploy --env production` on pushes to `main` and manual dispatches when `CLOUDFLARE_API_TOKEN` exists. Until that token is configured, it logs a clear skip after the build check.

Required GitHub repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`: `1a935388be529ecd78ebce737183a551`
- `CLOUDFLARE_API_TOKEN`: a Cloudflare user API token scoped to the Sky Valley Ambient Computing account. Select `Edit` for Workers Scripts, Workers R2 Storage, Queues, and Workers AI, plus `Read` for Account Settings. Cloudflare's review screen labels the selected `Edit` permissions as `Write`.

Never commit Cloudflare API tokens. Cloudflare's GitHub Actions docs explicitly call for secrets, and warn not to store `CLOUDFLARE_API_TOKEN` in the repository.

After adding `CLOUDFLARE_API_TOKEN`, run the deploy workflow manually once:

```sh
gh workflow run deploy.yml --repo sky-valley/ephemeral.page
gh run list --repo sky-valley/ephemeral.page --workflow Deploy --limit 3
```

Workers Builds is a reasonable later alternative. Cloudflare's Workers Builds can listen to a Git repo and run `npx wrangler deploy`, but first setup depends on the Cloudflare/GitHub connection and currently uses user tokens for build auth. For this bootstrap, GitHub Actions keeps all CI/CD wiring visible in git.

## Custom Domain Cutover

When `ephemeral.page` is ready:

1. Add the domain/zone to Cloudflare or confirm it is already in the account.
2. Add a Worker route or custom domain for the Worker.
3. Change `env.production.vars.PUBLIC_ORIGIN` in `wrangler.jsonc` to `https://ephemeral.page`.
4. Deploy with `npm run deploy`.
5. Run `EPHEMERAL_ORIGIN=https://ephemeral.page npm run smoke:remote`.
6. Decide whether to disable the `workers.dev` route. Cloudflare docs note that adding routes can infer `workers_dev = false`, and disabling it in the dashboard without matching Wrangler config can be undone by the next deploy.

## Reality Log

2026-05-09 initial plan:

- The local folder was not a git repository yet.
- GitHub CLI is authenticated as `noamt`, and the accessible organization is `sky-valley`.
- Wrangler is authenticated to the `Sky Valley Ambient Computing` Cloudflare account.
- Existing account resources before bootstrap did not include the ephemeral.page R2 bucket, Queue, or Worker.
- Wrangler dry-run showed production env bindings were missing before this runbook existed, so `wrangler.jsonc` now duplicates Durable Object, R2, Queue, and AI bindings in `env.production`.
- The temporary workers.dev account subdomain is `noam-1a9`.

2026-05-09 bootstrap result:

- Set `compatibility_date` to `2026-05-07` because the installed `@cloudflare/vitest-pool-workers`/Miniflare runtime rejected `2026-05-09` during local tests. Revisit this when upgrading Wrangler/test runtime packages.
- `npm run check` passed: 8 Vitest lifecycle tests passed after typecheck. The test runner emitted a post-exit `workerd/api/web-socket.c++:821: disconnected` line but exited successfully.
- `npm run deploy:dry-run` passed and showed all production bindings: Durable Object, R2 bucket, Queue, Workers AI, and production vars.
- Created R2 bucket `ephemeral-page-expression-assets`.
- Created Queue `ephemeral-page-callbacks`.
- Deployed Worker `ephemeral-page` to `https://ephemeral-page.noam-1a9.workers.dev`.
- Deployment version ID: `5551adae-2182-41f2-93c1-8d18bb6fb8d1`.
- Remote smoke passed against workers.dev. Smoke expression id: `expr_H-V7G8UsCf10nBIFiy`.
- The first remote create call took tens of seconds because production composition uses Workers AI/Gemma 4. Keep an eye on create latency and add an explicit composer timeout/fallback if this feels bad in usage.
- Created public GitHub repo `sky-valley/ephemeral.page` and pushed initial commit `e8bb53e`.
- Set GitHub secret `CLOUDFLARE_ACCOUNT_ID`.
- The first GitHub CI run passed.
- The first GitHub deploy run failed because `CLOUDFLARE_API_TOKEN` was not configured. The workflow was updated so future runs skip deploy cleanly until the scoped token is added.
- Pushed follow-up commit `d6ae764` with the token-aware deploy workflow.
- GitHub CI run `25608095037` passed on `d6ae764`.
- GitHub Deploy run `25608095046` passed on `d6ae764`; it ran checks and skipped deployment because `CLOUDFLARE_API_TOKEN` is not configured yet.

2026-05-09 CI deploy activation:

- Created Cloudflare API token `ephemeral-page-github-actions` with account-scoped permissions: `Workers Scripts:Write`, `Workers R2 Storage:Write`, `Queues:Write`, `Workers AI:Write`, and `Account Settings:Read`.
- Set GitHub secret `CLOUDFLARE_API_TOKEN` for `sky-valley/ephemeral.page`. The token value was not written to repository files.
- Manual GitHub Deploy run `25608812721` passed on `main` commit `7043419`; it ran checks, skipped the placeholder "no token" step, and executed `wrangler deploy --env production`.
- GitHub emitted a Node.js 20 action runtime deprecation annotation for `actions/checkout@v4`, `actions/setup-node@v4`, and `cloudflare/wrangler-action@v3`. The workflow itself runs project Node `22`; revisit action versions or set the runner override before GitHub's 2026-06-02 default change if the warning persists.
- Remote smoke passed against workers.dev after the CI deploy. Smoke expression id: `expr_t5FA-AjyZLH-Chev9-`.
- Pushed documentation commit `b779051` and confirmed automatic push workflows: CI run `25608847930` passed, Deploy run `25608847933` passed, and the Deploy job executed `Deploy Worker`.
- Remote smoke passed again after the push-triggered deploy. Smoke expression id: `expr_xe3WbBASiDwdjxbTrJ`.

Add a dated entry here after every bootstrap, deploy, failed deploy, migration, token rotation, or domain cutover.

## Source Notes

- Cloudflare GitHub Actions docs: CI requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets and can use `cloudflare/wrangler-action@v3`.
- Cloudflare Workers Builds docs: connected repos run an optional build command followed by a deploy command, defaulting to `npx wrangler deploy`; deploy commands can be customized with `--env`.
- Cloudflare Wrangler config docs: `wrangler.jsonc` is recommended for new projects, Wrangler config should be the source of truth, and bindings are not inherited by named environments.
- Cloudflare workers.dev docs: workers.dev provides `<worker>.<account-subdomain>.workers.dev`, useful before a custom route or domain is ready.
- Cloudflare R2 docs: buckets can be created with `wrangler r2 bucket create`.
- Cloudflare Queues docs: queues can be created with `wrangler queues create` and then bound as producer/consumer resources.
- Cloudflare Workers AI docs: Workers AI is exposed through an `AI` binding on `env.AI`; local use of Workers AI still calls Cloudflare and can incur usage.
