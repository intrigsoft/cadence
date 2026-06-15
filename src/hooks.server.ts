// The single auth/sandbox chokepoint — runs before every request.
//
// Two branches resolve the unified `locals.actor` every domain/permission check
// reads:
//
//  1. MACHINE (phase 2 / DioscHub) — an `/api/*` request carrying a bearer
//     artifact. The artifact binds an identity to a device sandbox; the actor is
//     resolved agent-as-user (`isAgent:true`). This is the credential-blind seam
//     — identity arrives in the artifact, never as a request parameter.
//  2. HUMAN — every other request resolves the per-device sandbox from the
//     `cadence_device` cookie and the identity it's signed in as (`isAgent:false`).
//
// Downstream, nothing distinguishes the two beyond `actor.isAgent` (which only
// affects audit attribution). Same domain functions, same gates.

import { getDevice, getOrCreateDevice } from '$lib/server/sandbox/store';
import { verifyArtifact } from '$lib/server/api/artifact';
import type { Handle } from '@sveltejs/kit';

const DEVICE_COOKIE = 'cadence_device';

export const handle: Handle = async ({ event, resolve }) => {
  const isApi = event.url.pathname.startsWith('/api/');
  const bearer = event.request.headers.get('authorization');

  // --- Branch 1: machine / agent-as-user via bearer artifact ----------------
  if (isApi && bearer?.startsWith('Bearer ')) {
    const claims = verifyArtifact(bearer.slice(7).trim());
    const state = claims ? getDevice(claims.deviceId) : null;
    const user = state && claims ? state.users[claims.userId] ?? null : null;

    if (state && user) {
      event.locals.deviceId = claims!.deviceId;
      event.locals.state = state;
      event.locals.authed = true;
      event.locals.user = user;
      event.locals.actor = { userId: user.id, isAgent: true };
      return resolve(event);
    }

    // Invalid / expired / unknown artifact: an unauthenticated machine context.
    // A throwaway sandbox satisfies the Locals type; actor stays null so the
    // route answers 401 (AUTH_REQUIRED). Throwaways are TTL-evicted.
    const fresh = getOrCreateDevice(undefined);
    event.locals.deviceId = fresh.deviceId;
    event.locals.state = fresh.state;
    event.locals.authed = false;
    event.locals.user = null;
    event.locals.actor = null;
    return resolve(event);
  }

  // --- Branch 2: human / device cookie --------------------------------------
  const { deviceId, state, isNew } = getOrCreateDevice(event.cookies.get(DEVICE_COOKIE));
  if (isNew) {
    event.cookies.set(DEVICE_COOKIE, deviceId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !event.url.hostname.includes('localhost'),
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
  }

  event.locals.deviceId = deviceId;
  event.locals.state = state;
  event.locals.authed = state.authed;

  const user = state.authed && state.currentUserId ? state.users[state.currentUserId] ?? null : null;
  event.locals.user = user;
  event.locals.actor = user ? { userId: user.id, isAgent: false } : null;

  return resolve(event);
};
