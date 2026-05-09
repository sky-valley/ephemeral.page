#!/usr/bin/env node

const origin = process.env.EPHEMERAL_ORIGIN || process.argv[2];

if (!origin) {
  console.error("Usage: EPHEMERAL_ORIGIN=https://example.workers.dev npm run smoke:remote");
  process.exit(1);
}

const base = origin.replace(/\/+$/, "");

const created = await request(`${base}/api/expressions`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    intent: "Ask the human for one short deployment smoke-test response.",
    result: {
      desired_shape: "{ answer: string, notes?: string }"
    },
    expires_in: "10m"
  })
}, 201);

assert(created.id?.startsWith("expr_"), "create response should include an expression id");
assert(created.url?.startsWith(`${base}/e/${created.id}/`), "create response should include a human URL on the target origin");
assert(created.result_url?.startsWith(`${base}/api/expressions/${created.id}/result?token=`), "create response should include a result URL");

const page = await fetch(created.url);
assert(page.ok, `generated page should be fetchable, got ${page.status}`);
const html = await page.text();
assert(html.includes("window.ephemeral"), "generated page should expose window.ephemeral");

const pageUrl = new URL(created.url);
const [, , id, viewToken] = pageUrl.pathname.split("/");
assert(id === created.id, "human URL should contain the expression id");
assert(Boolean(viewToken), "human URL should contain a view capability");

await request(`${base}/api/expressions/${id}/submit?token=${encodeURIComponent(viewToken)}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    result: {
      answer: "remote smoke ok",
      notes: "created, served, submitted, and polled through the public Worker"
    }
  })
});

const doubleSubmit = await fetch(`${base}/api/expressions/${id}/submit?token=${encodeURIComponent(viewToken)}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ result: { answer: "should not be accepted" } })
});
assert(doubleSubmit.status === 409, `double submit should be rejected with 409, got ${doubleSubmit.status}`);

const result = await request(created.result_url);
assert(result.status === "submitted", `result should be submitted, got ${result.status}`);
assert(result.result?.answer === "remote smoke ok", "result payload should match the submitted answer");

const status = await request(created.status_url);
assert(status.status === "submitted", `status should be submitted, got ${status.status}`);

console.log(JSON.stringify({
  ok: true,
  id: created.id,
  origin: base,
  status: status.status,
  result: result.result
}, null, 2));

async function request(url, init, expectedStatus = 200) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 160)}`);
  }

  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus} from ${url}, got ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
