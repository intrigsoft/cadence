<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '$lib/Icon.svelte';
  import Wordmark from '$lib/Wordmark.svelte';
  import type { BoardSummary, Workspace } from '$lib/server/types';

  let {
    workspace,
    boards,
    onNewBoard
  }: { workspace: Workspace; boards: BoardSummary[]; onNewBoard: () => void } = $props();

  const path = $derived($page.url.pathname);
  const activeBoardId = $derived(path.startsWith('/b/') ? path.split('/')[2] : null);
</script>

<aside class="on-dark sidebar">
  <div class="ws-header">
    <Wordmark />
    <a class="ws-switch" href="/">
      <span class="ws-mark">N</span>
      <span class="ws-text">
        <span class="ws-name">{workspace.name}</span>
        <span class="ws-plan">{workspace.plan} plan</span>
      </span>
    </a>
  </div>

  <nav class="nav">
    <a class="nav-item" class:active={path === '/'} href="/">
      <span class="nav-ico"><Icon name="grid" size={17} /></span> All boards
    </a>
    <a class="nav-item" class:active={path === '/me'} href="/me">
      <span class="nav-ico"><Icon name="user" size={17} /></span> My cards
    </a>

    <div class="section">
      <span>Your boards</span>
      <button class="add" title="New board" onclick={onNewBoard}><Icon name="plus" size={16} /></button>
    </div>

    {#each boards as b (b.id)}
      <a class="board" class:active={activeBoardId === b.id} href="/b/{b.id}">
        <span class="dot" style="background:{b.accent};box-shadow:{activeBoardId === b.id ? `0 0 0 3px ${b.accent}33` : 'none'}"></span>
        <span class="bname">{b.name}</span>
        {#if b.visibility === 'private'}<Icon name="lock" size={13} color="var(--ink-on-dark-3)" />{/if}
      </a>
    {/each}
  </nav>

  <div class="foot">
    <div class="badge">
      <Icon name="shieldDot" size={16} color="var(--beam)" />
      <span class="badge-text">
        <span class="badge-title">Secured by Dioschub</span>
        <span class="badge-sub">credential-blind layer</span>
      </span>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    width: var(--sidebar-w);
    flex: none;
    background: var(--ink-900);
    border-right: 1px solid var(--line-dark);
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .ws-header { padding: 15px 16px 14px; border-bottom: 1px solid var(--line-dark); }
  .ws-switch { margin-top: 14px; width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 9px;
    border-radius: 10px; background: var(--ink-800); border: 1px solid var(--line-dark); text-align: left; text-decoration: none; }
  .ws-mark { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, #4b3fe4, #0e8c7f);
    display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 13px; flex: none; }
  .ws-text { line-height: 1.1; }
  .ws-name { display: block; color: var(--ink-on-dark); font-weight: 700; font-size: 14px; }
  .ws-plan { display: block; color: var(--ink-on-dark-3); font-size: 11.5px; }

  .nav { padding: 12px 10px; overflow-y: auto; flex: 1; }
  .nav-item, .board { width: 100%; display: flex; align-items: center; gap: 11px; padding: 8px 9px; border-radius: 9px;
    margin-bottom: 1px; text-align: left; text-decoration: none; color: var(--ink-on-dark-2); font-size: 13.5px;
    font-weight: 500; transition: 0.12s; }
  .nav-item .nav-ico { color: var(--ink-on-dark-3); display: flex; }
  .nav-item:hover, .board:hover { background: rgba(244, 241, 234, 0.05); }
  .nav-item.active, .board.active { background: var(--ink-800); color: var(--ink-on-dark); font-weight: 600; }
  .nav-item.active .nav-ico { color: var(--beam); }
  .board { gap: 10px; }
  .board .dot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
  .bname { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .section { display: flex; align-items: center; justify-content: space-between; padding: 16px 9px 7px; }
  .section span { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-on-dark-3); }
  .add { width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; color: var(--ink-on-dark-2); transition: 0.12s; }
  .add:hover { background: rgba(244, 241, 234, 0.08); color: var(--beam); }

  .foot { padding: 12px; border-top: 1px solid var(--line-dark); }
  .badge { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 10px;
    background: var(--ink-850); border: 1px solid var(--line-dark); }
  .badge-text { line-height: 1.15; flex: 1; }
  .badge-title { display: block; font-size: 11.5px; font-weight: 700; color: var(--ink-on-dark-2); }
  .badge-sub { display: block; font-size: 10.5px; color: var(--ink-on-dark-3); font-family: var(--font-mono); }
</style>
