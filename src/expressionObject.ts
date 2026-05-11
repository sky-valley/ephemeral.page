import { DurableObject } from "cloudflare:workers";
import { verifyCapability } from "./capabilities";
import { errorResponse, json, parseJson } from "./http";
import { MAX_INTERNAL_CREATE_BODY_BYTES, MAX_SUBMIT_BODY_BYTES } from "./limits";
import { deleteExpressionAssets } from "./materials";
import { activePage, terminalPage } from "./page";
import type {
  Env,
  ExpressionState,
  ResultEnvelope,
  StatusEnvelope
} from "./types";

const STATE_KEY = "state";

export class ExpressionObject extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  override async fetch(request: Request): Promise<Response> {
    try {
      return await this.route(request);
    } catch (error) {
      return errorResponse(error);
    }
  }

  private async route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path === "/create") {
      const payload = await parseJson<{ state: ExpressionState }>(request, { maxBytes: MAX_INTERNAL_CREATE_BODY_BYTES });
      await this.create(payload.state);
      return json({ ok: true });
    }

    if (request.method === "GET" && path === "/view") {
      return this.view(url.searchParams.get("token"));
    }

    if (request.method === "GET" && path.startsWith("/materials/")) {
      const materialId = decodeURIComponent(path.slice("/materials/".length));
      return this.material(materialId, url.searchParams.get("token"));
    }

    if (request.method === "POST" && path === "/submit") {
      const payload = await parseJson<{ result: unknown }>(request, { maxBytes: MAX_SUBMIT_BODY_BYTES });
      return this.submit(url.searchParams.get("token"), payload.result);
    }

    if (request.method === "GET" && path === "/status") {
      return this.status(url.searchParams.get("token"));
    }

    if (request.method === "GET" && path === "/result") {
      return this.result(url.searchParams.get("token"));
    }

    return json({ error: "Not found" }, { status: 404 });
  }

  override async alarm(): Promise<void> {
    const state = await this.ensureFreshState();
    if (state && state.status !== "purged") {
      await this.scheduleNextAlarm(state);
    }
  }

  private async create(state: ExpressionState): Promise<void> {
    const existing = await this.ctx.storage.get<ExpressionState>(STATE_KEY);
    if (existing) {
      return;
    }

    await this.ctx.storage.put(STATE_KEY, state);
    await this.scheduleNextAlarm(state);
  }

  private async view(token: string | null): Promise<Response> {
    const state = await this.ensureFreshState();
    if (!state || !(await verifyCapability(token, state.viewTokenHash))) {
      return json({ error: "Not found" }, { status: 404 });
    }

    if (state.status !== "active") {
      return terminalPage(state);
    }

    return activePage(state, token ?? "");
  }

  private async material(materialId: string, token: string | null): Promise<Response> {
    const state = await this.ensureFreshState();
    if (!state || state.status !== "active" || !(await verifyCapability(token, state.viewTokenHash))) {
      return json({ error: "Not found" }, { status: 404 });
    }

    const material = state.materials.find((item) => item.id === materialId);
    if (!material) {
      return json({ error: "Not found" }, { status: 404 });
    }

    const object = await this.env.EXPRESSION_ASSETS.get(material.r2Key);
    if (!object) {
      return json({ error: "Material unavailable" }, { status: 410 });
    }

    return new Response(object.body, {
      headers: {
        "content-type": material.contentType,
        "content-length": String(material.size),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }

  private async submit(token: string | null, result: unknown): Promise<Response> {
    const state = await this.ensureFreshState();
    if (!state || !(await verifyCapability(token, state.viewTokenHash))) {
      return json({ error: "Not found" }, { status: 404 });
    }

    if (state.status === "submitted") {
      return json({ error: "Expression already submitted" }, { status: 409 });
    }

    if (state.status === "expired" || state.status === "purged") {
      return json({ error: "Expression is no longer active" }, { status: 410 });
    }

    const submittedAt = new Date().toISOString();
    state.status = "submitted";
    state.submittedAt = submittedAt;
    state.result = result;
    state.cleanup.activeFlowClosed = true;
    state.cleanup.runtimeDeleted = true;
    state.cleanup.lastAttemptAt = submittedAt;

    await this.ctx.storage.put(STATE_KEY, state);
    await this.scheduleNextAlarm(state);

    return json({
      id: state.id,
      status: "submitted",
      submitted_at: submittedAt
    });
  }

  private async status(token: string | null): Promise<Response> {
    const state = await this.ensureFreshState();
    if (!state || !(await verifyCapability(token, state.agentTokenHash))) {
      return json({ error: "Not found" }, { status: 404 });
    }

    return json(statusEnvelope(state));
  }

  private async result(token: string | null): Promise<Response> {
    const state = await this.ensureFreshState();
    if (!state || !(await verifyCapability(token, state.agentTokenHash))) {
      return json({ error: "Not found" }, { status: 404 });
    }

    return json(resultEnvelope(state));
  }

  private async ensureFreshState(): Promise<ExpressionState | undefined> {
    const state = await this.ctx.storage.get<ExpressionState>(STATE_KEY);
    if (!state) return undefined;

    const now = Date.now();
    let changed = false;

    if (state.status === "active" && now >= Date.parse(state.expiresAt)) {
      state.status = "expired";
      state.cleanup.activeFlowClosed = true;
      changed = true;
    }

    if ((state.status === "expired" || state.status === "submitted") && !state.cleanup.runtimeDeleted) {
      state.cleanup.runtimeDeleted = true;
      state.cleanup.lastAttemptAt = new Date().toISOString();
      changed = true;
    }

    if ((state.status === "expired" || state.status === "submitted") && !state.cleanup.assetsDeleted) {
      try {
        await deleteExpressionAssets(this.env, state.materials);
        state.cleanup.assetsDeleted = true;
      } catch (error) {
        state.cleanup.errors.push(error instanceof Error ? error.message : "asset cleanup failed");
      }
      state.cleanup.lastAttemptAt = new Date().toISOString();
      changed = true;
    }

    if (state.status === "submitted" && now >= Date.parse(state.retentionEndsAt)) {
      state.status = "purged";
      state.result = undefined;
      state.cleanup.resultPurged = true;
      state.cleanup.lastAttemptAt = new Date().toISOString();
      changed = true;
    }

    if (changed) {
      await this.ctx.storage.put(STATE_KEY, state);
    }

    return state;
  }

  private async scheduleNextAlarm(state: ExpressionState): Promise<void> {
    const times = [Date.parse(state.expiresAt)];
    if (state.status === "submitted") {
      times.push(Date.parse(state.retentionEndsAt));
    }

    const next = times.filter((time) => Number.isFinite(time) && time > Date.now()).sort((a, b) => a - b)[0];
    if (next) {
      await this.ctx.storage.setAlarm(next);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }
}

function resultEnvelope(state: ExpressionState): ResultEnvelope {
  if (state.status === "active") {
    return {
      id: state.id,
      status: "pending",
      expires_at: state.expiresAt
    };
  }

  if (state.status === "submitted") {
    return {
      id: state.id,
      status: "submitted",
      submitted_at: state.submittedAt,
      expires_at: state.expiresAt,
      result: state.result
    };
  }

  if (state.status === "purged") {
    return {
      id: state.id,
      status: "gone",
      expires_at: state.expiresAt
    };
  }

  return {
    id: state.id,
    status: "expired",
    expires_at: state.expiresAt
  };
}

function statusEnvelope(state: ExpressionState): StatusEnvelope {
  const status = state.status === "purged" ? "gone" : state.status;
  return {
    id: state.id,
    status,
    expires_at: state.expiresAt,
    submitted_at: state.submittedAt
  };
}
