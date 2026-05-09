export interface Env {
  EXPRESSIONS: DurableObjectNamespace;
  EXPRESSION_ASSETS: R2Bucket;
  CALLBACK_QUEUE: Queue<CallbackMessage>;
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

export interface CreateExpressionRequest {
  intent: string;
  materials?: MaterialInput[];
  result?: {
    desired_shape?: string;
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
  intent: string;
  desiredShape?: string;
  callbackUrl?: string;
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
  callbackAttempts: CallbackAttempt[];
}

export interface CleanupState {
  activeFlowClosed: boolean;
  runtimeDeleted: boolean;
  assetsDeleted: boolean;
  resultPurged: boolean;
  lastAttemptAt?: string;
  errors: string[];
}

export interface CallbackAttempt {
  attemptedAt: string;
  status: "success" | "failure";
  statusCode?: number;
  error?: string;
}

export interface CallbackMessage {
  expressionId: string;
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

export interface CallbackPayload {
  callbackUrl?: string;
  result?: ResultEnvelope;
}
