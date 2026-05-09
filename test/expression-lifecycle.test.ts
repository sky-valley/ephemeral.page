import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { CreateExpressionResponse, ResultEnvelope } from "../src/types";

const ORIGIN = "http://localhost:8787";

describe("expression lifecycle", () => {
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
