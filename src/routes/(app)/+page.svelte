<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import BoardCard from '$lib/BoardCard.svelte';
  import type { PageData } from './$types';
  import type { User } from '$lib/server/types';

  let { data }: { data: PageData } = $props();

  const greet = 'Good morning';
  const dateLabel = $derived(
    new Date(data.today).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  );
  const hidden = $derived(data.totalBoardCount - data.accessibleBoardCount);
  const userMap = $derived(new Map(data.personas.map((p) => [p.id, p as User])));
  const membersOf = (ids: string[]): User[] => ids.map((id) => userMap.get(id)).filter((u): u is User => !!u);
</script>

<svelte:head><title>Cadence · {data.workspace.name}</title></svelte:head>

<div class="scroll">
  <div class="wrap">
    <div class="hero">
      <span class="date">{dateLabel}</span>
      <h1>{greet}, {data.currentUser.name.split(' ')[0]}.</h1>
      <p class="lede">
        You're on <b>{data.accessibleBoardCount} board{data.accessibleBoardCount !== 1 ? 's' : ''}</b> with
        <b>{data.myCardCount} card{data.myCardCount !== 1 ? 's' : ''}</b> assigned to you.
      </p>
    </div>

    <div class="grid-head">
      <h2>Your boards</h2>
    </div>

    <div class="grid">
      {#each data.boards as b (b.id)}
        <BoardCard board={b} members={membersOf(b.memberIds)} />
      {/each}
    </div>

    {#if hidden > 0}
      <div class="hidden-note">
        <span class="lock"><Icon name="lock" size={17} /></span>
        <div>
          <div class="hn-title">
            {hidden} more board{hidden !== 1 ? 's' : ''} in {data.workspace.name} you don't have access to
          </div>
          <div class="hn-sub">Cadence — and the Dioschub assistant — only ever show what your role permits.</div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .scroll { position: relative; z-index: 1; height: 100%; overflow-y: auto; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 40px 40px 60px; }
  .hero { animation: fadeUp 0.5s ease both; }
  .date { font-family: var(--font-mono); font-size: 12px; color: var(--ink-3); letter-spacing: 0.02em; }
  h1 { font-family: var(--font-display); font-size: 38px; font-weight: 700; letter-spacing: -0.02em; margin: 8px 0 0;
    color: var(--ink); line-height: 1.05; }
  .lede { font-size: 15.5px; color: var(--ink-2); margin-top: 10px; max-width: 560px; line-height: 1.5; }
  .lede b { color: var(--ink); }
  .grid-head { display: flex; align-items: baseline; justify-content: space-between; margin: 34px 0 16px; }
  h2 { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(264px, 1fr)); gap: 16px; }
  .hidden-note { margin-top: 22px; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px;
    border: 1px dashed var(--line-2); background: rgba(26, 24, 20, 0.015); }
  .lock { width: 34px; height: 34px; border-radius: 9px; background: var(--surface-2); display: grid; place-items: center;
    color: var(--ink-3); flex: none; }
  .hn-title { font-size: 13.5px; font-weight: 600; color: var(--ink); }
  .hn-sub { font-size: 12px; color: var(--ink-2); }
</style>
