import { escapeHtml } from "./escape";
import type { CreateExpressionRequest, Env, PageComposition, StoredMaterial } from "./types";

const DEFAULT_WORKERS_AI_MODEL = "@cf/google/gemma-4-26b-a4b-it";

export interface ComposeInput {
  id: string;
  intent: string;
  desiredShape?: string;
  materials: StoredMaterial[];
}

export async function composePage(env: Env, input: ComposeInput, request: CreateExpressionRequest): Promise<PageComposition> {
  if (env.COMPOSER === "workers-ai" && env.AI) {
    return workersAiCompose(env, input, request);
  }

  return fixtureCompose(input);
}

async function workersAiCompose(env: Env, input: ComposeInput, request: CreateExpressionRequest): Promise<PageComposition> {
  const response = await env.AI!.run(env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL, {
    messages: [
      {
        role: "system",
        content: [
          "You compose small, accessible, mobile-friendly HTML5 pages for one human interaction.",
          "Return only compact JSON with keys: title, bodyHtml, css, script.",
          "The page must call window.ephemeral.submit(result) from script when the user submits.",
          "Do not include external scripts, external stylesheets, backend calls, cookies, storage, or tracking."
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
      }
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
      @media (prefers-color-scheme: dark) {
        body { background: #151714; color: #eeeee9; }
        h1 { color: #ffffff; }
        .material { background: #20231f; border-color: #3c4339; }
        input, textarea { background: #10120f; color: #fff; border-color: #4a5247; }
      }
    `,
    script: `
      const form = document.getElementById("response-form");
      const status = document.getElementById("form-status");
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
          status.textContent = "Submitted. Thank you.";
          form.reset();
        } catch (error) {
          button.disabled = false;
          status.textContent = error && error.message ? error.message : "Could not submit.";
        }
      });
    `
  };
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
