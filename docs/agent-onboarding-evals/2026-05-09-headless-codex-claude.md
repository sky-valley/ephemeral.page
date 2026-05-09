# Headless Agent Onboarding Evaluation

Date: 2026-05-09

Target: `http://localhost:8790`

Purpose: verify that cold, headless agents can learn ephemeral.page from the public site root, create one surface, simulate the human submission path, poll the agent result, and understand the local-skill follow-up rule.

## Agents

- Codex CLI: `codex-cli 0.128.0`
- Claude Code: `claude 2.1.132`

Both agents were run without repository context from `/tmp` and were pointed only at the site root.

## Method

Each evaluator received the same task shape:

1. Start at `http://localhost:8790/`.
2. Learn how to create a surface from the public docs.
3. Create an expression asking for a one-word codename.
4. Treat the returned human URL as shareable and keep result/status capability URLs private.
5. Simulate a human submission only through the human capability from the human URL.
6. Poll the result and verify `status: submitted`.
7. Answer interview questions in the same context as the onboarding attempt.

Human URLs and agent capability URLs are redacted in this note because they are bearer capabilities.

## Codex Pass 1

Result: passed after recovering from a shell variable mistake.

Codex successfully:

- read the root Markdown agent home
- created an expression
- inspected the generated page
- submitted `{"codename":"river","notes":"eval submission"}` through the human capability
- polled the agent result URL and verified `status: submitted`

Feedback:

- Add a direct headless submission example.
- Clarify that `desired_shape` is advisory and not server-side validation.
- Show response shapes without encouraging agents to expose capability URLs.

Changes made after this pass:

- Added the `Headless human submission` section.
- Added explicit language that `desired_shape` is a composer hint and the submitted `result` is stored as-is.
- Strengthened private capability handling language.

## Claude Pass

Result: passed.

Claude successfully:

- read `http://localhost:8790/`
- created an expression from the documented API
- extracted `expr_id` and `view_token` from the human URL
- submitted via `POST /api/expressions/:id/submit?token=:view_token`
- polled the private result URL and verified `status: submitted`

Interview summary:

- First useful artifact was the root agent home.
- The capability split was clear.
- The weakest point was that the docs should explicitly call the final human URL path segment the `view_token`.
- The agent understood that no skill should be installed before first successful use.

Changes made after this pass:

- Added the human URL structure.
- Added explicit `view_token` wording.
- Added a shell-safe extraction snippet.

## Codex Pass 2

Result: passed.

Codex successfully:

- read only the root docs
- created a fresh expression
- submitted through the human capability
- polled the private result URL
- verified `{"status":"submitted","result":{"codename":"river","notes":"eval submission"}}`

Interview summary:

- No remaining ambiguity blocked the loop.
- The first-success skill follow-up rule was understood.
- The remaining improvement request was a single copy-paste smoke script that performs create, extract, submit, and poll.

Changes made after this pass:

- Added the `Complete headless smoke` section to the agent home.

## Current Pass Condition

Passed locally. Both Codex and Claude can arrive cold at `/`, create a surface, keep agent capabilities private, simulate or proxy a human response through the human capability, poll the result, and understand that local skill creation is an operator choice after first success.

## Follow-Up Ideas

- Repeat this evaluation against the deployed workers.dev origin after every public-doc change.
- Add a very small `npm run smoke:agent-docs` script if the public contract starts changing often.
- When custom-domain auth is added, rerun this test with the future Welcome Mat / DPoP result capability story.
