import { randomToken } from "./ids";

export interface CapabilityPair {
  token: string;
  hash: string;
}

export async function createCapability(): Promise<CapabilityPair> {
  const token = randomToken(32);
  return { token, hash: await hashCapability(token) };
}

export async function hashCapability(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64Url(new Uint8Array(digest));
}

export async function verifyCapability(token: string | null, expectedHash: string): Promise<boolean> {
  if (!token) return false;
  return (await hashCapability(token)) === expectedHash;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
