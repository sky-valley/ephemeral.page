import { escapeHtml } from "./escape";
import { classifyComposition } from "./policy";
import { extractPreviewText, shouldUsePreviewMode } from "./preview";
import { extractDesiredShapeFields, extractStringOptionsForField } from "./resultShape";
import type { CreateExpressionRequest, Env, PageComposition, StoredMaterial } from "./types";

const DEFAULT_WORKERS_AI_MODEL = "@cf/google/gemma-4-26b-a4b-it";

export interface ComposeInput {
  id: string;
  intent: string;
  desiredShape?: string;
  materials: StoredMaterial[];
}

export async function composePage(env: Env, input: ComposeInput, request: CreateExpressionRequest): Promise<PageComposition> {
  if (shouldUsePreviewMode(request)) {
    const page = previewCompose(input);
    const policy = classifyComposition(page, { mode: "preview" });
    if (policy.action === "allow") return page;
  }

  if (env.COMPOSER === "workers-ai" && env.AI) {
    const first = await workersAiCompose(env, input, request);
    const firstDecision = classifyComposition(first);
    if (firstDecision.action === "allow") {
      return first;
    }

    const second = await workersAiCompose(env, input, request, firstDecision.reason);
    const secondDecision = classifyComposition(second);
    if (secondDecision.action === "allow") {
      return second;
    }
  }

  return fixtureCompose(input);
}

function previewCompose(input: ComposeInput): PageComposition {
  const previewText = extractPreviewText(input.intent);
  const fields = extractDesiredShapeFields(input.desiredShape);
  const hasDesiredShape = Boolean(input.desiredShape?.trim());
  const decisionField = fields.find((field) => normalizeField(field) === "decision") ?? fields.find((field) => normalizeField(field) !== "notes") ?? "decision";
  const notesField = fields.find((field) => normalizeField(field) === "notes");
  const includeNotes = !hasDesiredShape || Boolean(notesField);
  const decisionOptions = extractStringOptionsForField(input.desiredShape, decisionField);
  const options = decisionOptions.length > 0 ? decisionOptions : ["approve-and-send", "request-changes"];

  return {
    title: "Preview review requested",
    bodyHtml: `
      <main class="shell">
        <header>
          <p class="eyebrow">static preview</p>
          <h1>Review this draft</h1>
        </header>
        <section class="preview-card" aria-label="Static preview">
          <pre>${escapeHtml(previewText)}</pre>
        </section>
        <form id="response-form" class="response-form">
          <fieldset>
            <legend>Decision</legend>
            <label>
              <span>Decision</span>
              <select name="${escapeHtml(decisionField)}" required>
                <option value="">Choose</option>
                ${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(formatOption(option))}</option>`).join("")}
              </select>
            </label>
            ${includeNotes ? `<label>
              <span>Notes</span>
              <textarea name="${escapeHtml(notesField ?? "notes")}" rows="4" placeholder="Optional context"></textarea>
            </label>` : ""}
          </fieldset>
          <button type="submit">Submit review</button>
          <p id="form-status" role="status" aria-live="polite"></p>
        </form>
        <section id="completion-state" class="completion-state" tabindex="-1" hidden>
          <p class="completion-kicker">Response submitted</p>
          <h2>You are done here.</h2>
          <p>Your response was received. You can close this page and return to what you were doing.</p>
        </section>
      </main>
    `,
    css: `
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; min-height: 100vh; background: #f6f4ee; color: #202124; }
      .shell { width: min(760px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0; }
      .eyebrow { margin: 0 0 12px; color: #7a4f1d; font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
      h1 { margin: 0 0 24px; font-size: clamp(2rem, 7vw, 4rem); line-height: 0.98; letter-spacing: 0; color: #171717; }
      .preview-card { border: 1px solid #d8d0c0; border-radius: 8px; background: #fffdf8; box-shadow: 0 12px 28px rgba(23, 23, 23, 0.08); }
      .preview-card pre { margin: 0; padding: 24px; white-space: pre-wrap; overflow-wrap: anywhere; font: 0.96rem/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
      .response-form { margin-top: 28px; }
      fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 18px; }
      legend { font-weight: 800; margin-bottom: 16px; font-size: 1.2rem; }
      label span { display: block; margin-bottom: 8px; font-weight: 700; }
      select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #bbb2a2; border-radius: 8px; padding: 12px 14px; font: inherit; background: #fff; color: #171717; }
      button { margin-top: 20px; border: 0; border-radius: 8px; padding: 12px 18px; font: inherit; font-weight: 800; color: white; background: #8b5a20; cursor: pointer; }
      button[disabled] { opacity: 0.65; cursor: progress; }
      #form-status { min-height: 1.5em; font-weight: 700; }
      .completion-state { margin-top: 32px; border: 1px solid #b7dacd; border-radius: 8px; padding: 22px; background: #eef8f3; color: #173c34; outline: none; }
      .completion-state:focus { box-shadow: 0 0 0 3px rgba(31, 111, 92, 0.24); }
      .completion-state[hidden] { display: none; }
      .completion-kicker { margin: 0 0 8px; font-weight: 800; color: #1f6f5c; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0; }
      .completion-state h2 { margin: 0 0 8px; font-size: 1.55rem; line-height: 1.15; }
      .completion-state p:last-child { margin-bottom: 0; }
      @media (prefers-color-scheme: dark) {
        body { background: #151714; color: #eeeee9; }
        h1 { color: #ffffff; }
        .preview-card { background: #20231f; border-color: #3c4339; box-shadow: none; }
        select, textarea { background: #10120f; color: #fff; border-color: #4a5247; }
        .completion-state { background: #13251f; border-color: #2e6f5f; color: #edf8f4; }
      }
    `,
    script: `
      const form = document.getElementById("response-form");
      const status = document.getElementById("form-status");
      const completion = document.getElementById("completion-state");
      const decisionField = ${JSON.stringify(decisionField)};
      const notesField = ${JSON.stringify(notesField ?? "notes")};
      const includeNotes = ${JSON.stringify(includeNotes)};
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("button");
        button.disabled = true;
        status.textContent = "Submitting...";
        const data = new FormData(form);
        const result = { [decisionField]: String(data.get(decisionField) || "") };
        if (includeNotes) {
          const notes = String(data.get(notesField) || "");
          if (notes) result[notesField] = notes;
        }
        try {
          await window.ephemeral.submit(result);
          status.textContent = "Submitted. You can close this page.";
          form.hidden = true;
          completion.hidden = false;
          completion.focus();
        } catch (error) {
          button.disabled = false;
          status.textContent = error && error.message ? error.message : "Could not submit.";
        }
      });
    `
  };
}

async function workersAiCompose(
  env: Env,
  input: ComposeInput,
  request: CreateExpressionRequest,
  policyFeedback?: string
): Promise<PageComposition> {
  const response = await env.AI!.run(env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL, {
    messages: [
      {
        role: "system",
        content: [
          "You compose short-lived, accessible, mobile-friendly HTML5 pages for one specific human moment.",
          "The page may ask, show, compare, preview, explain, acknowledge, or collect one response; do not reduce every request to a generic form.",
          "Return only compact JSON with keys: title, bodyHtml, css, script.",
          "Use one clear h1, concise copy, and controls that match the requested result shape.",
          "For choices, use radio buttons, segmented buttons, select controls, or clearly labeled buttons instead of a plain text box.",
          "For reports or evidence, present the finding before asking for the human's decision.",
          "For material previews, show the provided material by referencing materials/{id}.",
          "The page must call window.ephemeral.submit(result) from script when the user submits.",
          "After submit resolves, show a clear persistent end state that says the response was received and the human can close the page or return to what they were doing.",
          "Disable or hide submit controls after success. The success state must be visible, accessible, and announced with role=status or equivalent focus management.",
          "Do not explain implementation details, agent ergonomics, policies, or why the page was generated.",
          "Do not add emojis unless the request explicitly asks for them.",
          "Do not include external scripts, external stylesheets, backend calls, cookies, storage, or tracking.",
          "Do not ask for secrets, passwords, API keys, seed phrases, payment details, login credentials, or government identity documents.",
          "Do not impersonate another brand or service.",
          "Do not submit automatically; submit only from an explicit user event handler."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          intent: input.intent,
          desired_shape: request.result?.desired_shape,
          materials: input.materials.map((material) => ({
            id: material.id,
            type: material.type,
            label: material.label,
            content_type: material.contentType
          }))
        })
      },
      ...(policyFeedback
        ? [{
            role: "user",
            content: `The previous composition violated policy: ${policyFeedback}. Return a corrected compact JSON composition that preserves the benign task while satisfying policy.`
          }]
        : [])
    ]
  } as Record<string, unknown>);

  const text = responseText(response);
  const parsed = parseCompositionJson(text);
  const fallback = fixtureCompose(input);
  return {
    title: parsed.title || fallback.title,
    bodyHtml: parsed.bodyHtml || fallback.bodyHtml,
    css: parsed.css || fallback.css,
    script: parsed.script || fallback.script
  };
}

function parseCompositionJson(text: string): Partial<PageComposition> {
  try {
    const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(trimmed) as Partial<PageComposition>;
    return {
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      bodyHtml: typeof parsed.bodyHtml === "string" ? parsed.bodyHtml : undefined,
      css: typeof parsed.css === "string" ? parsed.css : undefined,
      script: typeof parsed.script === "string" ? parsed.script : undefined
    };
  } catch {
    return {};
  }
}

function responseText(response: unknown): string {
  if (typeof response === "string") return response;
  if (!response || typeof response !== "object") return "";
  const record = response as Record<string, unknown>;
  if (typeof record.response === "string") return record.response;
  const choices = record.choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (typeof message?.content === "string") return message.content;
  }
  return JSON.stringify(response);
}

function fixtureCompose(input: ComposeInput): PageComposition {
  const materialHtml = input.materials.length
    ? `<section class="materials" aria-label="Materials">${input.materials.map(renderMaterial).join("")}</section>`
    : "";

  return {
    title: "Human input requested",
    bodyHtml: `
      <main class="shell">
        <header>
          <p class="eyebrow">ephemeral.page</p>
          <h1>One focused response</h1>
          <p class="intent">${escapeHtml(input.intent)}</p>
        </header>
        ${materialHtml}
        <form id="response-form" class="response-form">
          <fieldset>
            <legend>Your answer</legend>
            <label>
              <span>Response</span>
              <input name="answer" required autocomplete="off" placeholder="Type the focused answer" />
            </label>
            <label>
              <span>Notes</span>
              <textarea name="notes" rows="4" placeholder="Optional context"></textarea>
            </label>
          </fieldset>
          <button type="submit">Submit response</button>
          <p id="form-status" role="status" aria-live="polite"></p>
        </form>
        <section id="completion-state" class="completion-state" tabindex="-1" hidden>
          <p class="completion-kicker">Response submitted</p>
          <h2>You are done here.</h2>
          <p>Your response was received. You can close this page and return to what you were doing.</p>
        </section>
      </main>
    `,
    css: `
      :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; min-height: 100vh; background: #f7f5ef; color: #202124; }
      .shell { width: min(760px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0; }
      .eyebrow { margin: 0 0 16px; color: #2f6f61; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0; }
      h1 { margin: 0 0 12px; font-size: clamp(2rem, 7vw, 4.5rem); line-height: 0.95; letter-spacing: 0; color: #171717; }
      .intent { margin: 0; max-width: 62ch; font-size: 1.1rem; line-height: 1.55; }
      .materials { margin: 32px 0; display: grid; gap: 16px; }
      .material { border: 1px solid #d8d0c0; border-radius: 8px; padding: 16px; background: #fffdf8; }
      .material strong { display: block; margin-bottom: 10px; }
      audio, video, img { max-width: 100%; }
      .response-form { margin-top: 32px; }
      fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 18px; }
      legend { font-weight: 800; margin-bottom: 16px; font-size: 1.2rem; }
      label span { display: block; margin-bottom: 8px; font-weight: 700; }
      input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #bbb2a2; border-radius: 8px; padding: 12px 14px; font: inherit; background: #fff; color: #171717; }
      button { margin-top: 20px; border: 0; border-radius: 8px; padding: 12px 18px; font: inherit; font-weight: 800; color: white; background: #1f6f5c; cursor: pointer; }
      button[disabled] { opacity: 0.65; cursor: progress; }
      #form-status { min-height: 1.5em; font-weight: 700; }
      .completion-state { margin-top: 32px; border: 1px solid #b7dacd; border-radius: 8px; padding: 22px; background: #eef8f3; color: #173c34; outline: none; }
      .completion-state:focus { box-shadow: 0 0 0 3px rgba(31, 111, 92, 0.24); }
      .completion-state[hidden] { display: none; }
      .completion-kicker { margin: 0 0 8px; font-weight: 800; color: #1f6f5c; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0; }
      .completion-state h2 { margin: 0 0 8px; font-size: 1.55rem; line-height: 1.15; }
      .completion-state p:last-child { margin-bottom: 0; }
      @media (prefers-color-scheme: dark) {
        body { background: #151714; color: #eeeee9; }
        h1 { color: #ffffff; }
        .material { background: #20231f; border-color: #3c4339; }
        input, textarea { background: #10120f; color: #fff; border-color: #4a5247; }
        .completion-state { background: #13251f; border-color: #2e6f5f; color: #edf8f4; }
      }
    `,
    script: `
      const form = document.getElementById("response-form");
      const status = document.getElementById("form-status");
      const completion = document.getElementById("completion-state");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("button");
        button.disabled = true;
        status.textContent = "Submitting...";
        const data = new FormData(form);
        try {
          await window.ephemeral.submit({
            answer: String(data.get("answer") || ""),
            notes: String(data.get("notes") || "") || undefined
          });
          status.textContent = "Submitted. You can close this page.";
          form.hidden = true;
          completion.hidden = false;
          completion.focus();
        } catch (error) {
          button.disabled = false;
          status.textContent = error && error.message ? error.message : "Could not submit.";
        }
      });
    `
  };
}

function normalizeField(field: string): string {
  return field.replace(/[_-]+/g, " ").trim().toLowerCase();
}

function formatOption(option: string): string {
  return option.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderMaterial(material: StoredMaterial): string {
  const label = escapeHtml(material.label || material.type);
  const src = `materials/${encodeURIComponent(material.id)}`;
  if (material.contentType.startsWith("audio/")) {
    return `<article class="material"><strong>${label}</strong><audio controls src="${src}"></audio></article>`;
  }
  if (material.contentType.startsWith("video/")) {
    return `<article class="material"><strong>${label}</strong><video controls src="${src}"></video></article>`;
  }
  if (material.contentType.startsWith("image/")) {
    return `<article class="material"><strong>${label}</strong><img src="${src}" alt="${label}" /></article>`;
  }
  return `<article class="material"><strong>${label}</strong><a href="${src}">Open material</a></article>`;
}
