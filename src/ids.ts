const BASE64URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function randomToken(bytes = 32): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let output = "";
  for (const byte of data) {
    output += BASE64URL_CHARS[byte & 63];
  }
  return output;
}

export function expressionId(): string {
  return `expr_${randomToken(18)}`;
}

export function materialId(index: number): string {
  return `mat_${index + 1}`;
}
