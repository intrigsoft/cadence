<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import AvatarStack from '$lib/AvatarStack.svelte';
  import { shade } from '$lib/ui';
  import type { BoardSummary, User } from '$lib/server/types';

  let {
    board,
    members
  }: { board: BoardSummary; members: User[] } = $props();
</script>

<a class="board-card focusable" href="/b/{board.id}">
  <div class="cover" style="background:linear-gradient(135deg, {board.accent}, {shade(board.accent)})">
    <div class="sheen"></div>
    <div class="ring"></div>
    {#if board.visibility === 'private'}
      <span class="private"><Icon name="lock" size={12} /> Private</span>
    {/if}
  </div>
  <div class="body">
    <div class="name">{board.name}</div>
    <div class="subtitle">{board.subtitle}</div>
    <div class="footer">
      <AvatarStack users={members} size={26} max={4} />
      <span class="count"><Icon name="columns" size={14} /> {board.cardCount} {board.cardCount === 1 ? 'card' : 'cards'}</span>
    </div>
  </div>
</a>

<style>
  .board-card { text-align: left; border-radius: 16px; overflow: hidden; background: var(--surface);
    border: 1px solid var(--line); box-shadow: var(--shadow-card); text-decoration: none; display: flex;
    flex-direction: column; transition: transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow 0.18s; }
  .board-card:hover { box-shadow: var(--shadow-pop); transform: translateY(-3px); }
  .cover { height: 86px; position: relative; overflow: hidden; }
  .sheen { position: absolute; inset: 0; opacity: 0.5;
    background: radial-gradient(120% 90% at 85% 10%, rgba(255, 255, 255, 0.35), transparent 60%); }
  .ring { position: absolute; right: -18px; bottom: -28px; width: 110px; height: 110px; border-radius: 26px;
    border: 2px solid rgba(255, 255, 255, 0.22); transform: rotate(18deg); }
  .private { position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 5px; padding: 3px 8px;
    border-radius: 7px; background: rgba(26, 24, 20, 0.28); backdrop-filter: blur(4px); color: #fff; font-size: 10.5px; font-weight: 700; }
  .body { padding: 14px 16px 15px; flex: 1; display: flex; flex-direction: column; }
  .name { font-family: var(--font-display); font-size: 17px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; line-height: 1.15; }
  .subtitle { font-size: 12.5px; color: var(--ink-2); margin-top: 4px; flex: 1; }
  .footer { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
  .count { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-3); font-weight: 600; }
</style>
