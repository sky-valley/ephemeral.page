# ephemeral.page Deployment Runbook

This is the operational guide for booting and tending Cloudflare environments for ephemeral.page.

Last reviewed: 2026-05-10

For the concise current-state snapshot, start with `docs/current-deployment-state.md`.

## Current Production Target

- GitHub repository: `sky-valley/ephemeral.page`
- Cloudflare account: `Sky Valley Ambient Computing`
- Cloudflare account ID: `1a935388be529ecd78ebce737183a551`
- Worker: `ephemeral-page`
- Public origin: `https://ephemeral.page`
- workers.dev route: disabled in Wrangler; production traffic uses `https://ephemeral.page`
- Deployment command: `npm run deploy`
- Remote smoke command: `EPHEMERAL_ORIGIN=https://ephemeral.page npm run smoke:remote`

## Runtime Shape

The current deployment is a Cloudflare-only MVP:

- A shared Worker exposes the API and routes requests.
- Each expression maps to one named Durable Object instance. That object is the authoritative isolated state cell for the expression, capability checks, one-response locking, expiry, result polling, and cleanup.
- Generated page HTML/CSS/JS is stored on the expression object and served through the expression capability URL.
- The page receives only `window.ephemeral.submit(...)`; it does not receive R2, Durable Object, AI, secret, account API, or result-read bindings.
- R2 stores mirrored materials privately, expression-scoped by object key.
- Queues deliver optional callbacks in the currently deployed Worker, while polling remains authoritative. The hardening branch disables callbacks and removes active Queue bindings on the next deploy.
- Workers AI composes production pages with `@cf/google/gemma-4-26b-a4b-it`; local dev uses the fixture composer.

This is not yet a Dynamic Workers implementation. If we later need stricter server-side generated-runtime isolation, add a runtime driver that provisions/deletes Dynamic Workers or Workers for Platforms units per expression, then rerun `docs/remote-smoke.md`.

## Cloudflare Resources

Wrangler configuration is the source of truth. Binding definitions must be repeated under `env.production`; Cloudflare docs state bindings such as vars and KV namespaces are not inherited by named environments, and Wrangler emitted the same warning during this setup.

Required production resources:

- Durable Object namespace for `ExpressionObject`, created by Wrangler migration tag `v1`.
- R2 bucket: `ephemeral-page-expression-assets`
- R2 lifecycle rule: `expire-expression-materials`, prefix `expressions/`, expires objects after 2 days.
- Queue: `ephemeral-page-callbacks` for the currently deployed Worker. The hardening branch removes active Queue bindings and adds a `CreateRateLimiter` Durable Object namespace in migration tag `v2`.
- Workers AI binding: `AI`
- Custom domains: `ephemeral.page` and `www.ephemeral.page`.
- `workers.dev` route is disabled; production traffic should use the custom domains.

Bootstrap commands:

```sh
npm ci
npm run check
npx wrangler r2 bucket create ephemeral-page-expression-assets
npm run deploy
EPHEMERAL_ORIGIN=https://ephemeral.page npm run smoke:remote
```

The R2 create command is idempotent in spirit but not in exit code. If it says the resource already exists, continue.

## GitHub Automation

The repo uses GitHub Actions because it is explicit, portable, and easy for future agents to inspect from the repository.

- `.github/workflows/ci.yml` runs `npm run check` on PRs and pushes to `main`.
- `.github/workflows/deploy.yml` runs `npm run check`, then `wrangler deploy --env production` on pushes to `main` and manual dispatches when `CLOUDFLARE_API_TOKEN` exists. Until that token is configured, it logs a clear skip after the build check.

Required GitHub repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`: `1a935388be529ecd78ebce737183a551`
- `CLOUDFLARE_API_TOKEN`: a Cloudflare user API token scoped to the Sky Valley Ambient Computing account. Select `Edit` for Workers Scripts, Workers R2 Storage, and Workers AI, plus `Read` for Account Settings. Cloudflare's review screen labels the selected `Edit` permissions as `Write`.

Never commit Cloudflare API tokens. Cloudflare's GitHub Actions docs explicitly call for secrets, and warn not to store `CLOUDFLARE_API_TOKEN` in the repository.

After adding `CLOUDFLARE_API_TOKEN`, run the deploy workflow manually once:

```sh
gh workflow run deploy.yml --repo sky-valley/ephemeral.page
gh run list --repo sky-valley/ephemeral.page --workflow Deploy --limit 3
```

Workers Builds is a reasonable later alternative. Cloudflare's Workers Builds can listen to a Git repo and run `npx wrangler deploy`, but first setup depends on the Cloudflare/GitHub connection and currently uses user tokens for build auth. For this bootstrap, GitHub Actions keeps all CI/CD wiring visible in git.

## Custom Domain Cutover

Current custom domain setup:

1. Cloudflare zone: `ephemeral.page` in the `Sky Valley Ambient Computing` account.
2. Cloudflare assigned nameservers: `dina.ns.cloudflare.com` and `jarred.ns.cloudflare.com`.
3. Namecheap registrar nameservers should be set to those two Cloudflare nameservers.
4. Wrangler `env.production.routes` contains custom domains for `ephemeral.page` and `www.ephemeral.page`.
5. Wrangler `env.production.vars.PUBLIC_ORIGIN` is `https://ephemeral.page`.
6. Deploy with `npm run deploy`.
7. Run `EPHEMERAL_ORIGIN=https://ephemeral.page npm run smoke:remote`.

Keep `workers_dev = false` in `wrangler.jsonc` now that custom-domain DNS, certificate issuance, and remote smoke are stable. Cloudflare docs note that disabling it in the dashboard without matching Wrangler config can be undone by the next deploy.

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

2026-05-09 agent-first public surface deploy:

- Pushed commit `98258b9` with an agent-first root document, `/humans.html`, `/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/.well-known/api-catalog`, `/robots.txt`, and `/sitemap.xml`.
- CI run `25609864498` passed on `98258b9`.
- Deploy run `25609864507` passed on `98258b9` and executed `Deploy Worker`.
- The GitHub Node.js 20 action runtime deprecation annotation still appeared for `actions/checkout@v4`, `actions/setup-node@v4`, and `cloudflare/wrangler-action@v3`; this remains a follow-up before GitHub's 2026-06-02 runner default change.
- Verified `https://ephemeral-page.noam-1a9.workers.dev/` serves `text/markdown` agent instructions with API catalog and OpenAPI `Link` headers.
- Verified `https://ephemeral-page.noam-1a9.workers.dev/humans.html` serves the separate human page.
- Verified `https://ephemeral-page.noam-1a9.workers.dev/.well-known/api-catalog` points to the deployed OpenAPI document.
- Remote smoke passed after deploy. Smoke expression id: `expr_mLPou7Z7sdbOYORNyk`.

2026-05-10 custom domain cutover:

- Added Cloudflare zone `ephemeral.page` to the `Sky Valley Ambient Computing` account on the Free plan.
- Cloudflare assigned nameservers `dina.ns.cloudflare.com` and `jarred.ns.cloudflare.com`.
- Removed imported Namecheap parking A/CNAME web records from the Cloudflare zone during setup; kept imported Namecheap email forwarding MX/SPF records.
- Updated Namecheap registrar nameservers from `dns1.registrar-servers.com` / `dns2.registrar-servers.com` to Cloudflare custom DNS.
- Updated `wrangler.jsonc` production routes to attach Worker custom domains `ephemeral.page` and `www.ephemeral.page`.
- Updated production `PUBLIC_ORIGIN` to `https://ephemeral.page` so generated agent docs and expression links use the apex domain.
- `npm run check` passed: 15 Vitest lifecycle/public-surface tests passed after typecheck.
- `npm run deploy:dry-run` passed and showed production `PUBLIC_ORIGIN` as `https://ephemeral.page`.
- Deployed Worker `ephemeral-page` with custom domain triggers for `ephemeral.page` and `www.ephemeral.page`.
- Deployment version ID: `0d04c3a8-3434-4e4b-94dc-54e959fee289`.
- Confirmed HTTP routing on `http://ephemeral.page/` serves the agent root with apex `Link` headers.
- Confirmed authoritative `.page` registry nameservers are `dina.ns.cloudflare.com` and `jarred.ns.cloudflare.com`; DNSSEC has no DS record at the registry.
- HTTPS certificate issuance completed a few minutes after custom-domain creation.
- Verified `https://ephemeral.page/` serves `text/markdown` agent instructions with apex API catalog, OpenAPI, llms, and human-page `Link` headers.
- Verified `https://ephemeral.page/humans.html` serves the human page with apex canonical, OG, Twitter, and JSON-LD metadata.
- Verified `https://ephemeral.page/robots.txt` and `https://ephemeral.page/sitemap.xml` use apex URLs; Cloudflare managed robots content is present and the repo's search/retrieval crawler allowances are appended.
- Remote smoke passed against `https://ephemeral.page`. Smoke expression id: `expr_KFDv1syq37-Cg18Q3S`.
- Pushed commit `682d94a` (`Cut over production to ephemeral.page`) to `main`.
- GitHub CI run `25619115383` passed on `682d94a`.
- GitHub Deploy run `25619115397` passed on `682d94a` and executed `Deploy Worker`; deployment version ID after CI deploy: `ff0c67f4-6249-4b6b-961b-cdb59b1fd23c`.
- Remote smoke passed again against `https://ephemeral.page` after the CI deploy. Smoke expression id: `expr_EfII_qF0JbktGUGFs3`.
- Pushed follow-up documentation commit `82eb503` (`Record custom domain verification`) to `main`.
- GitHub CI run `25619143946` passed on `82eb503`.
- GitHub Deploy run `25619143950` passed on `82eb503` and executed `Deploy Worker`; deployment version ID after that deploy: `f5fc3394-bef4-4474-85b1-87462388996c`.
- Remote smoke passed again against `https://ephemeral.page` after the docs deploy. Smoke expression id: `expr_rcn7WqjQuyBvIFBQJ0`.
- Final runbook-only correction commit should use `[skip ci]` to avoid recursively creating another deployment just to record the deployment record.

2026-05-10 workers.dev route disablement:

- Updated `wrangler.jsonc` to set `workers_dev` to `false` so the Worker is no longer reachable through `https://ephemeral-page.noam-1a9.workers.dev`.
- Updated README, AGENTS.md, and the current deployment snapshot to treat `https://ephemeral.page` as the only supported production origin.
- `npm run check` passed: 15 Vitest lifecycle/public-surface tests passed after typecheck.
- `npm run deploy:dry-run` passed and showed production `PUBLIC_ORIGIN` as `https://ephemeral.page`.
- `npm run deploy` succeeded. Deployment version ID: `91739cae-0846-41e2-a363-81b9455e3c52`.
- Wrangler reported only the `ephemeral.page` and `www.ephemeral.page` custom-domain triggers; it warned that `workers.dev` and Preview URLs are disabled.
- Verified `https://ephemeral.page/` still serves the agent root with apex `Link` headers.
- Verified `https://ephemeral-page.noam-1a9.workers.dev/` now returns Cloudflare `404`.
- Remote smoke passed against `https://ephemeral.page`. Smoke expression id: `expr_ulRES7uL1-gQqlF55L`.

2026-05-10 security hardening pass prepared:

- Prepared callback delivery disablement in the Worker contract and removed Queue bindings from `wrangler.jsonc`; polling remains the result-delivery path after the next deploy.
- Added `CreateRateLimiter` as a Durable Object class in migration tag `v2` and bound it as `CREATE_RATE_LIMITER`.
- Added request body caps, a `24h` maximum expression lifetime, deterministic create-request policy checks, generated-page output checks, material redirect validation, and create-failure R2 cleanup.
- Added live R2 lifecycle rule `expire-expression-materials` on prefix `expressions/` to expire mirrored materials after 2 days.
- Updated Cloudflare/TypeScript tooling packages: `wrangler`, `@cloudflare/vitest-pool-workers`, `@cloudflare/workers-types`, and `typescript`.
- `npm run check` passed locally with 16 Vitest lifecycle/security tests after typecheck.
- `npm run deploy:dry-run` passed with `wrangler` 4.90.0 and showed the target production bindings, including `CREATE_RATE_LIMITER` and no Queue binding.

Add a dated entry here after every bootstrap, deploy, failed deploy, migration, token rotation, or domain cutover.

## Source Notes

- Cloudflare GitHub Actions docs: CI requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets and can use `cloudflare/wrangler-action@v3`.
- Cloudflare Workers Builds docs: connected repos run an optional build command followed by a deploy command, defaulting to `npx wrangler deploy`; deploy commands can be customized with `--env`.
- Cloudflare Wrangler config docs: `wrangler.jsonc` is recommended for new projects, Wrangler config should be the source of truth, and bindings are not inherited by named environments.
- Cloudflare workers.dev docs: workers.dev provides `<worker>.<account-subdomain>.workers.dev`, useful before a custom route or domain is ready.
- Cloudflare R2 docs: buckets can be created with `wrangler r2 bucket create`.
- Cloudflare Queues docs: queues can be created with `wrangler queues create` and then bound as producer/consumer resources.
- Cloudflare Workers AI docs: Workers AI is exposed through an `AI` binding on `env.AI`; local use of Workers AI still calls Cloudflare and can incur usage.
- Cloudflare Workers custom domain docs: add `custom_domain: true` routes in `wrangler.jsonc`, then run `npx wrangler deploy` to create the Worker custom domains.
