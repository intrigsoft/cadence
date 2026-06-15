// POST /api/diosc/bind — the host bind endpoint the DioscHub assistant-kit calls.
//
// The kit POSTs { wsId } here (with credentials, so the device cookie flows). We
// resolve the signed-in user from that cookie, mint a Cadence BYOA artifact bound
// to THIS device + user, and forward it to the hub's POST /auth/bind authenticated
// with our embed key. The hub then injects the artifact into every MCP tool call's
// _meta — so the assistant acts as this user on this device's sandbox.
//
// This is the credential-blind seam: the hub/LLM never see the user's identity
// except as an opaque artifact we mint here.
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { mintArtifact } from '$lib/server/api/artifact';
import { fail } from '$lib/server/api/respond';
import type { RequestHandler } from './$types';

const HUB_URL = (env.DIOSC_HUB_URL ?? 'http://localhost:3333').replace(/\/$/, '');
const EMBED_KEY = env.DIOSC_EMBED_KEY ?? '';

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || locals.actor?.isAgent) {
    return fail('AUTH_REQUIRED', 'Sign in before binding the assistant.', 401);
  }
  if (!EMBED_KEY) {
    return fail('INTERNAL', 'DIOSC_EMBED_KEY is not configured.', 500);
  }

  let wsId = '';
  try {
    const parsed = (await request.json()) as { wsId?: string } | null;
    wsId = parsed?.wsId ?? '';
  } catch {
    /* empty body → wsId stays '' */
  }
  if (!wsId) return fail('VALIDATION', 'wsId is required.', 422);

  const { artifact } = mintArtifact({ deviceId: locals.deviceId, userId: locals.user.id });

  const res = await fetch(`${HUB_URL}/api/auth/bind`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': EMBED_KEY },
    body: JSON.stringify({
      wsId,
      identity: {
        userId: locals.user.id,
        username: locals.user.name,
        role: { id: locals.user.role, name: locals.user.role }
      },
      authArtifacts: { headers: { Authorization: `Bearer ${artifact}` } }
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return fail('INTERNAL', `Hub bind failed (${res.status}): ${detail.slice(0, 200)}`, 502);
  }
  return json({ ok: true });
};
