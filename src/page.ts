import { escapeHtml } from "./escape";
import type { ExpressionState } from "./types";

export function activePage(state: ExpressionState, viewToken: string): Response {
  const nonce = randomNonce();
  const submitPath = `/api/expressions/${encodeURIComponent(state.id)}/submit?token=${encodeURIComponent(viewToken)}`;
  const materialBase = `/e/${encodeURIComponent(state.id)}/${encodeURIComponent(viewToken)}/`;
  const body = state.page.bodyHtml.replaceAll('src="materials/', `src="${materialBase}materials/`).replaceAll('href="materials/', `href="${materialBase}materials/`);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(state.page.title)}</title>
  <style nonce="${nonce}">${state.page.css}</style>
</head>
<body>
  ${body}
  <script nonce="${nonce}">
    window.ephemeral = {
      async submit(result) {
        const response = await fetch(${JSON.stringify(submitPath)}, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ result })
        });
        if (!response.ok) {
          let message = "Submission failed";
          try {
            const data = await response.json();
            if (data && data.error) message = data.error;
          } catch {}
          throw new Error(message);
        }
        return response.json();
      }
    };
  </script>
  <script nonce="${nonce}">${state.page.script}</script>
</body>
</html>`;

  return new Response(html, {
    headers: pageHeaders(nonce)
  });
}

export function terminalPage(state: Pick<ExpressionState, "id" | "status" | "submittedAt" | "expiresAt">): Response {
  const title = state.status === "submitted" ? "Response submitted" : state.status === "purged" ? "Expression unavailable" : "Expression expired";
  const detail = terminalDetail(state);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f5ef; color: #202124; }
    main { width: min(560px, calc(100% - 32px)); }
    p { line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${detail}</p>
  </main>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
    }
  });
}

function terminalDetail(state: Pick<ExpressionState, "status" | "submittedAt" | "expiresAt">): string {
  if (state.status === "submitted") {
    return `This one-off page already received its response${state.submittedAt ? ` at ${escapeHtml(state.submittedAt)}` : ""}.`;
  }
  if (state.status === "purged") {
    return "This expression is no longer available.";
  }
  return `This one-off page expired at ${escapeHtml(state.expiresAt)}.`;
}

function pageHeaders(nonce: string): Headers {
  return new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "content-security-policy": [
      "default-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      `script-src 'nonce-${nonce}'`,
      `style-src 'nonce-${nonce}'`,
      "img-src 'self' data:",
      "media-src 'self'",
      "connect-src 'self'",
      "form-action 'self'"
    ].join("; ")
  });
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
