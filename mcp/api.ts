// HTTP client from the MCP relay to Cadence's machine API.
//
// The relay NEVER sends "who I am" as a parameter — identity is the BYOA
// artifact. With DioscHub the artifact arrives PER CALL inside the MCP request
// `_meta.headers.Authorization` (the hub injects the session's bound auth on
// every tool call). For local stdio testing it falls back to the CADENCE_ARTIFACT
// env var. Either way the relay just forwards it as a bearer and hands the
// structured result back to the model.

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const BASE = (process.env.CADENCE_API_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const ENV_ARTIFACT = process.env.CADENCE_ARTIFACT ?? '';

export interface ApiResult {
  ok: boolean;
  data?: unknown;
  code?: string;
  message?: string;
  retryable?: boolean;
  status: number;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

/** The per-call request context the SDK hands a tool callback. */
export interface ToolExtra {
  _meta?: { headers?: Record<string, string>; [k: string]: unknown };
}

/** Pull the BYOA artifact for this call: per-call _meta header first, env fallback. */
export function artifactFor(extra?: ToolExtra): string {
  const headers = extra?._meta?.headers ?? {};
  const auth = headers.Authorization ?? headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return ENV_ARTIFACT;
}

export async function call(method: Method, path: string, payload: unknown, artifact: string): Promise<ApiResult> {
  const headers: Record<string, string> = { authorization: `Bearer ${artifact}` };
  if (payload !== undefined) headers['content-type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers,
      body: payload !== undefined ? JSON.stringify(payload) : undefined
    });
  } catch (err) {
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
 * Convert a machine-API result into an MCP tool result. Success returns the data
 * as JSON text; failure returns the structured contract ({code, message,
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

/** Resolve the artifact for this call, hit the API, and map to a tool result. */
export async function relay(extra: ToolExtra | undefined, method: Method, path: string, payload?: unknown): Promise<CallToolResult> {
  return toToolResult(await call(method, path, payload, artifactFor(extra)));
}

export function enc(segment: string): string {
  return encodeURIComponent(segment);
}
