import { DurableObject } from "cloudflare:workers";
import { CREATE_RATE_LIMIT_MAX, CREATE_RATE_LIMIT_WINDOW_SECONDS } from "./limits";
import { HttpError } from "./http";
import type { Env } from "./types";

interface RateLimitState {
  windowStart: number;
  count: number;
}

const STATE_KEY = "rate-limit";

export class CreateRateLimiter extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    const now = Date.now();
    const windowMs = CREATE_RATE_LIMIT_WINDOW_SECONDS * 1000;
    const current = await this.ctx.storage.get<RateLimitState>(STATE_KEY);
    const state = current && now - current.windowStart < windowMs
      ? current
      : { windowStart: now, count: 0 };

    state.count += 1;
    await this.ctx.storage.put(STATE_KEY, state);

    if (state.count > CREATE_RATE_LIMIT_MAX) {
      const retryAfter = Math.max(1, Math.ceil((state.windowStart + windowMs - now) / 1000));
      return Response.json(
        { allowed: false, retry_after: retryAfter },
        {
          status: 429,
          headers: { "retry-after": String(retryAfter) }
        }
      );
    }

    return Response.json({ allowed: true });
  }
}

export async function enforceCreateRateLimit(request: Request, env: Env): Promise<void> {
  const key = await rateLimitKey(request);
  const id = env.CREATE_RATE_LIMITER.idFromName(key);
  const response = await env.CREATE_RATE_LIMITER.get(id).fetch("https://rate-limit/check", { method: "POST" });
  if (response.status !== 429) {
    return;
  }

  const retryAfter = response.headers.get("retry-after") ?? String(CREATE_RATE_LIMIT_WINDOW_SECONDS);
  throw new HttpError(429, `Too many expression create requests. Try again in ${retryAfter} seconds.`, {
    "retry-after": retryAfter
  });
}

async function rateLimitKey(request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const encoded = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
