import { HttpError } from "./http";
import { effectiveExpressionMode } from "./preview";
import type { CreateExpressionRequest, MaterialInput } from "./types";
import { validateExternalHttpsUrl } from "./urlPolicy";

const MAX_INTENT_LENGTH = 4_000;
const MAX_DESIRED_SHAPE_LENGTH = 1_000;
const MAX_MATERIALS = 5;
const MAX_MATERIAL_TYPE_LENGTH = 80;
const MAX_MATERIAL_LABEL_LENGTH = 200;

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

  if (input.mode !== undefined && input.mode !== "interactive" && input.mode !== "preview") {
    throw new HttpError(400, 'mode must be "interactive" or "preview"');
  }

  if (input.interactive !== undefined && typeof input.interactive !== "boolean") {
    throw new HttpError(400, "interactive must be a boolean");
  }

  if (input.mode === "interactive" && input.interactive === false) {
    throw new HttpError(400, 'mode: "interactive" conflicts with interactive: false');
  }

  if (input.mode === "preview" && input.interactive === true) {
    throw new HttpError(400, 'mode: "preview" conflicts with interactive: true');
  }

  if (input.result !== undefined) {
    if (!input.result || typeof input.result !== "object" || Array.isArray(input.result)) {
      throw new HttpError(400, "result must be an object");
    }

    if (input.result.desired_shape !== undefined && typeof input.result.desired_shape !== "string") {
      throw new HttpError(400, "result.desired_shape must be a string");
    }

    if (input.result.desired_shape && input.result.desired_shape.length > MAX_DESIRED_SHAPE_LENGTH) {
      throw new HttpError(400, `result.desired_shape must be ${MAX_DESIRED_SHAPE_LENGTH} characters or fewer`);
    }

    if (input.result.callback_url !== undefined) {
      throw new HttpError(400, "result.callback_url is not enabled for this MVP; poll result_url instead");
    }
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

  return {
    ...input,
    mode: effectiveExpressionMode(input),
    interactive: effectiveExpressionMode(input) === "interactive",
    intent: input.intent.trim(),
    materials: input.materials ?? []
  };
}

function validateMaterial(material: MaterialInput, index: number): void {
  if (!material || typeof material !== "object") {
    throw new HttpError(400, `materials[${index}] must be an object`);
  }

  if (typeof material.type !== "string" || !material.type.trim()) {
    throw new HttpError(400, `materials[${index}].type is required`);
  }

  if (material.type.length > MAX_MATERIAL_TYPE_LENGTH) {
    throw new HttpError(400, `materials[${index}].type must be ${MAX_MATERIAL_TYPE_LENGTH} characters or fewer`);
  }

  if (typeof material.url !== "string" || !material.url.trim()) {
    throw new HttpError(400, `materials[${index}].url is required`);
  }

  validateExternalHttpsUrl(material.url, `materials[${index}].url`);

  if (material.label !== undefined && typeof material.label !== "string") {
    throw new HttpError(400, `materials[${index}].label must be a string`);
  }

  if (material.label && material.label.length > MAX_MATERIAL_LABEL_LENGTH) {
    throw new HttpError(400, `materials[${index}].label must be ${MAX_MATERIAL_LABEL_LENGTH} characters or fewer`);
  }
}
