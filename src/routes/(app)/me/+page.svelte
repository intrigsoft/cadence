<script lang="ts">
  import DueChip from '$lib/DueChip.svelte';
  import { dueMeta } from '$lib/ui';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const groups = $derived(
    data.boards.map((b) => ({ board: b, items: data.mine.filter((c) => c.boardId === b.id) }))
  );
</script>

<svelte:head><title>My cards · Cadence</title></svelte:head>

<div class="scroll">
  <div class="wrap">
    <h1>My cards</h1>
    <p class="lede">
      {data.mine.length} card{data.mine.length !== 1 ? 's' : ''} assigned to you across {groups.length} board{groups.length !==
      1
        ? 's'
        : ''}.
    </p>

    {#each groups as { board, items } (board.id)}
      <div class="group">
        <a class="group-head" href="/b/{board.id}">
          <span class="dot" style="background:{board.accent}"></span>
          <span class="gname">{board.name}</span>
        </a>
        <div class="rows">
          {#each items as c (c.id)}
            {@const due = dueMeta(c.due)}
            {@const list = board.lists.find((l) => l.id === c.listId)}
            <a class="row" href="/b/{board.id}?card={c.id}">
              <span class="dots">
                {#each c.labels.slice(0, 3) as l (l)}
                  <span class="ldot" style="background:{data.labels[l]?.color}"></span>
                {/each}
              </span>
              <span class="title">{c.title}</span>
              <span class="list-name">{list?.name ?? ''}</span>
              {#if due}<DueChip {due} />{/if}
            </a>
          {/each}
        </div>
      </div>
    {/each}

    {#if groups.length === 0}
      <div class="empty">Nothing assigned to you yet.</div>
    {/if}
  </div>
</div>

<style>
  .scroll { position: relative; z-index: 1; height: 100%; overflow-y: auto; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 40px 40px 60px; }
  h1 { font-family: var(--font-display); font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin: 0; color: var(--ink); }
  .lede { font-size: 15px; color: var(--ink-2); margin-top: 8px; }
  .group { margin-top: 30px; }
  .group-head { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; text-decoration: none; }
  .dot { width: 10px; height: 10px; border-radius: 3px; }
  .gname { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-2); }
  .rows { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-radius: 12px; background: var(--surface);
    border: 1px solid var(--line); text-align: left; box-shadow: var(--shadow-card); text-decoration: none; }
  .row:hover { border-color: var(--line-2); }
  .dots { display: flex; gap: 4px; flex: none; }
  .ldot { width: 8px; height: 8px; border-radius: 99px; }
  .title { font-size: 14px; font-weight: 500; color: var(--ink); flex: 1; }
  .list-name { font-size: 12px; color: var(--ink-3); font-weight: 600; }
  .empty { margin-top: 40px; padding: 40px; text-align: center; color: var(--ink-3); border: 1px dashed var(--line-2); border-radius: 14px; }
</style>
