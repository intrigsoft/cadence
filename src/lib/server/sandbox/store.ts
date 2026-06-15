// Per-device sandbox store — the in-memory replacement for a database.
//
// Each browser gets an opaque device id (cookie) mapped to its own isolated
// WorkspaceState (a fresh deep clone of the seed). This mirrors how the
// Northwind sample isolates per cookie. Bounded by TTL-idle eviction + a hard
// device cap so a public sandbox can't leak memory.
//
// Tradeoff (acceptable for a demo): a process restart wipes every sandbox back
// to seed. No persistence layer by design — there is no database.

import { buildSeed } from './seed';
import type { WorkspaceState } from '../types';

const DEVICES = new Map<string, WorkspaceState>();

const IDLE_TTL_MS = 2 * 60 * 60 * 1000; // evict a sandbox after 2h idle
const MAX_DEVICES = 2000; // hard cap; evict least-recently-seen beyond this

function now(): number {
  return Date.now();
}

function freshState(): WorkspaceState {
  const state = buildSeed();
  state.createdAt = now();
  state.lastSeen = now();
  return state;
}

export interface DeviceResolution {
  deviceId: string;
  state: WorkspaceState;
  isNew: boolean;
}

/**
 * Resolve the sandbox for a device cookie, minting a fresh one if the cookie is
 * missing or unknown (e.g. evicted, or a server restart). Touches lastSeen.
 */
export function getOrCreateDevice(cookieId: string | undefined): DeviceResolution {
  evictStale();

  if (cookieId) {
    const existing = DEVICES.get(cookieId);
    if (existing) {
      existing.lastSeen = now();
      return { deviceId: cookieId, state: existing, isNew: false };
    }
  }

  const deviceId = crypto.randomUUID();
  const state = freshState();
  DEVICES.set(deviceId, state);
  enforceCap();
  return { deviceId, state, isNew: true };
}

/** Reset a device's sandbox back to the seed (the "Reset sandbox" affordance). */
export function resetDevice(deviceId: string): WorkspaceState {
  const state = freshState();
  DEVICES.set(deviceId, state);
  return state;
}

function evictStale(): void {
  const cutoff = now() - IDLE_TTL_MS;
  for (const [id, state] of DEVICES) {
    if (state.lastSeen < cutoff) DEVICES.delete(id);
  }
}

function enforceCap(): void {
  if (DEVICES.size <= MAX_DEVICES) return;
  const byOldest = [...DEVICES.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
  for (const [id] of byOldest) {
    if (DEVICES.size <= MAX_DEVICES) break;
    DEVICES.delete(id);
  }
}

// --- test/introspection helpers ---------------------------------------------
export function _deviceCount(): number {
  return DEVICES.size;
}
export function _clearAllDevices(): void {
  DEVICES.clear();
}
