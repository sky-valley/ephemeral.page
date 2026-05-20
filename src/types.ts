export interface Env {
  EXPRESSIONS: DurableObjectNamespace;
  CREATE_RATE_LIMITER: DurableObjectNamespace;
  EXPRESSION_ASSETS: R2Bucket;
  ASSETS?: Fetcher;
  AI?: Ai;
  PUBLIC_ORIGIN?: string;
  RUNTIME_DRIVER?: string;
  COMPOSER?: string;
  WORKERS_AI_MODEL?: string;
}

export type ExpressionStatus = "active" | "submitted" | "expired" | "purged";

export interface MaterialInput {
  type: string;
  url: string;
  label?: string;
}

export interface StoredMaterial {
  id: string;
  type: string;
  label?: string;
  sourceUrl: string;
  r2Key: string;
  contentType: string;
  size: number;
}

export type ExpressionMode = "interactive" | "preview";

export interface CreateExpressionRequest {
  intent: string;
  /**
   * `preview` renders supplied content as static/read-only material and only
   * collects the declared result shape.
   */
  mode?: ExpressionMode;
  /**
   * Compatibility alias for preview mode. `false` is equivalent to
   * `mode: "preview"`.
   */
  interactive?: boolean;
  materials?: MaterialInput[];
  result?: {
    desired_shape?: string;
    /**
     * Reserved for a future signed-webhook API. The MVP rejects this field and
     * uses polling as the only result-delivery path.
     */
    callback_url?: string;
  };
  expires_in?: string;
}

export interface CreateExpressionResponse {
  id: string;
  url: string;
  result_url: string;
  status_url: string;
  expires_at: string;
}

export interface PageComposition {
  title: string;
  bodyHtml: string;
  css: string;
  script: string;
}

export interface ExpressionState {
  id: string;
  status: ExpressionStatus;
  mode?: ExpressionMode;
  intent: string;
  desiredShape?: string;
  createdAt: string;
  expiresAt: string;
  submittedAt?: string;
  retentionEndsAt: string;
  viewTokenHash: string;
  agentTokenHash: string;
  materials: StoredMaterial[];
  page: PageComposition;
  result?: unknown;
  cleanup: CleanupState;
}

export interface CleanupState {
  activeFlowClosed: boolean;
  runtimeDeleted: boolean;
  assetsDeleted: boolean;
  resultPurged: boolean;
  lastAttemptAt?: string;
  errors: string[];
}

export interface ResultEnvelope {
  id: string;
  status: "pending" | "submitted" | "expired" | "gone";
  submitted_at?: string;
  expires_at: string;
  result?: unknown;
}

export interface StatusEnvelope {
  id: string;
  status: "active" | "submitted" | "expired" | "gone";
  expires_at: string;
  submitted_at?: string;
}

export interface InternalCreatePayload {
  state: ExpressionState;
}
