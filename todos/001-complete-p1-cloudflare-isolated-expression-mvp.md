---
status: complete
priority: p1
issue_id: "001"
tags: [cloudflare, workers, durable-objects, mvp]
dependencies: []
---

# Cloudflare Isolated Expression MVP

## Problem Statement

Build the first ephemeral.page vertical slice from `docs/plans/2026-05-01-001-feat-cloudflare-isolated-expression-mvp-plan.md`: create an expression, serve a generated page, accept one submission, poll the result, expire/cleanup the flow, and run the loop locally.

## Findings

- The repo started empty except for brainstorm and plan documents.
- The service needs a local functional approximation using simulated Cloudflare bindings and a fake isolated runtime driver.
- Production isolation remains behind a runtime driver so Dynamic Workers or Workers for Platforms can be selected after account capability checks.

## Proposed Solutions

- Build a small framework-free Cloudflare Worker in TypeScript.
- Use one Durable Object per expression as the state authority.
- Use deterministic page composition and local runtime storage for MVP/local development.
- Defer live AI and remote isolated runtime checks behind explicit interfaces.

## Recommended Action

Implement the MVP in small modules with focused tests and update the plan checkboxes as acceptance criteria are completed.

## Acceptance Criteria

- [x] Project scaffolds and runs locally.
- [x] Create/serve/submit/poll lifecycle works.
- [x] First submission wins and double submit is rejected.
- [x] Expiry and post-submit terminal states work.
- [x] Cleanup is idempotent and test-covered.
- [x] README documents local usage and production isolation caveat.

## Work Log

### 2026-05-01 - Start MVP Implementation

**By:** Codex

**Actions:**
- Read `ce:work` instructions and the implementation plan.
- Confirmed there is no git repository in this folder yet.
- Created this ready todo as persistent work tracking.

**Learnings:**
- The local implementation needs to prove lifecycle behavior while keeping production runtime isolation behind a driver boundary.

### 2026-05-01 - MVP Vertical Slice Implemented

**By:** Codex

**Actions:**
- Added a TypeScript Cloudflare Worker project with Wrangler, Durable Objects, R2, Queues, and Cloudflare Vitest integration.
- Implemented the expression lifecycle: create, serve generated page, submit once, poll status/result, expire, terminal pages, retention purge, and callback queue handoff.
- Added local deterministic composition with optional Workers AI composition behind configuration.
- Added API-level lifecycle tests and documentation.

**Learnings:**
- The current Cloudflare Vitest pool package is compatible with Vitest 4; using the older pool with a newer runtime produced a `vm._setUnsafeEval` mismatch.
- The Cloudflare test `SELF.fetch` path needs absolute URLs in this setup.

### 2026-05-01 - Verification

**By:** Codex

**Actions:**
- Ran `npm run typecheck`.
- Ran `npm test`.
- Ran `npm audit --audit-level=moderate`.
- Started `npm run dev` and completed a localhost smoke test: create expression, fetch page, submit result, poll result.

**Learnings:**
- Local `wrangler dev` exposes the configured Durable Object, Queue, R2, and fixture composer bindings as expected.
