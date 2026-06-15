// The machine-API response contract (design/PHASE-2-ASSISTANT-INTEGRATION.md §7).
//
// Every /api/v1 route runs its domain call through `handle()`. Success and every
// failure come back in ONE shape the assistant can branch on:
//
//   success  -> { ok: true,  data }
//   failure  -> { ok: false, code, message, retryable }
//
// The NotFound-vs-Forbidden split is preserved deliberately: a hidden resource
// is NOT_FOUND (vague — no existence leak), a permission denial on a visible one
// is a precise *_DENIED code (safe to explain — it's the caller's own standing).

import { json } from '@sveltejs/kit';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError, type ErrorCode } from '../errors';
import type { Actor, WorkspaceState } from '../types';

const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>(['VALIDATION']);

export function ok(data: unknown, status = 200): Response {
  return json({ ok: true, data }, { status });
}

export function fail(code: ErrorCode, message: string, status: number): Response {
  return json({ ok: false, code, message, retryable: RETRYABLE.has(code) }, { status });
}

/** Translate a thrown domain error into the contract. Unknown errors => 500 INTERNAL. */
export function failFrom(err: unknown): Response {
  if (err instanceof NotFoundError || err instanceof ForbiddenError || err instanceof ValidationError || err instanceof UnauthorizedError) {
    return fail(err.code, err.message, err.status);
  }
  // Never leak an internal stack/shape to the model.
  return fail('INTERNAL', 'Something went wrong handling this request.', 500);
}

type LocalsLike = { actor: Actor | null; state: WorkspaceState };

/**
 * Run a domain call with the contract applied. Requires a resolved actor
 * (human or agent); a missing actor is AUTH_REQUIRED. The callback gets the
 * device state + actor and returns the success payload (sync — domain ops are).
 */
export function handle(locals: LocalsLike, fn: (state: WorkspaceState, actor: Actor) => unknown, successStatus = 200): Response {
  if (!locals.actor) return fail('AUTH_REQUIRED', 'No valid identity for this request.', 401);
  try {
    return ok(fn(locals.state, locals.actor), successStatus);
  } catch (err) {
    return failFrom(err);
  }
}

/** Parse a JSON body, throwing ValidationError on malformed input. */
export async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError('Request body must be valid JSON');
  }
}
