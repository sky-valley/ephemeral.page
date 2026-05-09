import { HttpError } from "./http";
import type { CreateExpressionRequest, MaterialInput } from "./types";

const MAX_INTENT_LENGTH = 4_000;
const MAX_DESIRED_SHAPE_LENGTH = 1_000;
const MAX_MATERIALS = 5;

export function validateCreateRequest(input: CreateExpressionRequest): CreateExpressionRequest {
  if (!input || typeof input !== "object") {
    throw new HttpError(400, "Request body must be an object");
  }

  if (typeof input.intent !== "string" || !input.intent.trim()) {
    throw new HttpError(400, "intent is required");
  }

  if (input.intent.length > MAX_INTENT_LENGTH) {
    throw new HttpError(400, `intent must be ${MAX_INTENT_LENGTH} characters or fewer`);
  }

  if (input.result?.desired_shape && input.result.desired_shape.length > MAX_DESIRED_SHAPE_LENGTH) {
    throw new HttpError(400, `result.desired_shape must be ${MAX_DESIRED_SHAPE_LENGTH} characters or fewer`);
  }

  if (input.materials !== undefined) {
    if (!Array.isArray(input.materials)) {
      throw new HttpError(400, "materials must be an array");
    }

    if (input.materials.length > MAX_MATERIALS) {
      throw new HttpError(400, `materials must include ${MAX_MATERIALS} items or fewer`);
    }

    input.materials.forEach(validateMaterial);
  }

  if (input.result?.callback_url) {
    validateCallbackUrl(input.result.callback_url);
  }

  return {
    ...input,
    intent: input.intent.trim(),
    materials: input.materials ?? []
  };
}

export function validateCallbackUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, "result.callback_url must be a valid URL");
  }

  if (url.protocol !== "https:") {
    throw new HttpError(400, "result.callback_url must use https");
  }

  if (url.username || url.password || url.hash) {
    throw new HttpError(400, "result.callback_url cannot include credentials or a fragment");
  }

  if (value.length > 2_048) {
    throw new HttpError(400, "result.callback_url is too long");
  }

  return url;
}

function validateMaterial(material: MaterialInput, index: number): void {
  if (!material || typeof material !== "object") {
    throw new HttpError(400, `materials[${index}] must be an object`);
  }

  if (typeof material.type !== "string" || !material.type.trim()) {
    throw new HttpError(400, `materials[${index}].type is required`);
  }

  if (typeof material.url !== "string" || !material.url.trim()) {
    throw new HttpError(400, `materials[${index}].url is required`);
  }

  let url: URL;
  try {
    url = new URL(material.url);
  } catch {
    throw new HttpError(400, `materials[${index}].url must be a valid URL`);
  }

  if (url.protocol !== "https:") {
    throw new HttpError(400, `materials[${index}].url must use https`);
  }

  if (material.label !== undefined && typeof material.label !== "string") {
    throw new HttpError(400, `materials[${index}].label must be a string`);
  }
}
