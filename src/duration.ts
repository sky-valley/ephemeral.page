import { HttpError } from "./http";
import { MAX_EXPRESSION_LIFETIME_LABEL, MAX_EXPRESSION_LIFETIME_MS } from "./limits";

const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/;
const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000
};

export function parseDuration(value: unknown, defaultValue = "24h"): number {
  const raw = typeof value === "string" && value.trim() ? value.trim() : defaultValue;
  const match = raw.match(DURATION_PATTERN);
  if (!match) {
    throw new HttpError(400, "expires_in must be a duration like 30s, 15m, or 24h");
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const millis = amount * UNIT_MS[unit];
  if (!Number.isSafeInteger(millis) || millis < 1) {
    throw new HttpError(400, "expires_in must be at least 1ms");
  }

  if (millis > MAX_EXPRESSION_LIFETIME_MS) {
    throw new HttpError(400, `expires_in must be ${MAX_EXPRESSION_LIFETIME_LABEL} or less`);
  }

  return millis;
}
