import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { CreateExpressionResponse, ResultEnvelope } from "../src/types";

const ORIGIN = "http://localhost:8787";

describe("expression lifecycle", () => {
  it("serves an agent-first Markdown home at the root", async () => {
    const response = await SELF.fetch(`${ORIGIN}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("link")).toContain("/.well-known/api-catalog");
    expect(body).toContain("# ephemeral.page AGENTS.md");
    expect(body).toContain("Humans should use");
    expect(body).toContain("POST /api/expressions");
    expect(body).toContain("Headless human submission");
    expect(body).toContain("Complete headless smoke");
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
    expect(htmlBody).toContain("Temporary pages for one human response.");
    expect(htmlBody).toContain("<title>ephemeral.page - temporary pages for agent-to-human moments</title>");
    expect(htmlBody).toContain('property="og:title"');
    expect(htmlBody).toContain('property="og:image"');
    expect(htmlBody).toContain('name="twitter:card" content="summary_large_image"');
    expect(htmlBody).toContain('type="application/ld+json"');
    expect(htmlBody).toContain('"@type":"SoftwareApplication"');
    expect(htmlBody).not.toContain("# ephemeral.page AGENTS.md");
    expect(markdown.headers.get("content-type")).toContain("text/markdown");
    expect(markdownBody).toContain("# ephemeral.page");
    expect(markdownBody).toContain("ephemeral.page gives software agents");
  });

  it("redirects the clean human URL to the canonical human page and serves the social image", async () => {
    const redirect = await SELF.fetch(`${ORIGIN}/humans`, { redirect: "manual" });
    const redirectHead = await SELF.fetch(`${ORIGIN}/humans`, { method: "HEAD", redirect: "manual" });
    const image = await SELF.fetch(`${ORIGIN}/og-image.svg`);
    const imageBody = await image.text();

    expect(redirect.status).toBe(301);
    expect(redirect.headers.get("location")).toBe(`${ORIGIN}/humans.html`);
    expect(redirect.headers.get("link")).toContain('rel="canonical"');
    expect(redirectHead.status).toBe(301);
    expect(await redirectHead.text()).toBe("");
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toContain("image/svg+xml");
    expect(imageBody).toContain("Temporary pages");
    expect(imageBody).toContain("Agents ask. People answer.");
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
    expect(robotsBody).toContain("Allow: /humans.html");
    expect(robotsBody).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(sitemap.status).toBe(200);
    expect(sitemap.headers.get("content-type")).toContain("application/xml");
    expect(sitemapBody).toContain(`<loc>${ORIGIN}/humans.html</loc>`);
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

  it("keeps polling authoritative when a callback URL is configured", async () => {
    const created = await createExpression({
      result: {
        desired_shape: "{ approved: boolean }",
        callback_url: "https://agent.example/callback"
      }
    });
    const data = await created.json<CreateExpressionResponse>();

    const submit = await submitResult(data.url, { approved: true });
    const result = await SELF.fetch(data.result_url);

    expect(submit.status).toBe(200);
    expect(await result.json<ResultEnvelope>()).toMatchObject({
      id: data.id,
      status: "submitted",
      result: { approved: true }
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
