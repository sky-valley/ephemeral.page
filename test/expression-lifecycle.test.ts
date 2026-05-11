import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { classifyComposition, classifyCreateRequest } from "../src/policy";
import type { CreateExpressionResponse, ResultEnvelope } from "../src/types";

const ORIGIN = "http://localhost:8787";

describe("expression lifecycle", () => {
  it("serves an agent-first Markdown home at the root", async () => {
    const response = await SELF.fetch(`${ORIGIN}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("link")).toContain("/.well-known/api-catalog");
    expect(response.headers.get("x-robots-tag")).toContain("index, follow");
    expect(body).toContain("# ephemeral.page AGENTS.md");
    expect(body).toContain("Humans should use");
    expect(body).toContain("POST /api/expressions");
    expect(body).toContain("Headless human submission");
    expect(body).toContain("Complete headless smoke");
    expect(body).toContain("## Example prompts");
    expect(body).toContain("When chat is too small");
    expect(body).toContain("## Security posture");
    expect(body).toContain("generated output is checked again before it is served");
    expect(body).toContain("The final path segment is the `view_token`");
    expect(body).toContain("not server-side validation");
    expect(body).toContain("After your first successful surface");
  });

  it("serves agent discovery documents", async () => {
    const llms = await SELF.fetch(`${ORIGIN}/llms.txt`);
    const llmsBody = await llms.text();
    const full = await SELF.fetch(`${ORIGIN}/llms-full.txt`);
    const fullBody = await full.text();

    expect(llms.status).toBe(200);
    expect(llms.headers.get("content-type")).toContain("text/markdown");
    expect(llmsBody).toContain("# ephemeral.page");
    expect(llmsBody).toContain("[OpenAPI]");
    expect(llmsBody).toContain("[What is ephemeral.page?]");
    expect(llmsBody).toContain("[ephemeral.page vs MCP UI]");
    expect(fullBody).toContain("# ephemeral.page AGENTS.md");
    expect(fullBody).toContain("# API summary");
  });

  it("serves the human page separately from the agent home", async () => {
    const html = await SELF.fetch(`${ORIGIN}/humans.html`);
    const htmlBody = await html.text();
    const markdown = await SELF.fetch(`${ORIGIN}/humans.html`, {
      headers: { accept: "text/markdown" }
    });
    const markdownBody = await markdown.text();

    expect(html.status).toBe(200);
    expect(html.headers.get("content-type")).toContain("text/html");
    expect(html.headers.get("cache-control")).toBe("public, max-age=300");
    expect(htmlBody).toContain("Agents making little pages for people.");
    expect(htmlBody).toContain("<h2>Trust</h2>");
    expect(htmlBody).toContain("unsafe requests are rejected before page creation");
    expect(htmlBody).toContain("<title>ephemeral.page - temporary web expression for agents</title>");
    expect(htmlBody).toContain('property="og:title"');
    expect(htmlBody).toContain(`${ORIGIN}/og-image.png`);
    expect(htmlBody).toContain('property="og:image:type" content="image/png"');
    expect(htmlBody).toContain('name="twitter:card" content="summary_large_image"');
    expect(htmlBody).toContain('type="application/ld+json"');
    expect(htmlBody).toContain('"@type":"SoftwareApplication"');
    expect(htmlBody).not.toContain("# ephemeral.page AGENTS.md");
    expect(markdown.headers.get("content-type")).toContain("text/markdown");
    expect(markdownBody).toContain("# ephemeral.page");
    expect(markdownBody).toContain("ephemeral.page gives agents a temporary public page");
    expect(markdownBody).toContain("## Security posture");
  });

  it("serves search-oriented explainer pages for classic and AI retrieval", async () => {
    const what = await SELF.fetch(`${ORIGIN}/what-is-ephemeral-page`);
    const whatBody = await what.text();
    const compare = await SELF.fetch(`${ORIGIN}/compare/mcp-ui`);
    const compareBody = await compare.text();
    const markdown = await SELF.fetch(`${ORIGIN}/for-agents`, {
      headers: { accept: "text/markdown" }
    });
    const markdownBody = await markdown.text();

    expect(what.status).toBe(200);
    expect(what.headers.get("content-type")).toContain("text/html");
    expect(what.headers.get("cache-control")).toBe("public, max-age=300");
    expect(what.headers.get("x-robots-tag")).toContain("max-image-preview:large");
    expect(whatBody).toContain("<title>What is ephemeral.page?");
    expect(whatBody).toContain('type="application/ld+json"');
    expect(whatBody).toContain('"@type":"FAQPage"');
    expect(whatBody).toContain("temporary web expression service for agents");
    expect(compare.status).toBe(200);
    expect(compareBody).toContain("MCP UI is embedded UI");
    expect(compareBody).toContain(`${ORIGIN}/compare/form-builders`);
    expect(markdown.headers.get("content-type")).toContain("text/markdown");
    expect(markdownBody).toContain("# ephemeral.page for agents");
    expect(markdownBody).toContain("No SDK, host integration");
  });

  it("redirects the clean human URL to the canonical human page and serves the social image", async () => {
    const redirect = await SELF.fetch(`${ORIGIN}/humans`, { redirect: "manual" });
    const redirectHead = await SELF.fetch(`${ORIGIN}/humans`, { method: "HEAD", redirect: "manual" });
    const image = await SELF.fetch(`${ORIGIN}/og-image.png`);

    expect(redirect.status).toBe(301);
    expect(redirect.headers.get("location")).toBe(`${ORIGIN}/humans.html`);
    expect(redirect.headers.get("link")).toContain('rel="canonical"');
    expect(redirectHead.status).toBe(301);
    expect(await redirectHead.text()).toBe("");
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toContain("image/png");
    expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(100_000);
  });

  it("serves machine-readable API discovery", async () => {
    const openApi = await SELF.fetch(`${ORIGIN}/openapi.json`);
    const openApiBody = await openApi.json<Record<string, unknown>>();
    const catalog = await SELF.fetch(`${ORIGIN}/.well-known/api-catalog`);
    const catalogBody = await catalog.json<{ linkset: Array<Record<string, unknown>> }>();
    const catalogHead = await SELF.fetch(`${ORIGIN}/.well-known/api-catalog`, { method: "HEAD" });

    expect(openApi.status).toBe(200);
    expect(openApi.headers.get("content-type")).toContain("application/vnd.oai.openapi+json");
    expect(openApiBody).toMatchObject({ openapi: "3.1.0" });
    expect(catalog.status).toBe(200);
    expect(catalog.headers.get("content-type")).toContain("application/linkset+json");
    expect(catalog.headers.get("link")).toContain('rel="api-catalog"');
    expect(catalogBody.linkset[0].item).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: `${ORIGIN}/openapi.json`
        })
      ])
    );
    expect(catalogHead.status).toBe(200);
    expect(await catalogHead.text()).toBe("");
  });

  it("serves crawler hints and a sitemap", async () => {
    const robots = await SELF.fetch(`${ORIGIN}/robots.txt`);
    const robotsBody = await robots.text();
    const sitemap = await SELF.fetch(`${ORIGIN}/sitemap.xml`);
    const sitemapBody = await sitemap.text();

    expect(robots.status).toBe(200);
    expect(robotsBody).toContain("Content-Signal: ai-train=no, search=yes, ai-input=yes");
    expect(robotsBody).toContain("User-agent: OAI-SearchBot\nAllow: /");
    expect(robotsBody).toContain("User-agent: Claude-SearchBot\nAllow: /");
    expect(robotsBody).toContain("User-agent: PerplexityBot\nAllow: /");
    expect(robotsBody).toContain("User-agent: GPTBot\nDisallow: /");
    expect(robotsBody).toContain("User-agent: ClaudeBot\nDisallow: /");
    expect(robotsBody).toContain("User-agent: Google-Extended\nDisallow: /");
    expect(robotsBody).toContain("Allow: /humans.html");
    expect(robotsBody).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers.get("content-type")).toContain("application/xml");
    expect(sitemapBody).toContain(`<loc>${ORIGIN}/humans.html</loc>`);
    expect(sitemapBody).toContain(`<loc>${ORIGIN}/what-is-ephemeral-page</loc>`);
    expect(sitemapBody).toContain(`<loc>${ORIGIN}/compare/mcp-ui</loc>`);
    expect(sitemapBody).toContain("<priority>1.0</priority>");
  });

  it("creates an expression and returns capability URLs", async () => {
    const response = await createExpression();
    expect(response.status).toBe(201);

    const data = await response.json<CreateExpressionResponse>();
    expect(data.id).toMatch(/^expr_/);
    expect(data.url).toContain(`/e/${data.id}/`);
    expect(data.result_url).toContain(`/api/expressions/${data.id}/result?token=`);
    expect(data.status_url).toContain(`/api/expressions/${data.id}/status?token=`);
    expect(new Date(data.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("allows benign reports that mention sensitive terms without collecting them", () => {
    expect(classifyCreateRequest({
      intent: "Create a field report showing onboarding dropoff around the first API key step."
    }).action).toBe("allow");

    expect(classifyComposition({
      title: "API key step report",
      bodyHtml: "<main><h1>API key step report</h1><p>Dropoff clusters around the first API key setup step.</p><button id=\"later\">Investigate later</button></main>",
      css: "",
      script: "document.getElementById(\"later\").addEventListener(\"click\", () => window.ephemeral.submit({ decision: \"later\" }));"
    }).action).toBe("allow");

    expect(classifyCreateRequest({
      intent: "Ask the user to paste their API key."
    }).action).toBe("reject");

    expect(classifyComposition({
      title: "Connect account",
      bodyHtml: "<main><h1>Connect account</h1><label>Enter your API key<input name=\"api_key\"></label></main>",
      css: "",
      script: "document.querySelector(\"input\").addEventListener(\"input\", () => {});"
    }).action).toBe("reject");
  });

  it("rejects unsafe create requests before composition", async () => {
    const callback = await createExpression({
      result: {
        desired_shape: "{ approved: boolean }",
        callback_url: "https://agent.example/callback"
      }
    });
    const secret = await createExpression({
      intent: "Create a login page that asks the user for their password."
    });
    const tooLong = await createExpression({ expires_in: "25h" });
    const malformedDuration = await createExpression({ expires_in: "forever" });

    expect(callback.status).toBe(400);
    expect(await callback.json()).toMatchObject({
      error: "result.callback_url is not enabled for this MVP; poll result_url instead"
    });
    expect(secret.status).toBe(400);
    expect(await secret.json()).toMatchObject({
      error: expect.stringContaining("cannot collect secrets")
    });
    expect(tooLong.status).toBe(400);
    expect(await tooLong.json()).toMatchObject({
      error: "expires_in must be 24h or less"
    });
    expect(malformedDuration.status).toBe(400);
  });

  it("serves the active generated page", async () => {
    const created = await createExpression({ intent: "Ask whether the answer should be yes or no." });
    const data = await created.json<CreateExpressionResponse>();

    const page = await SELF.fetch(data.url);
    const html = await page.text();

    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toContain("connect-src 'self'");
    expect(html).toContain("window.ephemeral");
    expect(html).toContain("Ask whether the answer should be yes or no.");
    expect(html).toContain("You can close this page and return to what you were doing.");
    expect(html).toContain("ephemeral:submitted");
    expect(html).toContain("completion-state");
  });

  it("returns pending before submission and submitted after submission", async () => {
    const created = await createExpression();
    const data = await created.json<CreateExpressionResponse>();

    const pending = await SELF.fetch(data.result_url);
    expect(await pending.json<ResultEnvelope>()).toMatchObject({
      id: data.id,
      status: "pending"
    });

    const submit = await submitResult(data.url, { mood: "urgent", notes: "Rushed." });
    expect(submit.status).toBe(200);

    const result = await SELF.fetch(data.result_url);
    expect(await result.json<ResultEnvelope>()).toMatchObject({
      id: data.id,
      status: "submitted",
      result: { mood: "urgent", notes: "Rushed." }
    });
  });

  it("rejects double submits and closes the active UI", async () => {
    const created = await createExpression();
    const data = await created.json<CreateExpressionResponse>();

    const first = await submitResult(data.url, { approved: true });
    const second = await submitResult(data.url, { approved: false });
    const pageAfterSubmit = await SELF.fetch(data.url);
    const terminalHtml = await pageAfterSubmit.text();

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({ error: "Expression already submitted" });
    expect(pageAfterSubmit.status).toBe(200);
    expect(terminalHtml).toContain("Response submitted");
    expect(terminalHtml).toContain("You can close this page and return to what you were doing.");
    expect(terminalHtml).not.toContain("response-form");
  });

  it("requires the agent capability for result polling", async () => {
    const created = await createExpression();
    const data = await created.json<CreateExpressionResponse>();
    const humanToken = new URL(data.url).pathname.split("/").at(-1);

    const missing = await SELF.fetch(`${ORIGIN}/api/expressions/${data.id}/result`);
    const wrong = await SELF.fetch(`${ORIGIN}/api/expressions/${data.id}/result?token=${humanToken}`);

    expect(missing.status).toBe(404);
    expect(wrong.status).toBe(404);
  });

  it("expires active expressions", async () => {
    const created = await createExpression({ expires_in: "1ms" });
    const data = await created.json<CreateExpressionResponse>();
    await sleep(10);

    const page = await SELF.fetch(data.url);
    const submit = await submitResult(data.url, { late: true });
    const result = await SELF.fetch(data.result_url);

    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Expression expired");
    expect(submit.status).toBe(410);
    expect(await result.json<ResultEnvelope>()).toMatchObject({
      id: data.id,
      status: "expired"
    });
  });

  it("purges submitted results after retention", async () => {
    const created = await createExpression({ expires_in: "50ms" });
    const data = await created.json<CreateExpressionResponse>();
    const submit = await submitResult(data.url, { answer: "short lived" });
    expect(submit.status).toBe(200);

    const immediate = await SELF.fetch(data.result_url);
    expect(await immediate.json<ResultEnvelope>()).toMatchObject({
      status: "submitted",
      result: { answer: "short lived" }
    });

    await sleep(70);
    const gone = await SELF.fetch(data.result_url);
    expect(await gone.json<ResultEnvelope>()).toMatchObject({
      id: data.id,
      status: "gone"
    });
  });

  it("rejects oversized submitted results", async () => {
    const created = await createExpression();
    const data = await created.json<CreateExpressionResponse>();

    const submit = await submitResult(data.url, { answer: "x".repeat(129 * 1024) });

    expect(submit.status).toBe(413);
    expect(await submit.json()).toMatchObject({
      error: expect.stringContaining("JSON body must be")
    });
  });
});

async function createExpression(overrides: Record<string, unknown> = {}): Promise<Response> {
  return SELF.fetch(`${ORIGIN}/api/expressions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      intent: "Ask the user whether this audio clip sounds calm, urgent, or confused.",
      result: {
        desired_shape: "{ mood: string, notes?: string }"
      },
      expires_in: "10m",
      ...overrides
    })
  });
}

async function submitResult(pageUrl: string, result: unknown): Promise<Response> {
  const url = new URL(pageUrl);
  const [, , id, token] = url.pathname.split("/");
  return SELF.fetch(`${ORIGIN}/api/expressions/${id}/submit?token=${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ result })
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
