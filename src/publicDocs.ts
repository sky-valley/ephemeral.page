import { escapeHtml } from "./escape";
import { noStoreHeaders } from "./http";

const UPDATED_AT = "2026-05-11";
const HUMAN_PAGE_TITLE = "ephemeral.page - temporary web expression for agents";
const HUMAN_PAGE_DESCRIPTION = "Agents make short-lived public pages to show, ask, collect, or play when chat is too small.";
const HUMAN_OG_ALT = "ephemeral.page gives agents temporary public web pages for one human moment.";
const OG_IMAGE_VERSION = "1c2f40cc";

interface SearchPage {
  path: string;
  title: string;
  description: string;
  heading: string;
  lede: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

const SEARCH_PAGES: SearchPage[] = [
  {
    path: "/what-is-ephemeral-page",
    title: "What is ephemeral.page? - temporary web pages for agents",
    description: "ephemeral.page lets an agent create a temporary public web page for one focused human response, then retrieve the result by API.",
    heading: "What is ephemeral.page?",
    lede: "ephemeral.page is a temporary web expression service for agents. It gives software a small public page when a person needs to answer one focused thing.",
    sections: [
      {
        heading: "The short version",
        body: [
          "An agent describes what it needs from a person. ephemeral.page turns that request into a temporary web page, returns a human-facing URL, accepts one submission, and gives the invoking agent a pollable result.",
          "The product is intentionally smaller than app generation and more flexible than a form builder. It is for one question, one approval, one review, one choice, or one small structured response."
        ]
      },
      {
        heading: "Why agents need this",
        body: [
          "Many agents run in terminals, automations, background jobs, chat relays, and headless workflows. Those agents sometimes need a human response, but the human should not have to join the agent runtime or install a specialized app.",
          "A temporary public page is a simple bridge: the agent shares a URL, the person answers, and the agent continues."
        ]
      }
    ],
    faqs: [
      {
        question: "Is ephemeral.page a form builder?",
        answer: "No. The agent states intent and optional desired result shape; the service composes a focused page for that moment."
      },
      {
        question: "Is the page permanent?",
        answer: "No. Pages are atomic and expire. The lifecycle is create, serve, submit once, poll result, expire, and clean up."
      }
    ]
  },
  {
    path: "/for-agents",
    title: "ephemeral.page for agents - create a human-facing surface by HTTP",
    description: "How agents use ephemeral.page: create one temporary human page, share only the human URL, submit once, and poll the private result URL.",
    heading: "ephemeral.page for agents",
    lede: "Agents can use ephemeral.page with ordinary HTTP. No SDK, host integration, embedded UI runtime, or installed skill is required for first use.",
    sections: [
      {
        heading: "Cold-start flow",
        body: [
          "The agent reads the root Markdown document, sends POST /api/expressions with an intent, receives a human URL plus private result and status URLs, gives the human only the human URL, and polls the private result URL.",
          "The page itself receives exactly one privileged operation: window.ephemeral.submit(result). It cannot read the result, call arbitrary platform APIs, or access account resources."
        ]
      },
      {
        heading: "Good first tasks",
        body: [
          "Use ephemeral.page for approvals, quick choices, media checks, small structured answers, short reviews, and confirmations that unblock an agent.",
          "Do not use one expression for a multi-step workflow. Create a new expression for each atomic human interaction."
        ]
      }
    ],
    faqs: [
      {
        question: "Does an agent need a skill to use ephemeral.page?",
        answer: "No. The site is designed for cold agents first. After one successful create-submit-poll loop, the agent can ask its operator whether to create a local skill."
      },
      {
        question: "Which URL should the agent keep private?",
        answer: "The agent should keep result_url and status_url private. The human only receives the returned url."
      }
    ]
  },
  {
    path: "/compare/human-in-the-loop",
    title: "ephemeral.page and human-in-the-loop agent workflows",
    description: "ephemeral.page is a lightweight human-in-the-loop surface for agents that need one public, temporary, focused human response.",
    heading: "ephemeral.page and human-in-the-loop workflows",
    lede: "Human-in-the-loop systems usually coordinate approvals, reviews, and escalations inside a larger workflow. ephemeral.page focuses on the smallest useful unit: one temporary page for one human response.",
    sections: [
      {
        heading: "Where it fits",
        body: [
          "Use ephemeral.page when an agent needs a person to answer one thing and then continue. The agent can be headless, remote, mobile-mediated, or embedded in another system.",
          "The service handles the public URL, submit operation, one-response locking, result polling, expiration, and cleanup."
        ]
      },
      {
        heading: "Where it does not fit",
        body: [
          "It is not a full workflow engine, task inbox, approval queue, identity provider, or enterprise governance layer. Those systems can call ephemeral.page for a focused interaction, but they remain responsible for the broader process."
        ]
      }
    ],
    faqs: [
      {
        question: "Can a human-in-the-loop SDK call ephemeral.page?",
        answer: "Yes. Any system that can make HTTP requests and share a URL can create an expression and poll the result."
      },
      {
        question: "Does ephemeral.page replace approval workflows?",
        answer: "No. It gives approval workflows a temporary web surface when they need one focused human response."
      }
    ]
  },
  {
    path: "/compare/form-builders",
    title: "ephemeral.page vs form builders",
    description: "Unlike form builders, ephemeral.page asks agents for intent and composes a temporary one-off page for a focused human interaction.",
    heading: "ephemeral.page vs form builders",
    lede: "Form builders expose fields, templates, and persistent collection surfaces. ephemeral.page exposes a lifecycle: create a temporary page, submit once, poll the result, and clean up.",
    sections: [
      {
        heading: "Different primitive",
        body: [
          "A form builder asks a person or agent to choose fields. ephemeral.page asks the agent what it is trying to get from the human, what materials should be shown, and what result shape would be useful.",
          "The generated page can use HTML, CSS, and JavaScript freely, but the platform gives it only one privileged backend operation: submit the result."
        ]
      },
      {
        heading: "When to use each",
        body: [
          "Use a form builder for reusable forms, surveys, intake flows, and ongoing data collection.",
          "Use ephemeral.page when an agent needs a temporary public surface for a single interaction that should disappear after it is done."
        ]
      }
    ],
    faqs: [
      {
        question: "Can agents define fields directly?",
        answer: "Agents can provide a desired result shape, but the service composes the focused page rather than exposing a form template API."
      },
      {
        question: "Can a page collect more than one response?",
        answer: "No. First valid submission wins. This keeps the interaction atomic and easy for agents to reason about."
      }
    ]
  },
  {
    path: "/compare/mcp-ui",
    title: "ephemeral.page vs MCP UI",
    description: "MCP UI is embedded UI for capable hosts. ephemeral.page is public ephemeral web UI for any agent that can call HTTP and share a URL.",
    heading: "ephemeral.page vs MCP UI",
    lede: "MCP UI and embedded agent UI are useful when the host can render trusted interface components. ephemeral.page is for public, shareable, temporary web surfaces outside the host.",
    sections: [
      {
        heading: "The key distinction",
        body: [
          "MCP UI is embedded UI for MCP-capable hosts. ephemeral.page is public ephemeral web UI as a service.",
          "An agent does not need to be inside a host that supports custom UI. It only needs HTTP access and a way to share the human URL."
        ]
      },
      {
        heading: "Later integration",
        body: [
          "MCP integration can wrap ephemeral.page later as a tool, but it is not the core product. The core product is the public lifecycle: create page, host page, submit result, poll the result, expire, and clean up."
        ]
      }
    ],
    faqs: [
      {
        question: "Is ephemeral.page embedded UI?",
        answer: "No. It creates public temporary pages rather than embedding UI inside an agent host."
      },
      {
        question: "Can MCP tools use ephemeral.page?",
        answer: "Yes. An MCP tool could create expressions and return human URLs, but any HTTP-capable agent can do the same."
      }
    ]
  }
];

export function publicOrigin(request: Request, configuredOrigin?: string): string {
  const requestOrigin = new URL(request.url).origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(requestOrigin)) {
    return requestOrigin;
  }
  return configuredOrigin || requestOrigin;
}

export function agentHomeResponse(origin: string): Response {
  return markdown(agentHome(origin), {
    headers: discoveryHeaders(origin, {
      "x-agent-home": "ephemeral.page"
    })
  });
}

export function humansResponse(request: Request, origin: string): Response {
  if (prefersMarkdown(request)) {
    return markdown(humanMarkdown(origin), { headers: discoveryHeaders(origin) });
  }
  return new Response(humanHtml(origin), {
    headers: discoveryHeaders(origin, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "content-security-policy": [
        "default-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
        "script-src 'unsafe-inline'",
        "style-src 'unsafe-inline'",
        "img-src 'self' data:"
      ].join("; ")
    })
  });
}

export function humansRedirectResponse(origin: string): Response {
  const headers = new Headers({
    "location": `${origin}/humans.html`,
    "cache-control": "public, max-age=3600",
    "link": `<${origin}/humans.html>; rel="canonical"`
  });
  return new Response(null, { status: 301, headers });
}

export function searchPageResponse(request: Request, origin: string, pathname: string): Response | null {
  const page = searchPageFor(pathname);
  if (!page) return null;
  if (prefersMarkdown(request)) {
    return markdown(searchPageMarkdown(origin, page), { headers: discoveryHeaders(origin) });
  }
  return new Response(searchPageHtml(origin, page), {
    headers: discoveryHeaders(origin, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "content-security-policy": [
        "default-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
        "script-src 'unsafe-inline'",
        "style-src 'unsafe-inline'",
        "img-src 'self' data:"
      ].join("; ")
    })
  });
}

export function llmsTxtResponse(origin: string): Response {
  return markdown(llmsTxt(origin), { headers: discoveryHeaders(origin) });
}

export function llmsFullResponse(origin: string): Response {
  return markdown(llmsFull(origin), { headers: discoveryHeaders(origin) });
}

export function openApiResponse(origin: string): Response {
  return jsonDocument(openApi(origin), {
    "content-type": "application/vnd.oai.openapi+json; charset=utf-8",
    "link": apiCatalogLink(origin)
  });
}

export function apiCatalogResponse(origin: string): Response {
  return jsonDocument(apiCatalog(origin), {
    "content-type": "application/linkset+json; charset=utf-8",
    "link": apiCatalogLink(origin)
  });
}

export function robotsResponse(origin: string): Response {
  return textDocument([
    "# ephemeral.page is intended to be readable by agents at inference time.",
    "# Please use /, /llms.txt, /llms-full.txt, and /.well-known/api-catalog before scraping HTML.",
    "# Search/retrieval crawlers are allowed. Training crawlers are disallowed where they expose distinct user agents.",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: Claude-SearchBot",
    "Allow: /",
    "",
    "User-agent: Claude-User",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Googlebot",
    "Allow: /",
    "",
    "User-agent: Bingbot",
    "Allow: /",
    "",
    "User-agent: Applebot",
    "Allow: /",
    "",
    "User-agent: DuckDuckBot",
    "Allow: /",
    "",
    "User-agent: Twitterbot",
    "Allow: /",
    "",
    "User-agent: LinkedInBot",
    "Allow: /",
    "",
    "User-agent: facebookexternalhit",
    "Allow: /",
    "",
    "User-agent: GPTBot",
    "Disallow: /",
    "",
    "User-agent: ClaudeBot",
    "Disallow: /",
    "",
    "User-agent: Google-Extended",
    "Disallow: /",
    "",
    "User-agent: CCBot",
    "Disallow: /",
    "",
    "User-agent: *",
    "Allow: /",
    "Allow: /humans.html",
    "Content-Signal: ai-train=no, search=yes, ai-input=yes",
    `Sitemap: ${origin}/sitemap.xml`,
    ""
  ].join("\n"));
}

export function sitemapResponse(origin: string): Response {
  const urls = [
    { path: "/humans.html", changefreq: "weekly", priority: "1.0" },
    ...SEARCH_PAGES.map((page) => ({ path: page.path, changefreq: "weekly", priority: "0.8" }))
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeXml(`${origin}${url.path}`)}</loc><lastmod>${UPDATED_AT}</lastmod><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`).join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: noStoreHeaders({
      "content-type": "application/xml; charset=utf-8"
    })
  });
}

function agentHome(origin: string): string {
  return `# ephemeral.page AGENTS.md

> ephemeral.page lets an agent create a temporary public web expression for one human moment, then retrieve the result.

You are reading the agent home for this origin. Humans should use [${origin}/humans.html](${origin}/humans.html).

## What this service is

ephemeral.page is web self-expression for agents: an HTTP API that turns an agent's intent into a short-lived public page.

Use it when chat is too small and the agent needs to show, ask, collect, or play in one temporary web surface:

- ask one question
- collect one approval
- compare options
- preview or review media
- show a finding or tiny report
- collect an acknowledgment
- capture one focused piece of structured input
- make a casual poll, invite, quiz, or choose-your-path page

Do not use it for long-lived apps, multi-step workflows, secrets, payments, or anything that needs a user account.

## Example prompts

Use these as representative intent shapes:

- Approval: "Create a temporary page for Maya to approve or reject this release plan. Show the summary first: ship the typography refresh today, keep the old billing screen unchanged, and monitor signups for 24 hours. Ask for approval, a risk level, and optional notes."
- Comparison: "Create a page that lets Jordan compare three names for a small prototype: Lantern, Thread, and Fieldnote. Show each name with a one-line feel, then ask Jordan to choose one and explain why."
- Report: "Create a concise one-page field report for Sam. The agent found that onboarding dropoff clusters around the first API key step. Show the finding, two likely causes, and one recommended next move. Ask Sam whether to investigate now or later."
- Media review: "Create a page for Riley to review this draft social preview image. Show the image, ask whether it feels clear and trustworthy at small preview size, and collect one suggested change."
- Acknowledgment: "Create a small acknowledgment page for Priya. Explain that the migration window is tonight from 9:00 PM to 9:30 PM Eastern, no customer action is required, and ask Priya to acknowledge that she saw it."
- Copy review: "Create a page for Leon to inspect a proposed homepage line: 'When chat is too small, make a page.' Ask him to mark it as keep, revise, or reject, and collect a sharper alternative if he has one."
- Casual poll: "Create a playful little page for three friends to pick dinner tonight. Options are noodles, tacos, or picnic snacks. Keep it light, ask for one vote and any strong veto."
- Tiny story: "Create a tiny choose-your-path page for a friend. The setup: a mysterious blue door appears in a quiet library. Offer three paths and ask which path they choose, plus one sentence about why."

## Security posture

ephemeral.page is built to reject unsafe work before a page is made. Create requests are checked before material mirroring or composition; generated output is checked again before it is served.

Current controls:

- separate human and agent capability URLs
- token hashes stored at rest, never plaintext capabilities
- public create requests rate-limited before material handling
- requests for secrets, logins, impersonation, dark patterns, or automatic submission rejected
- generated pages can call only \`window.ephemeral.submit(result)\`
- no result-read, R2, Durable Object, Workers AI, secret, cookie, storage, or account access in generated pages
- HTTPS-only materials mirrored to private R2 and served through expression-scoped routes
- strict CSP, \`no-store\`, \`no-referrer\`, \`nosniff\`, and frame denial on served pages
- callbacks disabled; agents poll private status/result URLs
- maximum lifetime is 24h, with cleanup after submit or expiry

## Fast path

Create an expression with \`POST /api/expressions\`.

\`\`\`sh
curl -s ${origin}/api/expressions \\
  -H "content-type: application/json" \\
  -d '{
    "intent": "Ask the operator what name to use for the release.",
    "result": {
      "desired_shape": "{ release_name: string, notes?: string }"
    },
    "expires_in": "30m"
  }'
\`\`\`

Response:

\`\`\`json
{
  "id": "expr_...",
  "url": "${origin}/e/expr_.../human_capability",
  "result_url": "${origin}/api/expressions/expr_.../result?token=agent_capability",
  "status_url": "${origin}/api/expressions/expr_.../status?token=agent_capability",
  "expires_at": "2026-05-09T19:30:00.000Z"
}
\`\`\`

Give the human only \`url\`. Keep \`result_url\` and \`status_url\` private because they include the agent capability.

The human URL has this structure:

\`\`\`text
${origin}/e/:id/:view_token
\`\`\`

The final path segment is the \`view_token\`. It is only for viewing and submitting the human page.

Poll the result:

\`\`\`sh
curl -s "RESULT_URL_FROM_CREATE_RESPONSE"
\`\`\`

Before the human responds, status is \`pending\`. After response, status is \`submitted\` and the flexible \`result\` object contains the submitted data. If the expression expires first, status is \`expired\`. After retention cleanup, status is \`gone\`.

Submitted result response:

\`\`\`json
{
  "id": "expr_...",
  "status": "submitted",
  "submitted_at": "2026-05-09T19:30:00.000Z",
  "result": {
    "codename": "river",
    "notes": "Short optional context"
  }
}
\`\`\`

## Headless human submission

The normal human path is to open \`url\` in a browser and let the generated page call:

\`\`\`js
await window.ephemeral.submit({ codename: "river" })
\`\`\`

If you are explicitly simulating the human in an evaluation, or proxying a human response from another channel, the equivalent HTTP call is:

\`\`\`sh
human_url="HUMAN_URL_FROM_CREATE_RESPONSE"
human_path="\${human_url#${origin}/e/}"
expr_id="\${human_path%%/*}"
view_token="\${human_path#*/}"

curl -s "${origin}/api/expressions/\${expr_id}/submit?token=\${view_token}" \\
  -H "content-type: application/json" \\
  -d '{"result":{"codename":"river","notes":"optional"}}'
\`\`\`

Only use the \`view_token\` from the human URL for submission. Never use or expose the agent result capability for human submission. The server stores the submitted \`result\` object as-is.

## Complete headless smoke

Use this when you are a headless agent proving that you understand the service before involving a real operator. It creates one expression, prints only the human URL, simulates the human submission with the human capability, then verifies the agent result capability.

\`\`\`sh
create_response=$(curl -s ${origin}/api/expressions \\
  -H "content-type: application/json" \\
  -d '{
    "intent": "Ask the operator: Which one-word codename should I use for a prototype?",
    "result": {
      "desired_shape": "{ codename: string, notes?: string }"
    },
    "expires_in": "10m"
  }')

human_url=$(printf '%s' "$create_response" | jq -r '.url')
result_url=$(printf '%s' "$create_response" | jq -r '.result_url')
printf 'human_url=%s\\n' "$human_url"

human_path="\${human_url#${origin}/e/}"
expr_id="\${human_path%%/*}"
view_token="\${human_path#*/}"

curl -s "${origin}/api/expressions/\${expr_id}/submit?token=\${view_token}" \\
  -H "content-type: application/json" \\
  -d '{"result":{"codename":"river","notes":"eval submission"}}' >/dev/null

curl -s "$result_url" | jq '{status, result}'
\`\`\`

Expected final output:

\`\`\`json
{
  "status": "submitted",
  "result": {
    "codename": "river",
    "notes": "eval submission"
  }
}
\`\`\`

## Request shape

\`\`\`ts
type CreateExpressionRequest = {
  intent: string;
  mode?: "interactive" | "preview";
  interactive?: boolean;
  materials?: Array<{
    type: string;
    url: string;
    label?: string;
  }>;
  result?: {
    desired_shape?: string;
  };
  expires_in?: string;
};
\`\`\`

Guidance:

- \`intent\` should describe one focused human interaction.
- Use \`mode: "preview"\` or \`interactive: false\` for already-written content that should render as a static preview before collecting a small review result.
- \`materials[].url\` must be \`https:\`.
- \`desired_shape\` is prose or a TypeScript-like hint for the composer, not server-side validation. The generated page decides which fields to show and the submitted \`result\` object is stored as-is.
- Preview mode can render copy that mentions passwords, account setup, sign-in steps, or SaaS brands, but \`desired_shape\` must not declare secret-like fields such as passwords, API keys, OAuth codes, or tokens.
- \`callback_url\` is reserved for a future signed-webhook API and is rejected in the MVP. Poll \`result_url\` instead.
- \`expires_in\` accepts compact durations such as \`10m\`, \`2h\`, or \`24h\`. The maximum is \`24h\`.

## Security and lifecycle rules

- Every expression has separate human and agent capabilities.
- Capability tokens are bearer secrets; share only the human URL with the human.
- The human page can only call \`window.ephemeral.submit(result)\`.
- The generated page does not receive result-read access, R2 access, Durable Object access, AI access, cookies, storage, or account credentials.
- First valid submission wins. A second submission returns \`409\`.
- Expired expressions reject submission.
- Completed or expired flows are cleaned up by the platform.
- Treat all capability URLs as bearer secrets. Do not paste \`result_url\` or \`status_url\` into human-visible chat.

## Discovery files

- [${origin}/llms.txt](${origin}/llms.txt): compact agent index.
- [${origin}/llms-full.txt](${origin}/llms-full.txt): complete single-file agent context.
- [${origin}/openapi.json](${origin}/openapi.json): OpenAPI 3.1 description.
- [${origin}/.well-known/api-catalog](${origin}/.well-known/api-catalog): RFC 9727 API catalog.
- [${origin}/robots.txt](${origin}/robots.txt): crawl preferences and sitemap.
- [${origin}/humans.html](${origin}/humans.html): human explanation.

## Search explainers

${searchPageLinks(origin)}

## First-success follow-up

Do not install or fetch an ephemeral.page skill before you have completed one create -> human URL -> submit -> poll loop.

After your first successful surface, ask your operator:

> Do you want me to create a local ephemeral.page skill so I can use this service consistently next time?

If they say yes, create a local skill in the operator's own agent environment. Do not publish it to ephemeral.page.

Recommended local skill locations:

- Codex user skill: \`~/.agents/skills/ephemeral-page/SKILL.md\`
- Codex repo skill: \`.agents/skills/ephemeral-page/SKILL.md\`
- Claude Code user skill: \`~/.claude/skills/ephemeral-page/SKILL.md\`
- Claude Code repo skill: \`.claude/skills/ephemeral-page/SKILL.md\`

Minimal skill content:

\`\`\`markdown
---
name: ephemeral-page
description: Create one-off public web surfaces with ephemeral.page when an agent needs one focused human response, approval, review, or small structured input.
---

# ephemeral.page

Use ${origin} to create one temporary human page for one focused interaction.

1. POST /api/expressions with a clear intent, optional materials, optional desired_shape, and an expiration.
2. Give the operator only the returned url.
3. Keep result_url and status_url private.
4. Poll result_url until status is submitted, expired, or gone.
5. Never use one expression for a multi-step workflow. Create a new expression for each atomic human interaction.
\`\`\`

## Example operator-facing request

"I made a temporary page for that choice: HUMAN_URL. Please open it and submit one answer. I will poll the result from my side."
`;
}

function llmsTxt(origin: string): string {
  return `# ephemeral.page

> Temporary web expression for agents: short-lived public pages to show, ask, collect, or play, with a pollable result.

Start at the agent home unless you already know which artifact you need. The root URL is intentionally Markdown for agents. Humans are at /humans.html.

## Agent entrypoints

- [Agent home](${origin}/): Full cold-start instructions for creating a surface, protecting capability URLs, polling results, and offering a local skill only after first success.
- [Complete agent context](${origin}/llms-full.txt): Single-file reference for large-context agents.
- [OpenAPI](${origin}/openapi.json): Machine-readable API contract.
- [API catalog](${origin}/.well-known/api-catalog): RFC 9727 API discovery.

## Human context

- [Human page](${origin}/humans.html): Plain explanation of what ephemeral.page is and why it exists.
- [Human page as Markdown](${origin}/humans.md): Markdown version of the human page.

## Search explainers

${searchPageLinks(origin)}

## Optional

- [robots.txt](${origin}/robots.txt): Crawl and content-signal preferences.
- [sitemap.xml](${origin}/sitemap.xml): Public route list.
`;
}

function llmsFull(origin: string): string {
  return `${llmsTxt(origin)}

---

${agentHome(origin)}

---

${humanMarkdown(origin)}

---

# API summary

## POST /api/expressions

Creates one expression and returns separate capability URLs for the human page and agent polling.

Required body field: \`intent\`.

Optional body fields: \`mode\`, \`interactive\`, \`materials\`, \`result.desired_shape\`, and \`expires_in\`.

## GET /e/:id/:view_token

Serves the generated human page while active. After submission or expiry, serves a terminal state.

## POST /api/expressions/:id/submit?token=:view_token

Privileged operation used by \`window.ephemeral.submit(result)\` on the generated page. Only the first valid submission is accepted.

## GET /api/expressions/:id/result?token=:agent_token

Polls the result. Keep this URL private.

## GET /api/expressions/:id/status?token=:agent_token

Polls lifecycle status without the flexible result payload.
`;
}

function humanMarkdown(origin: string): string {
  return `# ephemeral.page

ephemeral.page gives agents a temporary public page when chat is too small.

An agent can show a finding, ask a question, compare options, preview media, collect an acknowledgment, or make a casual little page for one moment. The human responds once. The agent retrieves the result. The page expires.

## Why it exists

Many agents do useful work outside a full app interface. They run in terminals, automations, background jobs, chat threads, SMS relays, or other systems where a message is sometimes too small.

A full application is too much. A form builder asks the agent to design fields. ephemeral.page sits in the gap: the agent describes the moment, and the service turns it into a temporary web page.

## What it is good for

- approvals
- quick choices
- tiny reports
- short reviews
- media checks
- acknowledgments
- casual polls
- one-off confirmations

## What it is not

It is not a workflow engine, a persistent app host, a dashboard, or a reusable form system. Each page is atomic: one moment, one page, one response.

## Security posture

ephemeral.page is designed to say no early. Requests for secrets, logins, impersonation, dark patterns, or automatic submission are rejected before a page is made.

Each page can submit one response and nothing else. It does not receive account credentials, result access, cookies, browser storage, or privileged platform bindings.

Human and agent links are separate capabilities. Pages expire within 24 hours, and completed flows close immediately.

## Read next

${searchPageLinks(origin)}

## Current status

Agents should start at [${origin}/](${origin}/). Source code is at [github.com/sky-valley/ephemeral.page](https://github.com/sky-valley/ephemeral.page).
`;
}

function humanHtml(origin: string): string {
  const markdownUrl = `${origin}/humans.md`;
  const canonicalUrl = `${origin}/humans.html`;
  const agentUrl = `${origin}/`;
  const ogImageUrl = socialImageUrl(origin);
  return `<!doctype html>
<!-- AGENT: This is the human page. Prefer ${origin}/ for agent instructions, or request ${markdownUrl}. -->
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(HUMAN_PAGE_TITLE)}</title>
  <meta name="description" content="${escapeHtml(HUMAN_PAGE_DESCRIPTION)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="application-name" content="ephemeral.page" />
  <meta name="theme-color" content="#f8f7f1" />
  <meta name="keywords" content="ephemeral.page, agent UI, human in the loop, temporary web pages, agent workflows, public web surfaces" />
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="alternate" type="text/markdown" href="${markdownUrl}" />
  <link rel="alternate" type="text/markdown" href="${agentUrl}" title="Agent home" />
  <link rel="image_src" href="${ogImageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="ephemeral.page" />
  <meta property="og:title" content="${escapeHtml(HUMAN_PAGE_TITLE)}" />
  <meta property="og:description" content="${escapeHtml(HUMAN_PAGE_DESCRIPTION)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:secure_url" content="${ogImageUrl}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(HUMAN_OG_ALT)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(HUMAN_PAGE_TITLE)}" />
  <meta name="twitter:description" content="${escapeHtml(HUMAN_PAGE_DESCRIPTION)}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  <meta name="twitter:image:alt" content="${escapeHtml(HUMAN_OG_ALT)}" />
  <script type="application/ld+json">${structuredDataJson(origin)}</script>
  <style>
    :root {
      color-scheme: light;
      font-family: Charter, "Iowan Old Style", "Bitstream Charter", Georgia, serif;
      background: #f8f7f1;
      color: #181a17;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; }
    main { width: min(760px, calc(100% - 32px)); margin: 0 auto; padding: 72px 0 88px; }
    .mark { font: 700 0.78rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0; color: #28645a; margin: 0 0 56px; }
    h1 { font-size: clamp(2.35rem, 8vw, 5.7rem); line-height: 0.95; letter-spacing: 0; margin: 0 0 28px; max-width: 720px; }
    .lede { font-size: clamp(1.18rem, 2.3vw, 1.55rem); line-height: 1.45; margin: 0 0 56px; max-width: 680px; }
    section { border-top: 1px solid #d8d4c9; padding: 30px 0 0; margin-top: 30px; }
    h2 { font: 700 0.82rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; letter-spacing: 0; color: #28645a; margin: 0 0 14px; }
    p, li { font-size: 1.05rem; line-height: 1.65; }
    p { margin: 0 0 16px; }
    ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 28px; padding-left: 20px; margin: 0 0 6px; }
    a { color: #174f82; text-underline-offset: 0.18em; }
    code { font: 0.95em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: #ece8dc; padding: 0.08rem 0.28rem; border-radius: 4px; }
    footer { margin-top: 48px; color: #5a5d55; font-size: 0.95rem; }
    @media (max-width: 620px) {
      main { padding-top: 44px; }
      .mark { margin-bottom: 36px; }
      ul { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <p class="mark">ephemeral.page</p>
    <h1>Agents making little pages for people.</h1>
    <p class="lede">When chat is too small, an agent can make a temporary public page to show, ask, collect, or play. One page, one moment, one response, then it closes.</p>

    <section>
      <h2>Why</h2>
      <p>Agents increasingly work outside full applications: in terminals, automations, chat relays, and background jobs. Sometimes a message is too narrow and a permanent app is too much.</p>
      <p>ephemeral.page gives that moment a temporary web surface.</p>
    </section>

    <section>
      <h2>Good for</h2>
      <ul>
        <li>approvals</li>
        <li>quick choices</li>
        <li>tiny reports</li>
        <li>short reviews</li>
        <li>media checks</li>
        <li>acknowledgments</li>
        <li>casual polls</li>
        <li>one-off confirmations</li>
      </ul>
    </section>

    <section>
      <h2>Boundary</h2>
      <p>Each page is atomic: one moment, one page, one response. It is not a workflow engine, a dashboard, a persistent app host, or a reusable form system.</p>
    </section>

    <section>
      <h2>Trust</h2>
      <ul>
        <li>unsafe requests are rejected before page creation</li>
        <li>generated pages can only submit one response</li>
        <li>human and agent links are separate capabilities</li>
        <li>agent result links stay private</li>
        <li>pages expire within 24 hours</li>
        <li>completed flows close immediately</li>
      </ul>
    </section>

    <section>
      <h2>Read next</h2>
      <ul>
        ${SEARCH_PAGES.map((page) => `<li><a href="${origin}${page.path}">${escapeHtml(page.heading)}</a></li>`).join("\n        ")}
      </ul>
    </section>

    <section>
      <h2>For agents</h2>
      <p>Agents should start at <a href="${origin}/"><code>/</code></a> for the API contract and discovery files. Source is on <a href="https://github.com/sky-valley/ephemeral.page">GitHub</a>.</p>
    </section>

    <footer>When chat is too small, make a page.</footer>
  </main>
</body>
</html>`;
}

function searchPageFor(pathname: string): SearchPage | undefined {
  return SEARCH_PAGES.find((page) => page.path === pathname);
}

function searchPageLinks(origin: string): string {
  return SEARCH_PAGES.map((page) => `- [${page.heading}](${origin}${page.path}): ${page.description}`).join("\n");
}

function searchPageMarkdown(origin: string, page: SearchPage): string {
  return `# ${page.heading}

${page.lede}

${page.sections.map((section) => `## ${section.heading}

${section.body.join("\n\n")}`).join("\n\n")}

## Common questions

${page.faqs.map((faq) => `### ${faq.question}

${faq.answer}`).join("\n\n")}

## Use ephemeral.page

- Agent home: [${origin}/](${origin}/)
- Human overview: [${origin}/humans.html](${origin}/humans.html)
- API: [${origin}/openapi.json](${origin}/openapi.json)
`;
}

function searchPageHtml(origin: string, page: SearchPage): string {
  const canonicalUrl = `${origin}${page.path}`;
  const ogImageUrl = socialImageUrl(origin);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="alternate" type="text/markdown" href="${canonicalUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="ephemeral.page" />
  <meta property="og:title" content="${escapeHtml(page.title)}" />
  <meta property="og:description" content="${escapeHtml(page.description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(HUMAN_OG_ALT)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(page.title)}" />
  <meta name="twitter:description" content="${escapeHtml(page.description)}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  <script type="application/ld+json">${searchPageStructuredDataJson(origin, page)}</script>
  <style>
    :root { color-scheme: light; font-family: Charter, "Iowan Old Style", "Bitstream Charter", Georgia, serif; background: #f8f7f1; color: #181a17; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(780px, calc(100% - 32px)); margin: 0 auto; padding: 64px 0 84px; }
    .mark { font: 700 0.78rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0; color: #28645a; margin: 0 0 48px; }
    h1 { font-size: clamp(2.2rem, 7vw, 4.8rem); line-height: 0.97; letter-spacing: 0; margin: 0 0 22px; }
    .lede { font-size: clamp(1.14rem, 2vw, 1.45rem); line-height: 1.5; margin: 0 0 44px; }
    section { border-top: 1px solid #d8d4c9; padding-top: 28px; margin-top: 28px; }
    h2 { font: 700 0.82rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; letter-spacing: 0; color: #28645a; margin: 0 0 14px; }
    h3 { font-size: 1.24rem; line-height: 1.25; margin: 22px 0 8px; }
    p, li { font-size: 1.05rem; line-height: 1.65; }
    p { margin: 0 0 16px; }
    ul { padding-left: 20px; }
    a { color: #174f82; text-underline-offset: 0.18em; }
    nav { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 36px; font: 0.95rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
</head>
<body>
  <main>
    <p class="mark">ephemeral.page</p>
    <h1>${escapeHtml(page.heading)}</h1>
    <p class="lede">${escapeHtml(page.lede)}</p>
    ${page.sections.map((section) => `<section><h2>${escapeHtml(section.heading)}</h2>${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("\n    ")}
    <section>
      <h2>Common questions</h2>
      ${page.faqs.map((faq) => `<h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p>`).join("\n      ")}
    </section>
    <nav aria-label="Related pages">
      <a href="${origin}/humans.html">Human overview</a>
      <a href="${origin}/">Agent home</a>
      <a href="${origin}/openapi.json">OpenAPI</a>
      ${SEARCH_PAGES.filter((candidate) => candidate.path !== page.path).map((candidate) => `<a href="${origin}${candidate.path}">${escapeHtml(candidate.heading)}</a>`).join("\n      ")}
    </nav>
  </main>
</body>
</html>`;
}

function searchPageStructuredDataJson(origin: string, page: SearchPage): string {
  return JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      headline: page.heading,
      url: `${origin}${page.path}`,
      description: page.description,
      isPartOf: {
        "@type": "WebSite",
        name: "ephemeral.page",
        url: origin
      },
      about: {
        "@type": "SoftwareApplication",
        name: "ephemeral.page",
        applicationCategory: "DeveloperApplication"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer
        }
      }))
    }
  ]).replaceAll("<", "\\u003c");
}

function socialImageUrl(origin: string): string {
  return `${origin}/og-image.png?v=${OG_IMAGE_VERSION}`;
}

function structuredDataJson(origin: string): string {
  return JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Sky Valley",
      url: "https://github.com/sky-valley"
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ephemeral.page",
      url: origin,
      description: HUMAN_PAGE_DESCRIPTION
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ephemeral.page",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: `${origin}/humans.html`,
      description: HUMAN_PAGE_DESCRIPTION,
      creator: {
        "@type": "Organization",
        name: "Sky Valley"
      },
      codeRepository: "https://github.com/sky-valley/ephemeral.page",
      softwareHelp: {
        "@type": "CreativeWork",
        name: "ephemeral.page agent home",
        url: origin
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock"
      }
    }
  ]).replaceAll("<", "\\u003c");
}

function openApi(origin: string): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "ephemeral.page API",
      version: "0.1.0",
      description: "Create one-off public web surfaces for focused human input, then retrieve the result."
    },
    servers: [{ url: origin }],
    paths: {
      "/api/expressions": {
        post: {
          operationId: "createExpression",
          summary: "Create an expression",
          description: "Creates one temporary human page and returns separate human and agent capability URLs.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateExpressionRequest" }
              }
            }
          },
          responses: {
            "201": {
              description: "Created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateExpressionResponse" }
                }
              }
            }
          }
        }
      },
      "/e/{id}/{view_token}": {
        get: {
          operationId: "viewExpression",
          summary: "Serve the generated human page",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "view_token", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            "200": { description: "Generated HTML page or terminal state" },
            "404": { description: "Unknown expression or capability" }
          }
        }
      },
      "/api/expressions/{id}/submit": {
        post: {
          operationId: "submitExpressionResult",
          summary: "Submit the first human response",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "token", in: "query", required: true, schema: { type: "string" } }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["result"],
                  properties: { result: true }
                }
              }
            }
          },
          responses: {
            "200": { description: "Submitted" },
            "409": { description: "Expression already submitted" },
            "410": { description: "Expression expired or purged" }
          }
        }
      },
      "/api/expressions/{id}/result": {
        get: {
          operationId: "getExpressionResult",
          summary: "Poll the result",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "token", in: "query", required: false, schema: { type: "string" } }
          ],
          security: [{ bearerCapability: [] }],
          responses: {
            "200": {
              description: "Result envelope",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ResultEnvelope" }
                }
              }
            },
            "404": { description: "Unknown expression or capability" }
          }
        }
      },
      "/api/expressions/{id}/status": {
        get: {
          operationId: "getExpressionStatus",
          summary: "Poll lifecycle status",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "token", in: "query", required: false, schema: { type: "string" } }
          ],
          security: [{ bearerCapability: [] }],
          responses: {
            "200": {
              description: "Status envelope",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/StatusEnvelope" }
                }
              }
            },
            "404": { description: "Unknown expression or capability" }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerCapability: {
          type: "http",
          scheme: "bearer",
          description: "Agent capability token. The same token may also be supplied as the token query parameter."
        }
      },
      schemas: {
        CreateExpressionRequest: {
          type: "object",
          required: ["intent"],
          properties: {
            intent: { type: "string" },
            mode: {
              type: "string",
              enum: ["interactive", "preview"],
              description: "Set to preview for static, non-interactive content previews that only collect the declared result shape."
            },
            interactive: {
              type: "boolean",
              description: "Set false as a compatibility alias for mode: preview."
            },
            materials: {
              type: "array",
              items: {
                type: "object",
                required: ["type", "url"],
                properties: {
                  type: { type: "string" },
                  url: { type: "string", format: "uri" },
                  label: { type: "string" }
                }
              }
            },
            result: {
              type: "object",
              properties: {
                desired_shape: { type: "string" },
                callback_url: {
                  type: "string",
                  deprecated: true,
                  description: "Reserved for a future signed-webhook API. The MVP rejects this field; poll result_url instead."
                }
              }
            },
            expires_in: { type: "string", examples: ["30m", "2h", "24h"] }
          }
        },
        CreateExpressionResponse: {
          type: "object",
          required: ["id", "url", "result_url", "status_url", "expires_at"],
          properties: {
            id: { type: "string" },
            url: { type: "string", format: "uri" },
            result_url: { type: "string", format: "uri" },
            status_url: { type: "string", format: "uri" },
            expires_at: { type: "string", format: "date-time" }
          }
        },
        ResultEnvelope: {
          type: "object",
          required: ["id", "status", "expires_at"],
          properties: {
            id: { type: "string" },
            status: { enum: ["pending", "submitted", "expired", "gone"] },
            submitted_at: { type: "string", format: "date-time" },
            expires_at: { type: "string", format: "date-time" },
            result: true
          }
        },
        StatusEnvelope: {
          type: "object",
          required: ["id", "status", "expires_at"],
          properties: {
            id: { type: "string" },
            status: { enum: ["active", "submitted", "expired", "gone"] },
            submitted_at: { type: "string", format: "date-time" },
            expires_at: { type: "string", format: "date-time" }
          }
        }
      }
    }
  };
}

function apiCatalog(origin: string): Record<string, unknown> {
  return {
    linkset: [
      {
        anchor: `${origin}/.well-known/api-catalog`,
        item: [
          {
            href: `${origin}/openapi.json`,
            type: "application/vnd.oai.openapi+json",
            title: "ephemeral.page OpenAPI",
            description: "OpenAPI 3.1 contract for creating expressions, submitting results, and polling lifecycle state."
          }
        ],
        describedby: [
          {
            href: `${origin}/`,
            type: "text/markdown",
            title: "Agent home"
          },
          {
            href: `${origin}/humans.html`,
            type: "text/html",
            title: "Human overview"
          }
        ],
        "api-catalog": [
          {
            href: `${origin}/.well-known/api-catalog`,
            type: "application/linkset+json"
          }
        ]
      }
    ]
  };
}

function discoveryHeaders(origin: string, extra?: HeadersInit): Headers {
  const requestedCacheControl = new Headers(extra).get("cache-control");
  const headers = noStoreHeaders(extra);
  if (requestedCacheControl) {
    headers.set("cache-control", requestedCacheControl);
  }
  headers.set("x-robots-tag", "index, follow, max-image-preview:large");
  headers.set("link", [
    `<${origin}/llms.txt>; rel="alternate"; type="text/markdown"; title="llms.txt"`,
    `<${origin}/llms-full.txt>; rel="alternate"; type="text/markdown"; title="llms-full.txt"`,
    `<${origin}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
    `<${origin}/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"`,
    `<${origin}/humans.html>; rel="alternate"; type="text/html"; title="Human page"`
  ].join(", "));
  return headers;
}

function apiCatalogLink(origin: string): string {
  return `<${origin}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`;
}

function markdown(body: string, init: ResponseInit = {}): Response {
  const headers = noStoreHeaders(init.headers);
  headers.set("content-type", "text/markdown; charset=utf-8");
  headers.set("cache-control", "public, max-age=300");
  return new Response(body, { ...init, headers });
}

function jsonDocument(data: unknown, headersInit: HeadersInit): Response {
  const headers = noStoreHeaders(headersInit);
  headers.set("cache-control", "public, max-age=300");
  return new Response(JSON.stringify(data, null, 2), { headers });
}

function textDocument(body: string): Response {
  return new Response(body, {
    headers: noStoreHeaders({
      "content-type": "text/plain; charset=utf-8"
    })
  });
}

function prefersMarkdown(request: Request): boolean {
  return (request.headers.get("accept") ?? "").toLowerCase().includes("text/markdown");
}

function escapeXml(value: string): string {
  return escapeHtml(value).replaceAll("'", "&apos;");
}
