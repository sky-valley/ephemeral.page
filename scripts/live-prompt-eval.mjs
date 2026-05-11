#!/usr/bin/env node

const origin = (process.env.EPHEMERAL_ORIGIN || process.argv[2] || "https://ephemeral.page").replace(/\/+$/, "");

const cases = [
  {
    id: "approval-with-evidence",
    kind: "approval",
    prompt: "Create a temporary page for Maya to approve or reject this release plan. Show the summary first: ship the typography refresh today, keep the old billing screen unchanged, and monitor signups for 24 hours. Ask for approval, a risk level, and optional notes.",
    desiredShape: "{ approved: boolean, risk_level: 'low' | 'medium' | 'high', notes?: string }",
    expectedTerms: ["release", "approve", "risk", "notes"]
  },
  {
    id: "compare-options",
    kind: "choice",
    prompt: "Create a page that lets Jordan compare three names for a small prototype: Lantern, Thread, and Fieldnote. Show each name with a one-line feel, then ask Jordan to choose one and explain why.",
    desiredShape: "{ choice: 'Lantern' | 'Thread' | 'Fieldnote', reason?: string }",
    expectedTerms: ["Lantern", "Thread", "Fieldnote", "choose"]
  },
  {
    id: "quick-report",
    kind: "report",
    prompt: "Create a concise one-page field report for Sam. The agent found that onboarding dropoff clusters around the first API key step. Show the finding, two likely causes, and one recommended next move. Ask Sam whether to investigate now or later.",
    desiredShape: "{ decision: 'investigate_now' | 'later', notes?: string }",
    expectedTerms: ["onboarding", "API key", "finding", "investigate"]
  },
  {
    id: "media-preview",
    kind: "media-review",
    prompt: "Create a page for Riley to review this draft social preview image. Show the image, ask whether it feels clear and trustworthy at small preview size, and collect one suggested change.",
    desiredShape: "{ clear: boolean, trustworthy: boolean, suggested_change?: string }",
    materials: [
      {
        type: "image",
        url: "https://ephemeral.page/og-image.png",
        label: "Draft social preview"
      }
    ],
    expectedTerms: ["image", "clear", "trustworthy", "suggested"]
  },
  {
    id: "acknowledgment",
    kind: "acknowledgment",
    prompt: "Create a small acknowledgment page for Priya. Explain that the migration window is tonight from 9:00 PM to 9:30 PM Eastern, no customer action is required, and ask Priya to acknowledge that she saw it.",
    desiredShape: "{ acknowledged: boolean, name?: string, notes?: string }",
    expectedTerms: ["migration", "9:00", "acknowledge", "customer"]
  },
  {
    id: "inspect-annotate",
    kind: "inspection",
    prompt: "Create a page for Leon to inspect a proposed homepage line: 'When chat is too small, make a page.' Ask him to mark it as keep, revise, or reject, and collect a sharper alternative if he has one.",
    desiredShape: "{ verdict: 'keep' | 'revise' | 'reject', alternative?: string, notes?: string }",
    expectedTerms: ["When chat is too small", "keep", "revise", "reject"]
  },
  {
    id: "casual-poll",
    kind: "casual",
    prompt: "Create a playful little page for three friends to pick dinner tonight. Options are noodles, tacos, or picnic snacks. Keep it light, ask for one vote and any strong veto.",
    desiredShape: "{ vote: 'noodles' | 'tacos' | 'picnic snacks', veto?: string }",
    expectedTerms: ["noodles", "tacos", "picnic", "veto"]
  },
  {
    id: "tiny-story",
    kind: "play",
    prompt: "Create a tiny choose-your-path page for a friend. The setup: a mysterious blue door appears in a quiet library. Offer three paths and ask which path they choose, plus one sentence about why.",
    desiredShape: "{ path: string, why?: string }",
    expectedTerms: ["blue door", "library", "path", "choose"]
  }
];

const results = [];

for (const testCase of cases) {
  const startedAt = Date.now();
  try {
    const created = await request(`${origin}/api/expressions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intent: testCase.prompt,
        materials: testCase.materials,
        result: { desired_shape: testCase.desiredShape },
        expires_in: "24h"
      })
    }, 201);
    const createMs = Date.now() - startedAt;

    const pageStartedAt = Date.now();
    const page = await fetch(created.url);
    const html = await page.text();
    const fetchMs = Date.now() - pageStartedAt;
    const analysis = analyzeHtml(testCase, html);

    results.push({
      id: testCase.id,
      kind: testCase.kind,
      prompt: testCase.prompt,
      desired_shape: testCase.desiredShape,
      url: created.url,
      result_url: created.result_url,
      status_url: created.status_url,
      expires_at: created.expires_at,
      create_ms: createMs,
      fetch_ms: fetchMs,
      page_status: page.status,
      ...analysis
    });

    console.error(`created ${testCase.id}: ${created.url}`);
  } catch (error) {
    results.push({
      id: testCase.id,
      kind: testCase.kind,
      prompt: testCase.prompt,
      error: error instanceof Error ? error.message : String(error),
      create_ms: Date.now() - startedAt
    });
    console.error(`failed ${testCase.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(JSON.stringify({ origin, generated_at: new Date().toISOString(), results }, null, 2));

async function request(url, init, expectedStatus = 200) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 200)}`);
  }
  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus} from ${url}, got ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function analyzeHtml(testCase, html) {
  const title = matchText(html, /<title>([\s\S]*?)<\/title>/i);
  const h1 = matchText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const text = stripHtml(html);
  const missingTerms = testCase.expectedTerms.filter((term) => !text.toLowerCase().includes(term.toLowerCase()));
  const fallbackLike = title === "Human input requested" || text.includes("One focused response");
  const hasSubmit = html.includes("window.ephemeral.submit");
  const hasExplicitEvent = /\baddEventListener\s*\(\s*["'](submit|click|change|input)["']/i.test(html);
  const hasCompletion = /response (submitted|received)|you can close this page|return to what you were doing/i.test(text);
  const mentionsMaterial = !testCase.materials || /materials\//.test(html);
  const hasChoiceAffordance = /(radio|checkbox|select|button|textarea|input)/i.test(html);

  const score = [
    !fallbackLike,
    hasSubmit,
    hasExplicitEvent,
    hasCompletion,
    missingTerms.length === 0,
    mentionsMaterial,
    hasChoiceAffordance
  ].filter(Boolean).length;

  return {
    title,
    h1,
    score,
    fallback_like: fallbackLike,
    has_submit: hasSubmit,
    has_explicit_event: hasExplicitEvent,
    has_completion_state: hasCompletion,
    has_choice_affordance: hasChoiceAffordance,
    missing_terms: missingTerms,
    text_excerpt: text.slice(0, 700)
  };
}

function matchText(value, pattern) {
  const match = pattern.exec(value);
  return match ? stripHtml(match[1]).trim() : "";
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
