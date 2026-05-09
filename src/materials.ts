import { HttpError } from "./http";
import { materialId } from "./ids";
import type { Env, MaterialInput, StoredMaterial } from "./types";

const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;
const MIRROR_TIMEOUT_MS = 5_000;
const ALLOWED_PREFIXES = ["audio/", "image/", "video/", "text/", "application/pdf"];

export async function mirrorMaterials(
  env: Env,
  expressionId: string,
  materials: MaterialInput[]
): Promise<StoredMaterial[]> {
  const stored: StoredMaterial[] = [];
  for (let index = 0; index < materials.length; index += 1) {
    stored.push(await mirrorMaterial(env, expressionId, materials[index], index));
  }
  return stored;
}

async function mirrorMaterial(
  env: Env,
  expressionId: string,
  material: MaterialInput,
  index: number
): Promise<StoredMaterial> {
  const id = materialId(index);
  const response = await fetchWithTimeout(material.url);
  if (!response.ok) {
    throw new HttpError(502, `Could not fetch material ${id}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
  if (!ALLOWED_PREFIXES.some((prefix) => contentType === prefix || contentType.startsWith(prefix))) {
    throw new HttpError(400, `Unsupported material content type for ${id}`);
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_MATERIAL_BYTES) {
    throw new HttpError(400, `Material ${id} exceeds the ${MAX_MATERIAL_BYTES} byte limit`);
  }

  const r2Key = `expressions/${expressionId}/materials/${id}`;
  await env.EXPRESSION_ASSETS.put(r2Key, bytes, {
    httpMetadata: { contentType }
  });

  return {
    id,
    type: material.type,
    label: material.label,
    sourceUrl: material.url,
    r2Key,
    contentType,
    size: bytes.byteLength
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MIRROR_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "ephemeral.page material mirror"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new HttpError(502, `Could not fetch material: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function deleteExpressionAssets(env: Env, materials: StoredMaterial[]): Promise<void> {
  await Promise.all(materials.map((material) => env.EXPRESSION_ASSETS.delete(material.r2Key)));
}
