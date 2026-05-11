import { HttpError } from "./http";

const MAX_URL_LENGTH = 2_048;
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0"]);

export function validateExternalHttpsUrl(value: string, field: string): URL {
  if (value.length > MAX_URL_LENGTH) {
    throw new HttpError(400, `${field} is too long`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, `${field} must be a valid URL`);
  }

  if (url.protocol !== "https:") {
    throw new HttpError(400, `${field} must use https`);
  }

  if (url.username || url.password || url.hash) {
    throw new HttpError(400, `${field} cannot include credentials or a fragment`);
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new HttpError(400, `${field} cannot target local hostnames`);
  }

  if (isBlockedIpLiteral(hostname)) {
    throw new HttpError(400, `${field} cannot target private or reserved IP addresses`);
  }

  return url;
}

function isBlockedIpLiteral(hostname: string): boolean {
  if (hostname.includes(":")) {
    const normalized = hostname.replace(/^\[|\]$/g, "");
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd");
  }

  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^\d+$/.test(part))) {
    return false;
  }

  const [a, b] = parts.map(Number);
  if (parts.some((part) => Number(part) < 0 || Number(part) > 255)) {
    return true;
  }

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 192 && b === 0 ||
    a === 198 && (b === 18 || b === 19) ||
    a >= 224
  );
}
