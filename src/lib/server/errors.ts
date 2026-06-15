// Domain errors mapped to HTTP semantics + the LLM error contract by the route
// layer (see design/PHASE-2-ASSISTANT-INTEGRATION.md §7).
//
// Convention from design/API_CONTRACT.md: prefer 404 over 403 for boards the
// actor isn't a member of, so existence isn't leaked. Each error carries a
// machine-readable `code` so the assistant can branch on *why* a call failed
// without parsing prose.

/** Machine-branchable failure codes surfaced to the LLM. */
export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'WORKFLOW_PICK_DENIED'
  | 'WORKFLOW_DROP_DENIED'
  | 'WORKFLOW_REORDER_DENIED'
  | 'TRACK_DENIED'
  | 'ADMIN_REQUIRED'
  | 'APPROVAL_REQUIRED'
  | 'INTERNAL';

export class NotFoundError extends Error {
  readonly status = 404;
  readonly code: ErrorCode = 'NOT_FOUND';
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  readonly code: ErrorCode;
  // Forbidden is the one case where being specific is safe (it's the user's own
  // standing, on a resource they CAN see) — so it carries a precise code.
  constructor(message = 'Forbidden', code: ErrorCode = 'FORBIDDEN') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = code;
  }
}

export class ValidationError extends Error {
  readonly status = 422;
  readonly code: ErrorCode = 'VALIDATION';
  constructor(message = 'Invalid request') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  readonly code: ErrorCode = 'AUTH_REQUIRED';
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
