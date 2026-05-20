import type { CreateExpressionRequest, ExpressionMode } from "./types";

const PREVIEW_VERBS = /\b(render|show|display|preview|present)\b/i;
const PREVIEW_OBJECTS = /\b(email|message|copy|content|draft|preview card|static preview|already[- ]written)\b/i;
const STATIC_PREVIEW_SIGNALS = /\b(static|read[- ]only|non[- ]interactive|preview card|not a form|not a functional page|email below|following email|content below|already[- ]written)\b/i;

const CONTENT_MARKERS = [
  /(?:email|message|content|draft)\s+below\s*:\s*/i,
  /(?:email|message|content|draft)\s+below\s*\n+/i,
  /following\s+(?:email|message|content|draft)\s*:?\s*/i,
  /preview\s+(?:this|the)\s+(?:email|message|content|draft)\s*:?\s*/i
];

export function effectiveExpressionMode(input: Pick<CreateExpressionRequest, "mode" | "interactive">): ExpressionMode {
  if (input.mode) return input.mode;
  return input.interactive === false ? "preview" : "interactive";
}

export function shouldUsePreviewMode(input: Pick<CreateExpressionRequest, "mode" | "interactive" | "intent">): boolean {
  return effectiveExpressionMode(input) === "preview" || isStaticPreviewIntent(input.intent);
}

export function isStaticPreviewIntent(intent: string): boolean {
  return PREVIEW_VERBS.test(intent) && PREVIEW_OBJECTS.test(intent) && STATIC_PREVIEW_SIGNALS.test(intent);
}

export function extractPreviewText(intent: string): string {
  const start = previewContentStart(intent);
  if (start !== null) {
    const content = intent.slice(start).trim();
    if (content) return content;
  }
  return intent.trim();
}

export function extractPreviewInstructionText(intent: string): string {
  const start = previewContentStart(intent);
  if (start === null) return intent.trim();
  return intent.slice(0, start).trim();
}

function previewContentStart(intent: string): number | null {
  for (const marker of CONTENT_MARKERS) {
    const match = marker.exec(intent);
    if (match) {
      return match.index + match[0].length;
    }
  }
  const blankLine = /\n\s*\n/.exec(intent);
  if (blankLine) {
    return blankLine.index + blankLine[0].length;
  }
  return null;
}
