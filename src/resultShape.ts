const FIELD_NAME_PATTERN = /(?:^|[{\n,;])\s*["']?([A-Za-z_$][\w$ -]*)["']?\??\s*:/g;

const SECRET_FIELD_PATTERNS = [
  /\bpassword\b/,
  /\bpasscode\b/,
  /\bapi key\b/,
  /\bsecret(?: key)?\b/,
  /\bprivate key\b/,
  /\bseed phrase\b/,
  /\brecovery phrase\b/,
  /\boauth(?: code| token)?\b/,
  /\b(?:2fa|mfa)\b/,
  /\bverification code\b/,
  /\bone time code\b/,
  /\bssn\b/,
  /\bsocial security\b/,
  /\bcredit card\b/,
  /\bcard number\b/,
  /\bcvv\b/,
  /\bbank account\b/,
  /\brouting number\b/,
  /\btoken\b/
];

export function extractDesiredShapeFields(shape?: string): string[] {
  if (!shape) return [];
  const fields: string[] = [];
  for (const match of shape.matchAll(FIELD_NAME_PATTERN)) {
    fields.push(match[1].trim());
  }
  return fields;
}

export function desiredShapeHasSecretField(shape?: string): boolean {
  return extractDesiredShapeFields(shape).some(isSecretFieldName);
}

export function extractStringOptionsForField(shape: string | undefined, fieldName: string): string[] {
  if (!shape) return [];
  const escapedFieldName = escapeRegExp(fieldName);
  const fieldPattern = new RegExp(`["']?${escapedFieldName}["']?\\??\\s*:\\s*([^,}\\n;]+(?:\\|[^,}\\n;]+)*)`, "i");
  const field = fieldPattern.exec(shape);
  if (!field) return [];

  const options: string[] = [];
  for (const match of field[1].matchAll(/["']([^"']{1,80})["']/g)) {
    options.push(match[1]);
  }
  return options;
}

function isSecretFieldName(fieldName: string): boolean {
  const normalized = normalizeFieldName(fieldName);
  return SECRET_FIELD_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
