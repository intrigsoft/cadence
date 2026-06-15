<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '$lib/Icon.svelte';
  import AccountMenu from '$lib/AccountMenu.svelte';
  import { assistantOpen, searchQuery } from '$lib/stores';
  import type { BoardSummary, User } from '$lib/server/types';

  let {
    currentUser,
    personas,
    accessibleBoardCount,
    activeBoard
  }: {
    currentUser: User;
    personas: Array<User & { boardCount: number }>;
    accessibleBoardCount: number;
    activeBoard: BoardSummary | null;
  } = $props();

  const path = $derived($page.url.pathname);
  const label = $derived(path === '/me' ? 'My cards' : 'All boards');
</script>

<header class="topbar">
  <div class="crumb">
    {#if activeBoard}
      <a class="back" href="/"><Icon name="chevLeft" size={17} /> Boards</a>
      <span class="sep">/</span>
      <span class="dot" style="background:{activeBoard.accent}"></span>
      <span class="board-name">{activeBoard.name}</span>
    {:else}
      <Icon name="grid" size={18} color="var(--ink-3)" />
      <span class="board-name">{label}</span>
    {/if}
  </div>

  <div class="spacer"></div>

  <div class="search">
    <span class="search-ico"><Icon name="search" size={16} color="var(--ink-3)" /></span>
    <input placeholder="Search cards…" bind:value={$searchQuery} />
  </div>

  <button class="btn btn-ghost icon-btn" title="Notifications"><Icon name="bell" size={19} /></button>

  <AccountMenu {currentUser} {personas} {accessibleBoardCount} />

  <button
    class="assistant-toggle focusable"
    class:on={$assistantOpen}
    onclick={() => assistantOpen.update((o) => !o)}>
    <Icon name="spark" size={17} color="var(--beam)" /> Assistant
  </button>
</header>

<style>
  .topbar { height: var(--topbar-h); flex: none; display: flex; align-items: center; gap: 16px; padding: 0 18px;
    background: var(--surface); border-bottom: 1px solid var(--line); position: relative; z-index: 30; }
  .crumb { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .back { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 8px; font-size: 13px;
    color: var(--ink-2); text-decoration: none; border-radius: var(--r-md); }
  .back:hover { background: rgba(26, 24, 20, 0.06); color: var(--ink); }
  .sep { color: var(--line-2); }
  .dot { width: 9px; height: 9px; border-radius: 3px; }
  .board-name { font-weight: 700; font-size: 14.5px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .spacer { flex: 1; }

  .search { position: relative; width: 264px; max-width: 32vw; }
  .search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); display: flex; }
  .search input { width: 100%; height: 38px; padding: 0 12px 0 34px; border-radius: 10px; border: 1px solid var(--line-2);
    background: var(--canvas); font-size: 13.5px; color: var(--ink); outline: none; }
  .search input:focus { border-color: var(--brand); background: var(--surface); }

  .icon-btn { width: 38px; padding: 0; justify-content: center; }

  .assistant-toggle { display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 14px 0 11px; border-radius: 10px;
    font-weight: 600; font-size: 13.5px; background: var(--ink-850); color: var(--ink-on-dark);
    box-shadow: 0 1px 3px rgba(26, 24, 20, 0.18); transition: 0.15s; }
  .assistant-toggle.on { background: var(--ink-900); box-shadow: inset 0 0 0 1px var(--beam); }
</style>
