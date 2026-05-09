# Agent Readiness Research

Last reviewed: 2026-05-09

This note records the research and product hypothesis behind the agent-first public surface for ephemeral.page.

## Goal

An agent should be able to arrive cold at the site, understand the service, create one temporary human surface, hand the human URL to its operator, and poll the result without needing a prior SDK, MCP server, or installed skill.

Humans should have a separate, simple explanation at `/humans.html`.

## Current Signals From The Web

### AGENTS.md

`AGENTS.md` is now a recognizable Markdown format for agent instructions. The public `agents.md` site describes it as a README for agents: a predictable place for build steps, conventions, and context that would clutter human docs. OpenAI Codex documents that Codex reads `AGENTS.md` files before work and layers global and project files by proximity.

Decision for ephemeral.page: use the root URL as an AGENTS.md-style document because the product itself is an agent service, not only a source repository.

Sources:

- https://agents.md/
- https://developers.openai.com/codex/guides/agents-md

### llms.txt and llms-full.txt

`/llms.txt` is a proposed root Markdown index for LLMs at inference time. The spec recommends an H1, a blockquote summary, and H2 sections with concise links and descriptions. The emerging `llms-full.txt` convention gives a single-file full context for large-context agents or RAG.

Decision for ephemeral.page: publish both. Keep `/llms.txt` compact and make `/llms-full.txt` complete enough for a cold agent to act without following many links.

Sources:

- https://llmstxt.org/
- https://docs.x.com/tools/llms-txt
- https://developers.cloudflare.com/docs-for-agents/

### Markdown Over HTML

Cloudflare's "Docs for agents" guidance says agents work better with Markdown than HTML because Markdown has less token overhead. Cloudflare serves Markdown via `Accept: text/markdown` and `/index.md` fallbacks, and uses hidden HTML directives that tell agents to request Markdown.

Decision for ephemeral.page: serve Markdown at `/`, `/AGENTS.md`, `/agents.md`, `/index.md`, `/llms.txt`, and `/llms-full.txt`. Serve `/humans.html` for humans, but return Markdown from `/humans.html` when the request asks for `Accept: text/markdown`.

Sources:

- https://developers.cloudflare.com/docs-for-agents/
- https://blog.cloudflare.com/agent-readiness/

### Discoverability, Bot Access, Capabilities

Cloudflare's agent readiness framing checks four broad areas: discoverability, content accessibility, bot access control, and capabilities. The specific patterns worth adopting now are:

- `robots.txt` plus `Sitemap`
- `Content-Signal` usage preferences
- HTTP `Link` headers for agent resources
- `/.well-known/api-catalog` for API discovery
- OpenAPI for machine-readable API shape

Decision for ephemeral.page: publish `robots.txt`, `sitemap.xml`, `openapi.json`, and `/.well-known/api-catalog`; include `Link` headers from the primary docs and discovery responses.

Sources:

- https://blog.cloudflare.com/agent-readiness/
- https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
- https://www.rfc-editor.org/rfc/rfc9727.html

### Agent Skills

Agent Skills use progressive disclosure: agents discover a name and description, then load `SKILL.md` only when relevant. Codex and Claude both support local skills, but with different user and project locations.

However, the product direction for this iteration is explicit: do not serve ephemeral.page as a skill from the site. The first-use path should be pure web plus HTTP. After an agent completes its first surface, it should ask the operator whether to create a local skill in that operator's own environment.

Decision for ephemeral.page: document the local skill follow-up inside the agent root, but do not publish `/.well-known/agent-skills/index.json` yet.

Sources:

- https://agentskills.io/
- https://developers.openai.com/codex/skills
- https://docs.claude.com/en/docs/claude-code/skills
- https://github.com/cloudflare/agent-skills-discovery-rfc

## Hypothesis

The most agent-native public surface for this MVP is not a landing page. It is a small protocol stack:

- `/`: AGENTS.md-style cold-start instructions.
- `/humans.html`: human-readable explanation.
- `/llms.txt`: compact map.
- `/llms-full.txt`: complete context.
- `/openapi.json`: machine-readable API contract.
- `/.well-known/api-catalog`: RFC 9727 discovery.
- `/robots.txt`: crawl and content-signal preferences.
- `/sitemap.xml`: route discovery.

This lets unspecialized agents succeed with ordinary fetch/curl tools, while preserving the product boundary that a local skill is an optional operator decision after first success.

## Evaluation Plan

Test two headless agents in fresh non-interactive runs:

1. Point the agent only at the site root.
2. Ask it to learn how to create a surface.
3. Ask it to create a test expression, keep the agent capability private, simulate a human submission, and poll the result.
4. In the same context, ask interview questions:
   - What did you read first?
   - Was anything ambiguous?
   - What would you need for real operator use?
   - Did you understand not to install a skill until after first success?
   - What should change in the docs?

Pass condition: both Codex and Claude can create an expression from the site instructions and can explain the private/human capability split.
