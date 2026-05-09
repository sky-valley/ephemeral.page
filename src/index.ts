import { createCapability } from "./capabilities";
import { composePage } from "./composer";
import { parseDuration } from "./duration";
import { ExpressionObject } from "./expressionObject";
import { errorResponse, HttpError, json, parseJson } from "./http";
import { expressionId } from "./ids";
import { mirrorMaterials } from "./materials";
import {
  agentHomeResponse,
  apiCatalogResponse,
  humansRedirectResponse,
  humansResponse,
  llmsFullResponse,
  llmsTxtResponse,
  ogImageResponse,
  openApiResponse,
  publicOrigin,
  robotsResponse,
  sitemapResponse
} from "./publicDocs";
import { validateCreateRequest } from "./validation";
import type { CallbackAttempt, CreateExpressionRequest, Env, ExpressionState } from "./types";

export { ExpressionObject };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      return errorResponse(error);
    }
  },

  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      await deliverCallback(message.body as { expressionId: string }, env);
    }
  }
};

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = trimSlashes(url.pathname).split("/");
  const origin = publicOrigin(request, env.PUBLIC_ORIGIN);
  const isRead = request.method === "GET" || request.method === "HEAD";

  if (isRead && (url.pathname === "/" || url.pathname === "/AGENTS.md" || url.pathname === "/agents.md" || url.pathname === "/index.md")) {
    return maybeHead(request, agentHomeResponse(origin));
  }

  if (isRead && url.pathname === "/humans") {
    return maybeHead(request, humansRedirectResponse(origin));
  }

  if (isRead && (url.pathname === "/humans.html" || url.pathname === "/humans.md")) {
    return maybeHead(request, humansResponse(request, origin));
  }

  if (isRead && url.pathname === "/og-image.svg") {
    return maybeHead(request, ogImageResponse());
  }

  if (isRead && url.pathname === "/llms.txt") {
    return maybeHead(request, llmsTxtResponse(origin));
  }

  if (isRead && url.pathname === "/llms-full.txt") {
    return maybeHead(request, llmsFullResponse(origin));
  }

  if (isRead && (url.pathname === "/openapi.json" || url.pathname === "/.well-known/service-desc/openapi.json")) {
    return maybeHead(request, openApiResponse(origin));
  }

  if (isRead && url.pathname === "/.well-known/api-catalog") {
    return maybeHead(request, apiCatalogResponse(origin));
  }

  if (isRead && url.pathname === "/robots.txt") {
    return maybeHead(request, robotsResponse(origin));
  }

  if (isRead && url.pathname === "/sitemap.xml") {
    return maybeHead(request, sitemapResponse(origin));
  }

  if (request.method === "POST" && url.pathname === "/api/expressions") {
    return createExpression(request, env);
  }

  if (request.method === "GET" && path[0] === "e" && path[1] && path[2] && !path[3]) {
    return objectFetch(env, path[1], `/view?token=${encodeURIComponent(path[2])}`);
  }

  if (request.method === "GET" && path[0] === "e" && path[1] && path[2] && path[3] === "materials" && path[4]) {
    return objectFetch(env, path[1], `/materials/${encodeURIComponent(path[4])}?token=${encodeURIComponent(path[2])}`);
  }

  if (path[0] === "api" && path[1] === "expressions" && path[2]) {
    const id = path[2];
    if (request.method === "POST" && path[3] === "submit") {
      const token = url.searchParams.get("token") ?? bearerToken(request);
      return objectFetch(env, id, `/submit?token=${encodeURIComponent(token ?? "")}`, request);
    }

    if (request.method === "GET" && path[3] === "result") {
      const token = url.searchParams.get("token") ?? bearerToken(request);
      return objectFetch(env, id, `/result?token=${encodeURIComponent(token ?? "")}`);
    }

    if (request.method === "GET" && path[3] === "status") {
      const token = url.searchParams.get("token") ?? bearerToken(request);
      return objectFetch(env, id, `/status?token=${encodeURIComponent(token ?? "")}`);
    }
  }

  return json({ error: "Not found" }, { status: 404 });
}

async function createExpression(request: Request, env: Env): Promise<Response> {
  const body = validateCreateRequest(await parseJson<CreateExpressionRequest>(request));
  const id = expressionId();
  const now = Date.now();
  const expiresInMs = parseDuration(body.expires_in);
  const expiresAt = new Date(now + expiresInMs).toISOString();
  const viewCapability = await createCapability();
  const agentCapability = await createCapability();
  const materials = await mirrorMaterials(env, id, body.materials ?? []);
  const page = await composePage(
    env,
    {
      id,
      intent: body.intent,
      desiredShape: body.result?.desired_shape,
      materials
    },
    body
  );

  const state: ExpressionState = {
    id,
    status: "active",
    intent: body.intent,
    desiredShape: body.result?.desired_shape,
    callbackUrl: body.result?.callback_url,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    retentionEndsAt: expiresAt,
    viewTokenHash: viewCapability.hash,
    agentTokenHash: agentCapability.hash,
    materials,
    page,
    cleanup: {
      activeFlowClosed: false,
      runtimeDeleted: false,
      assetsDeleted: false,
      resultPurged: false,
      errors: []
    },
    callbackAttempts: []
  };

  await objectFetch(env, id, "/create", new Request("https://expression/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ state })
  }));

  const origin = publicOrigin(request, env.PUBLIC_ORIGIN);
  return json(
    {
      id,
      url: `${origin}/e/${id}/${viewCapability.token}`,
      result_url: `${origin}/api/expressions/${id}/result?token=${agentCapability.token}`,
      status_url: `${origin}/api/expressions/${id}/status?token=${agentCapability.token}`,
      expires_at: expiresAt
    },
    { status: 201 }
  );
}

async function objectFetch(env: Env, id: string, path: string, source?: Request): Promise<Response> {
  if (!id.startsWith("expr_")) {
    throw new HttpError(404, "Not found");
  }

  const durableId = env.EXPRESSIONS.idFromName(id);
  const stub = env.EXPRESSIONS.get(durableId);
  const init = source
    ? {
        method: source.method,
        headers: source.headers,
        body: source.body
      }
    : undefined;
  return stub.fetch(`https://expression${path}`, init);
}

async function deliverCallback(message: { expressionId: string }, env: Env): Promise<void> {
  const payloadResponse = await objectFetch(
    env,
    message.expressionId,
    "/callback-payload",
    new Request("https://expression/callback-payload", { method: "POST" })
  );
  const payload = (await payloadResponse.json()) as { callbackUrl?: string; result?: unknown };
  if (!payload.callbackUrl || !payload.result) {
    return;
  }

  const attemptedAt = new Date().toISOString();
  let attempt: CallbackAttempt;
  try {
    const response = await fetch(payload.callbackUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.result),
      redirect: "manual"
    });
    attempt = {
      attemptedAt,
      status: response.ok ? "success" : "failure",
      statusCode: response.status
    };
    if (!response.ok) {
      throw new Error(`Callback returned ${response.status}`);
    }
  } catch (error) {
    attempt = {
      attemptedAt,
      status: "failure",
      error: error instanceof Error ? error.message : "callback failed"
    };
    await recordCallbackAttempt(env, message.expressionId, attempt);
    throw error;
  }

  await recordCallbackAttempt(env, message.expressionId, attempt);
}

async function recordCallbackAttempt(env: Env, expressionId: string, attempt: CallbackAttempt): Promise<void> {
  await objectFetch(
    env,
    expressionId,
    "/callback-attempt",
    new Request("https://expression/callback-attempt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(attempt)
    })
  );
}

function trimSlashes(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, "");
}

function maybeHead(request: Request, response: Response): Response {
  if (request.method !== "HEAD") {
    return response;
  }
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice("Bearer ".length);
}
