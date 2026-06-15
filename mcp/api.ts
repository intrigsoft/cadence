// HTTP client from the MCP relay to Cadence's machine API.
//
// The relay holds the BYOA artifact (CADENCE_ARTIFACT) and presents it as a
// bearer on every call. It NEVER sends "who I am" as a parameter — identity is
// the artifact. Cadence resolves the actor and enforces per-call; the relay just
// forwards the structured result to the model.

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const BASE = (process.env.CADENCE_API_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const ARTIFACT = process.env.CADENCE_ARTIFACT ?? '';

export interface ApiResult {
  ok: boolean;
  data?: unknown;
  code?: string;
  message?: string;
  retryable?: boolean;
  status: number;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

export async function call(method: Method, path: string, payload?: unknown): Promise<ApiResult> {
  const headers: Record<string, string> = { authorization: `Bearer ${ARTIFACT}` };
  if (payload !== undefined) headers['content-type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers,
      body: payload !== undefined ? JSON.stringify(payload) : undefined
    });
  } catch (err) {
    // Transport failure is distinct from a domain denial — say so plainly.
    return { ok: false, code: 'UNREACHABLE', message: `Cadence API unreachable: ${(err as Error).message}`, retryable: true, status: 0 };
  }

  let json: Partial<ApiResult> = {};
  try {
    json = (await res.json()) as Partial<ApiResult>;
  } catch {
    json = { ok: res.ok };
  }
  return { ok: !!json.ok, data: json.data, code: json.code, message: json.message, retryable: json.retryable, status: res.status };
}

/**
 * Convert a machine-API result into an MCP tool result. Success returns the
 * data as JSON text; failure returns the structured contract ({code, message,
 * retryable}) AND sets isError, so the model sees *why* it failed and can decide
 * to explain, retry, or report a partial outcome.
 */
export function toToolResult(api: ApiResult): CallToolResult {
  if (api.ok) {
    return { content: [{ type: 'text', text: JSON.stringify(api.data ?? null) }] };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: { code: api.code ?? 'INTERNAL', message: api.message ?? 'Request failed', retryable: api.retryable ?? false } }) }],
    isError: true
  };
}

/** Convenience: call + map in one step. */
export async function relay(method: Method, path: string, payload?: unknown): Promise<CallToolResult> {
  return toToolResult(await call(method, path, payload));
}

export function enc(segment: string): string {
  return encodeURIComponent(segment);
}
