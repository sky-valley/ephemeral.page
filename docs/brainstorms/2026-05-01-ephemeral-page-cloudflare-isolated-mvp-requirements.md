---
date: 2026-05-01
topic: ephemeral-page-cloudflare-isolated-mvp
---

# ephemeral.page Cloudflare Isolated MVP

## Problem Frame

Agents need a fast way to ask a human for one focused interaction without building or embedding a custom UI. The service should turn an agent's intent and materials into a temporary public page, capture exactly one human response, and let the invoking agent retrieve the result.

The trust concern is central: the request surface can be shared, but the served UI for each expression must behave like an isolated one-off unit. A person with the human link can view and submit. The invoking agent with the returned result link can poll. Other parties should not be able to discover or retrieve the result.

## Requirements

- R1. Agents can create an expression by sending intent, optional materials, optional desired result shape, optional callback URL, and expiration settings.
- R2. The service returns a stable expression envelope with an ID, a human page URL, agent-only result/status URLs, and an expiration timestamp.
- R3. Each expression is atomic: one question, task, approval, media review, or focused action.
- R4. The generated page is fully AI-composed from the request and materials; agents do not select fixed templates or fields.
- R5. The generated page is mobile-friendly, accessible by default, and HTML5-first, with no complex client dependency unless needed for the specific interaction.
- R6. The generated page exposes exactly one privileged client operation: `window.ephemeral.submit(result)`.
- R7. Submitting posts the result into the platform lifecycle, not into arbitrary generated backend logic.
- R8. The first valid submission wins. Later submissions are rejected with a clear conflict response.
- R9. Polling is always available before and after submission. Before submission, result polling returns a stable pending envelope; after submission, it returns a submitted envelope with `submitted_at` and flexible `result`.
- R10. Callback delivery is optional and additive. Callback failure must not prevent polling from working.
- R11. Expired expressions can no longer be viewed, submitted, or polled as active work.
- R12. Expiration should remove or disable the expression's isolated runtime and purge associated generated resources as much as Cloudflare primitives allow.
- R13. The served UI for each generation is isolated from other expressions, rather than served as one multitenant generated page surface.
- R14. For the MVP, access control is capability-link based: the human page URL contains a human view/submit capability, and result/status URLs contain an agent retrieval capability.
- R15. Capability secrets are never stored in plaintext; only hashes or equivalent verification material are stored.
- R16. Result retrieval is only available to the invoking agent through the returned capability URL in the MVP.
- R17. The architecture must leave a clear path to replace agent result capability URLs with Welcome Mat / DPoP-style proof-bound auth later.
- R18. Generated UI receives no privileged Cloudflare bindings and no broad backend powers.
- R19. External materials should be served safely. If materials are mirrored, they are stored under expression-scoped private storage and served through the expression access path.
- R20. The MVP test suite covers create, serve, submit, double-submit rejection, poll-before-submit, poll-after-submit, and expired expression behavior.
- R21. A completed expression immediately stops serving the active interaction UI after the first accepted submission.
- R22. After completion, the human page URL shows only a terminal state such as submitted, expired, or unavailable; it must not allow editing, resubmission, or replaying the active flow.
- R23. Completed results remain available to the invoking agent until the expression expires or reaches an explicitly configured retention limit.
- R24. Cleanup is idempotent and may run from multiple triggers: successful submission, expiration alarm, callback completion, or a later sweeper.
- R25. Cleanup disables or deletes the isolated UI runtime, removes generated page assets/material mirrors where possible, and leaves only the minimum state needed to answer status/result requests until retention ends.
- R26. After retention ends, result polling returns a stable expired/gone envelope rather than leaking stale result data.

## Success Criteria

- An agent can complete the loop: create expression -> share public URL -> human submits -> agent polls result.
- Two expressions cannot read, submit to, cache-poison, or otherwise affect each other's generated UI/runtime state.
- Someone with only the human URL cannot retrieve the agent result endpoint unless that URL also contains the agent capability.
- Someone with only the agent result URL cannot submit a human response unless they also have the human capability.
- Expired expressions stop accepting interaction and their runtime/storage cleanup path is observable.
- Completed human-facing flows disappear from the active surface immediately after submission, while agent result polling continues for the intended retention window.
- The MVP remains small enough that the core lifecycle is understandable from the codebase without platform sprawl.

## Scope Boundaries

- No Welcome Mat / DPoP implementation in the MVP.
- No user accounts or dashboard in the MVP.
- No template marketplace or exposed form-builder schema.
- No embedded MCP UI as the core product. MCP can become a later wrapper/tool around the HTTP API.
- No arbitrary generated backend powers beyond the platform submit operation.
- No multi-response forms, long-lived apps, collaboration spaces, or workflow builders in the MVP.
- No guarantee that externally linked materials remain available unless the service explicitly mirrors them.

## Key Decisions

- Cloudflare-only architecture: The service should run entirely on Cloudflare Developer Platform primitives.
- Shared control plane, isolated expression plane: Creation, status, result polling, and callback orchestration live in shared platform services; each served generated UI lives in an isolated per-expression runtime.
- Durable per-expression state: Each expression needs a single authoritative state holder for expiry, one-response locking, and result retrieval.
- Two-phase lifecycle: Submission closes the human-facing flow immediately; expiry/retention cleanup removes the isolated runtime and eventually removes stored result data.
- Dynamic Workers preferred for isolated UI: Use per-expression dynamic runtime isolation when available because it is designed for on-demand isolated Workers with controlled bindings and network access.
- Workers for Platforms fallback: If Dynamic Workers are unavailable or unsuitable, use an untrusted dispatch namespace with one generated user Worker per expression.
- Capability links for MVP auth: Use unguessable human and agent capabilities now, while preserving a later upgrade path to proof-bound agent auth.
- Polling as the reliability baseline: Callback is useful but never the only result delivery mechanism.
- Private-by-default materials: Prefer platform-mediated material serving over public buckets or direct generated-code access to Cloudflare resources.

## High-Level Technical Direction

The baseline architecture is a shared API Worker, a per-expression Durable Object, an isolated generated UI runtime, private R2 for mirrored materials/assets when needed, and Queues for callback retry. AI composition can use Workers AI and/or external model providers routed through AI Gateway. Secrets and provider credentials should be stored as Cloudflare secrets or Secrets Store bindings.

The isolated UI runtime should receive only expression-specific render data and a tiny platform script that exposes `window.ephemeral.submit`. It should not receive database, object storage, queue, model, or account-management bindings.

Cleanup should be modeled as lifecycle state, not best-effort file deletion alone. A submission transitions the expression from active to submitted and prevents the active UI from rendering. An expiration or cleanup alarm then tears down the isolated runtime and deletes generated resources. A later retention cutoff can remove result data while preserving a minimal expired/gone response shape.

## Alternatives Considered

- Single shared Worker serving generated HTML from shared storage: simplest to implement, but weaker against the stated isolation concern and less compelling as a security story.
- Durable Object only per expression, serving all UI directly: strong state locking, but not enough runtime isolation for generated page behavior.
- Workers for Platforms as the only isolation layer: good isolation and mature dispatch model, but heavier lifecycle management for an MVP than Dynamic Workers if Dynamic Workers are available.

## Dependencies / Assumptions

- The Cloudflare account can use the chosen isolated runtime primitive: Dynamic Workers first, Workers for Platforms if needed.
- Expiration cleanup may combine active deletion at expiry with storage lifecycle rules for eventual physical cleanup.
- Completed flows are not immediately purged from all storage because the invoking agent still needs a reliable polling window.
- The public page is intentionally bearer-capability based for humans in the MVP; possession of the page URL grants view and submit permission until expiry or first submission.

## Outstanding Questions

### Resolve Before Planning

None.

### Deferred to Planning

- [Affects R12, R25][Technical] Confirm whether the target Cloudflare account has Dynamic Workers available, and choose Dynamic Workers or Workers for Platforms accordingly.
- [Affects R19][Technical] Decide whether MVP mirrors external materials into R2 or only renders external links with strict allowlist/CSP behavior.
- [Affects R23, R26][Product/Technical] Decide the default result retention window after submission if it differs from the expression expiration time.
- [Affects R17][Needs research] Define the future Welcome Mat / DPoP claim shape enough to avoid painting the MVP token model into a corner.
- [Affects R20][Technical] Choose the local test harness for Workers, Durable Objects, and isolated runtime behavior.

## Next Steps

-> /ce:plan for structured implementation planning.
