import {
  MAX_PAGE_BODY_HTML_LENGTH,
  MAX_PAGE_CSS_LENGTH,
  MAX_PAGE_SCRIPT_LENGTH,
  MAX_PAGE_TITLE_LENGTH
} from "./limits";
import type { CreateExpressionRequest, PageComposition } from "./types";

export interface PolicyDecision {
  action: "allow" | "reject";
  labels: string[];
  reason?: string;
}

interface TextRule {
  label: string;
  reason: string;
  pattern?: RegExp;
  matches?: (value: string) => boolean;
}

const SENSITIVE_COLLECTION_REASON = "Expressions cannot collect secrets, passwords, private keys, seed phrases, OAuth codes, or API keys.";
const SENSITIVE_TERMS = /\b(password|passcode|api key|secret key|private key|seed phrase|recovery phrase|oauth|2fa|mfa|verification code|one-time code|ssn|social security|credit card|card number|cvv|bank account|routing number)\b/i;
const COLLECTION_ACTIONS = /\b(ask|asks|asking|collect|collects|enter|provide|paste|type|submit|share|send|request|capture|upload|verify|fill in|input)\b/i;

const INPUT_RULES: TextRule[] = [
  {
    label: "collects-secrets",
    reason: SENSITIVE_COLLECTION_REASON,
    matches: mentionsSensitiveCollection
  },
  {
    label: "login-or-impersonation",
    reason: "Expressions cannot create login, identity-verification, or brand-impersonation pages.",
    pattern: /\b(login|log in|sign in|verify your identity|impersonate|make it look like|pretend to be|github login|google login|stripe login|bank login)\b/i
  },
  {
    label: "deceptive-ui",
    reason: "Expressions cannot ask for deceptive UI, hidden choices, dark patterns, or automatic submission.",
    pattern: /\b(hide the reject|hide reject|make reject hard|trick the user|dark pattern|deceptive|mislead|auto-submit|autosubmit|submit automatically|without the user|without user action)\b/i
  }
];

const OUTPUT_RULES: Array<{ label: string; reason: string; pattern: RegExp; field: keyof PageComposition | "all" }> = [
  {
    label: "password-field",
    reason: "Generated pages cannot include password fields.",
    pattern: /<input\b[^>]*\btype\s*=\s*["']?password/i,
    field: "bodyHtml"
  },
  {
    label: "script-tag",
    reason: "Generated body HTML cannot include script tags.",
    pattern: /<script\b/i,
    field: "bodyHtml"
  },
  {
    label: "external-embed",
    reason: "Generated pages cannot embed iframes or external objects.",
    pattern: /<(iframe|object|embed)\b/i,
    field: "bodyHtml"
  },
  {
    label: "navigation",
    reason: "Generated scripts cannot navigate the top-level page or open new windows.",
    pattern: /\b(location\.href|location\.assign|location\.replace|window\.open)\b/i,
    field: "script"
  },
  {
    label: "browser-storage",
    reason: "Generated scripts cannot use cookies or browser storage.",
    pattern: /\b(document\.cookie|localStorage|sessionStorage|indexedDB)\b/i,
    field: "script"
  },
  {
    label: "dynamic-code",
    reason: "Generated scripts cannot use dynamic code execution.",
    pattern: /\b(eval|Function)\s*\(/i,
    field: "script"
  },
  {
    label: "external-fetch",
    reason: "Generated scripts cannot make backend calls except through window.ephemeral.submit.",
    pattern: /\bfetch\s*\(/i,
    field: "script"
  },
  {
    label: "timed-submit",
    reason: "Generated scripts cannot submit on timers or animation frames.",
    pattern: /\b(setTimeout|setInterval|requestAnimationFrame)\s*\([^)]*ephemeral\.submit/is,
    field: "script"
  },
  {
    label: "sensitive-copy",
    reason: "Generated pages cannot ask humans for secrets, payments, login credentials, or identity documents.",
    pattern: /\b(ask|enter|provide|paste|type|submit|share|send|upload|verify|input)\b[^.!?\n]{0,120}\b(password|api key|secret key|private key|seed phrase|oauth|2fa|mfa|ssn|social security|credit card|cvv|bank account|passport|driver'?s license)\b/i,
    field: "all"
  }
];

export function classifyCreateRequest(input: CreateExpressionRequest): PolicyDecision {
  const materialText = (input.materials ?? []).map((material) => `${material.type} ${material.label ?? ""} ${material.url}`).join("\n");
  const text = [input.intent, input.result?.desired_shape ?? "", materialText].join("\n");
  return classifyText(text, INPUT_RULES);
}

export function classifyComposition(page: PageComposition): PolicyDecision {
  if (page.title.length > MAX_PAGE_TITLE_LENGTH) {
    return reject("oversized-title", `Generated page title must be ${MAX_PAGE_TITLE_LENGTH} characters or fewer.`);
  }
  if (page.bodyHtml.length > MAX_PAGE_BODY_HTML_LENGTH) {
    return reject("oversized-body", `Generated body HTML must be ${MAX_PAGE_BODY_HTML_LENGTH} characters or fewer.`);
  }
  if (page.css.length > MAX_PAGE_CSS_LENGTH) {
    return reject("oversized-css", `Generated CSS must be ${MAX_PAGE_CSS_LENGTH} characters or fewer.`);
  }
  if (page.script.length > MAX_PAGE_SCRIPT_LENGTH) {
    return reject("oversized-script", `Generated script must be ${MAX_PAGE_SCRIPT_LENGTH} characters or fewer.`);
  }

  for (const rule of OUTPUT_RULES) {
    const value = rule.field === "all" ? `${page.title}\n${page.bodyHtml}\n${page.script}` : page[rule.field];
    if (rule.pattern.test(value)) {
      return reject(rule.label, rule.reason);
    }
  }

  if (page.script.includes("window.ephemeral.submit") && !/\baddEventListener\s*\(\s*["'](submit|click|change|input)["']/i.test(page.script)) {
    return reject("non-user-submit", "Generated scripts must submit only from an explicit user event handler.");
  }

  return { action: "allow", labels: [] };
}

function classifyText(
  value: string,
  rules: TextRule[]
): PolicyDecision {
  for (const rule of rules) {
    if (rule.matches ? rule.matches(value) : rule.pattern?.test(value)) {
      return reject(rule.label, rule.reason);
    }
  }
  return { action: "allow", labels: [] };
}

function mentionsSensitiveCollection(value: string): boolean {
  const chunks = value.split(/[\n.!?;]+/);
  return chunks.some((chunk) => SENSITIVE_TERMS.test(chunk) && COLLECTION_ACTIONS.test(chunk));
}

function reject(label: string, reason: string): PolicyDecision {
  return { action: "reject", labels: [label], reason };
}
