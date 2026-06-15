// POST /api/v1/dev/artifact — DEV-ONLY headless artifact minting.
//
// Lets you exercise the MCP server without a browser: it spins up a fresh device
// sandbox, signs in as a seeded user, and returns an artifact bound to it.
// DOUBLE-GATED: only when running the dev server AND CADENCE_DEV_ARTIFACT=1.
// In any built/preview/production bundle it answers 404 — it must never ship
// reachable (cf. the "unguarded /test routes in prod" class of defect).
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { mintArtifact } from '$lib/server/api/artifact';
import { fail } from '$lib/server/api/respond';
import { signIn } from '$lib/server/domain';
import { getOrCreateDevice } from '$lib/server/sandbox/store';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  if (!(dev && process.env.CADENCE_DEV_ARTIFACT === '1')) return fail('NOT_FOUND', 'Not found', 404);

  let userId = 'u_sarah'; // default: an admin, so manage-tier tools are testable
  try {
    const parsed = (await request.json()) as { userId?: string };
    if (parsed?.userId) userId = parsed.userId;
  } catch {
    // empty body is fine — use the default
  }

  const { deviceId, state } = getOrCreateDevice(undefined);
  try {
    signIn(state, userId);
  } catch {
    return fail('VALIDATION', `Unknown userId "${userId}"`, 422);
  }
  const { artifact, expiresAt } = mintArtifact({ deviceId, userId });
  return json({ ok: true, data: { artifact, expiresAt, deviceId, userId } });
};
