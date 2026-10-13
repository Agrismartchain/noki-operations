export const MAX_LOGIN_BODY_BYTES = 4096;
export const MAX_MFA_BODY_BYTES = 1024;
const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 256;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Reads a request body as text while rejecting oversized payloads. Checks
 * the declared Content-Length first (cheap rejection), then re-checks the
 * actual decoded length in case Content-Length was absent or understated.
 */
export async function readBoundedBody(request: Request, maxBytes: number): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return null;
  }

  const text = await request.text();
  if (text.length > maxBytes) {
    return null;
  }

  return text;
}

export interface LoginBody {
  email: string;
  password: string;
}

/** Validates the parsed body against LoginRequestDto's real shape only: email + password, nothing else. */
export function parseLoginBody(value: unknown): LoginBody | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("email") || !keys.includes("password")) {
    return null;
  }

  const { email, password } = value as Record<string, unknown>;

  if (typeof email !== "string" || email.length === 0 || email.length > MAX_EMAIL_LENGTH) {
    return null;
  }
  if (!EMAIL_PATTERN.test(email)) {
    return null;
  }
  if (typeof password !== "string" || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    return null;
  }

  return { email, password };
}

export interface MfaProofBody {
  code?: string;
  recoveryCode?: string;
}

/** Accepts exactly one of: a 6-digit authenticator code or a recovery code. Nothing else may be present. */
export function parseMfaProofBody(value: unknown): MfaProofBody | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || !(keys[0] === "code" || keys[0] === "recoveryCode")) {
    return null;
  }
  const { code, recoveryCode } = value as Record<string, unknown>;
  if (keys[0] === "code") {
    return typeof code === "string" && /^\d{6}$/.test(code) ? { code } : null;
  }
  return typeof recoveryCode === "string" && /^[A-Za-z0-9 -]{8,32}$/.test(recoveryCode) ? { recoveryCode } : null;
}

export function parseMfaCodeOnlyBody(value: unknown): { code: string } | null {
  const parsed = parseMfaProofBody(value);
  return parsed?.code ? { code: parsed.code } : null;
}
