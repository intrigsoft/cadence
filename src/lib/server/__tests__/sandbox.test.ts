import { beforeEach, describe, expect, it } from 'vitest';
import { _clearAllDevices, _deviceCount, getOrCreateDevice, resetDevice } from '../sandbox/store';
import { moveCard } from '../domain';
import type { Actor } from '../types';

const SARAH: Actor = { userId: 'u_sarah', isAgent: false };

describe('per-device sandbox store (the no-DB isolation)', () => {
  beforeEach(() => _clearAllDevices());

  it('mints a fresh sandbox for an unknown/absent cookie', () => {
    const a = getOrCreateDevice(undefined);
    expect(a.isNew).toBe(true);
    expect(_deviceCount()).toBe(1);

    const b = getOrCreateDevice('totally-unknown-id');
    expect(b.isNew).toBe(true);
    expect(_deviceCount()).toBe(2);
  });

  it('returns the same sandbox for a known cookie', () => {
    const a = getOrCreateDevice(undefined);
    const again = getOrCreateDevice(a.deviceId);
    expect(again.isNew).toBe(false);
    expect(again.state).toBe(a.state);
  });

  it('isolates state across devices — a move in one never touches another', () => {
    const a = getOrCreateDevice(undefined);
    const b = getOrCreateDevice(undefined);

    const card = a.state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_doing')!;
    moveCard(a.state, SARAH, card.id, 'l_s_done', 0);

    const sameCardInB = b.state.cards.find((c) => c.id === card.id)!;
    expect(sameCardInB.listId).toBe('l_s_doing'); // unchanged in the other sandbox
  });

  it('reset restores a device to seed', () => {
    const a = getOrCreateDevice(undefined);
    const card = a.state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_doing')!;
    moveCard(a.state, SARAH, card.id, 'l_s_done', 0);

    const fresh = resetDevice(a.deviceId);
    const resetCard = fresh.cards.find((c) => c.id === card.id)!;
    expect(resetCard.listId).toBe('l_s_doing');
  });
});
