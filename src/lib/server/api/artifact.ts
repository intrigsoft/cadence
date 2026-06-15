// The BYOA auth artifact — phase 2 (see design/PHASE-2-ASSISTANT-INTEGRATION.md §4).
//
// In production this is the host app's session/SSO artifact, passed opaquely
// from the frontend through DioscHub to the MCP relay and back to this backend.
// DioscHub and the LLM never inspect it — it's credential-blind pass-through.
//
// For this sample we mint a self-contained HMAC-signed token that binds the
// acting identity to a specific per-device sandbox: { deviceId, userId, exp }.
// The deviceId is what lets the assistant act on the SAME sandbox the human is
// looking at (there is no shared database). Tamper or expiry => the artifact is
// rejected and the machine API answers 401 (AUTH_REQUIRED).

import crypto from 'node:crypto';

const SECRET = process.env.CADENCE_ARTIFACT_SECRET || 'dev-insecure-cadence-artifact-secret';
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8h — a working session

export interface ArtifactClaims {
  deviceId: string;
  userId: string;
}

interface Payload extends ArtifactClaims {
  exp: number; // epoch ms
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(payloadB64: string): string {
  return crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

/** Mint an opaque bearer artifact for an identity bound to a device sandbox. */
export function mintArtifact(claims: ArtifactClaims, ttlMs: number = DEFAULT_TTL_MS): { artifact: string; expiresAt: string } {
  const exp = Date.now() + ttlMs;
  const payload: Payload = { ...claims, exp };
  const payloadB64 = b64url(JSON.stringify(payload));
  const artifact = `${payloadB64}.${sign(payloadB64)}`;
  return { artifact, expiresAt: new Date(exp).toISOString() };
}

/** Verify + decode an artifact. Returns the claims, or null if invalid/expired. */
export function verifyArtifact(token: string | null | undefined): ArtifactClaims | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  // Constant-time signature comparison.
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Payload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (!payload.deviceId || !payload.userId) return null;
    return { deviceId: payload.deviceId, userId: payload.userId };
  } catch {
    return null;
  }
}
