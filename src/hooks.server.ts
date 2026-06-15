// The single auth/sandbox chokepoint — runs before every request.
//
// Today it resolves ONE thing: which per-device sandbox this browser owns, and
// who that device is signed in as. The resulting `locals.actor` is the unified
// identity every domain/permission check reads.
//
// Phase 2 (DioscHub) adds a second branch here: for `/api/*` requests carrying a
// bearer artifact, resolve `locals.actor` from the artifact (agent-as-user)
// instead of the device session. Nothing downstream changes.

import { getOrCreateDevice } from '$lib/server/sandbox/store';
import type { Handle } from '@sveltejs/kit';

const DEVICE_COOKIE = 'cadence_device';

export const handle: Handle = async ({ event, resolve }) => {
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

  const user = state.currentUserId ? state.users[state.currentUserId] ?? null : null;
  event.locals.user = user;
  event.locals.actor = user ? { userId: user.id, isAgent: false } : null;

  return resolve(event);
};
