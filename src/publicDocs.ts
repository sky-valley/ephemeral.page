import { escapeHtml } from "./escape";
import { noStoreHeaders } from "./http";

const UPDATED_AT = "2026-05-09";
const HUMAN_PAGE_TITLE = "ephemeral.page - temporary pages for agent-to-human moments";
const HUMAN_PAGE_DESCRIPTION = "Agents create a small public page, ask a person for one focused response, capture it, and move on.";
const HUMAN_OG_ALT = "ephemeral.page turns one focused agent question into a temporary public web page for a human response.";

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
    { path: "/", changefreq: "weekly", priority: "0.9" },
    { path: "/llms.txt", changefreq: "weekly", priority: "0.6" },
    { path: "/llms-full.txt", changefreq: "weekly", priority: "0.6" },
    { path: "/openapi.json", changefreq: "weekly", priority: "0.5" },
    { path: "/.well-known/api-catalog", changefreq: "weekly", priority: "0.5" }
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

> ephemeral.page lets an agent create a temporary public web surface for one focused human interaction, then retrieve the result.

You are reading the agent home for this origin. Humans should use [${origin}/humans.html](${origin}/humans.html).

## What this service is

ephemeral.page is public ephemeral web UI as a service. It is for agents that can call HTTP and share a URL, including agents running headless, in chat, from a phone relay, or inside another system.

Use it when you need one atomic human interaction:

- ask one question
- collect one approval
- review one clip, image, document, or choice
- capture one focused piece of structured input
- give a human a small temporary page instead of forcing them into the agent chat

Do not use it for long-lived apps, multi-step workflows, secrets, payments, or anything that needs a user account.

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
  materials?: Array<{
    type: string;
    url: string;
    label?: string;
  }>;
  result?: {
    desired_shape?: string;
    callback_url?: string;
  };
  expires_in?: string;
};
\`\`\`

Guidance:

- \`intent\` should describe one focused human interaction.
- \`materials[].url\` must be \`https:\`.
- \`desired_shape\` is prose or a TypeScript-like hint for the composer, not server-side validation. The generated page decides which fields to show and the submitted \`result\` object is stored as-is.
- \`callback_url\` is optional. Polling is always available and remains authoritative.
- \`expires_in\` accepts compact durations such as \`10m\`, \`2h\`, or \`24h\`.

## Security and lifecycle rules

- Every expression has separate human and agent capabilities.
- The human page can only call \`window.ephemeral.submit(result)\`.
- The generated page does not receive result-read access, R2 access, Durable Object access, Queue access, AI access, cookies, or account credentials.
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

> Instant, one-off public web surfaces for agents that need one focused human interaction and a pollable result.

Start at the agent home unless you already know which artifact you need. The root URL is intentionally Markdown for agents. Humans are at /humans.html.

## Agent entrypoints

- [Agent home](${origin}/): Full cold-start instructions for creating a surface, protecting capability URLs, polling results, and offering a local skill only after first success.
- [Complete agent context](${origin}/llms-full.txt): Single-file reference for large-context agents.
- [OpenAPI](${origin}/openapi.json): Machine-readable API contract.
- [API catalog](${origin}/.well-known/api-catalog): RFC 9727 API discovery.

## Human context

- [Human page](${origin}/humans.html): Plain explanation of what ephemeral.page is and why it exists.
- [Human page as Markdown](${origin}/humans.md): Markdown version of the human page.

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

Optional body fields: \`materials\`, \`result.desired_shape\`, \`result.callback_url\`, \`expires_in\`.

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

ephemeral.page gives software agents a small public place to ask a person for one focused response.

An agent creates a temporary page, shares the page URL with a human, waits for one submission, and retrieves the result. The page expires. The interaction is intentionally small.

## Why it exists

Many agents do useful work outside a full app interface. They run in terminals, automations, background jobs, chat threads, SMS relays, or other systems where a human sometimes needs to answer one thing.

A chat message is not always the right surface. A full application is too much. A form builder asks the agent to design fields. ephemeral.page sits in the gap: the agent describes what it needs, and the service turns that need into a temporary web page.

## What it is good for

- approvals
- quick choices
- short reviews
- small structured answers
- media checks
- one-off confirmations

## What it is not

It is not a workflow engine, a persistent app host, or an account system. Each page is atomic: one question, one task, one approval, one review, one focused action.

## Current status

This is an early Cloudflare-only MVP. It uses capability URLs, Durable Objects, R2, Queues, and Workers AI. The public API is small: create a page, serve it, submit once, poll the result, expire and clean up.

Agent documentation is available at [${origin}/](${origin}/). Source code is at [github.com/sky-valley/ephemeral.page](https://github.com/sky-valley/ephemeral.page).
`;
}

function humanHtml(origin: string): string {
  const markdownUrl = `${origin}/humans.md`;
  const canonicalUrl = `${origin}/humans.html`;
  const agentUrl = `${origin}/`;
  const ogImageUrl = `${origin}/og-image.png`;
  const ogSquareImageUrl = `${origin}/og-square.png`;
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
  <meta property="og:image" content="${ogSquareImageUrl}" />
  <meta property="og:image:secure_url" content="${ogSquareImageUrl}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="1200" />
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
    <h1>Temporary pages for one human response.</h1>
    <p class="lede">An agent creates a small public page, asks a person for one focused interaction, captures the response, and retrieves the result. The page expires when the job is done.</p>

    <section>
      <h2>Why</h2>
      <p>Agents increasingly work outside full applications: in terminals, automations, chat relays, and background jobs. Sometimes they need a person to answer one thing. A chat message is too narrow. A permanent app is too much.</p>
      <p>ephemeral.page gives that moment a web surface.</p>
    </section>

    <section>
      <h2>Good for</h2>
      <ul>
        <li>approvals</li>
        <li>quick choices</li>
        <li>short reviews</li>
        <li>media checks</li>
        <li>small structured answers</li>
        <li>one-off confirmations</li>
      </ul>
    </section>

    <section>
      <h2>Boundary</h2>
      <p>Each page is atomic: one question, one task, one approval, one review, or one focused action. It is not a workflow engine or a persistent app host.</p>
    </section>

    <section>
      <h2>Status</h2>
      <p>This is an early Cloudflare-only MVP. Agents should start at <a href="${origin}/"><code>/</code></a>. Humans can read this page. Source is on <a href="https://github.com/sky-valley/ephemeral.page">GitHub</a>.</p>
    </section>

    <footer>Public by design. Temporary by default.</footer>
  </main>
</body>
</html>`;
}

function structuredDataJson(origin: string): string {
  return JSON.stringify({
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
  }).replaceAll("<", "\\u003c");
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
                callback_url: { type: "string", format: "uri" }
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
  const headers = noStoreHeaders(extra);
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
