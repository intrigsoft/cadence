<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const hidden = $derived(data.totalBoardCount - data.accessibleBoardCount);
</script>

<svelte:head><title>Cadence</title></svelte:head>

<main class="scaffold">
  <p class="eyebrow">Cadence · {data.workspace.name} ({data.workspace.plan})</p>
  <h1>Good morning, {data.currentUser.name.split(' ')[0]}.</h1>
  <p class="lede">
    You're on <strong>{data.accessibleBoardCount} boards</strong> as
    <span class="mono">{data.currentUser.email}</span>.
  </p>

  <ul class="boards">
    {#each data.boards as b (b.id)}
      <li>
        <span class="dot" style="background:{b.accent}"></span>
        <span class="name">{b.name}</span>
        {#if b.visibility === 'private'}<span class="pill">Private</span>{/if}
        <span class="count mono">{b.cardCount} cards</span>
      </li>
    {/each}
  </ul>

  {#if hidden > 0}
    <p class="hidden-note">{hidden} more board{hidden === 1 ? '' : 's'} you don't have access to</p>
  {/if}

  <p class="phase-note">
    Backend core wired (per-device sandbox · server-enforced membership). Full UI from the
    prototype lands in phase 4.
  </p>
</main>

<style>
  .scaffold { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
  .eyebrow { font-family: var(--mono, monospace); font-size: 12px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; }
  h1 { font-family: var(--font-display, system-ui); font-size: 34px; margin: 8px 0 12px; color: var(--ink); }
  .lede { color: var(--ink-2); font-size: 15px; }
  .mono { font-family: var(--mono, monospace); }
  .boards { list-style: none; padding: 0; margin: 24px 0; display: grid; gap: 8px; }
  .boards li { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md, 10px); padding: 12px 14px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .name { font-weight: 600; color: var(--ink); }
  .pill { font-size: 11px; color: var(--ink-3); border: 1px solid var(--line-2); border-radius: 999px; padding: 1px 8px; }
  .count { margin-left: auto; font-size: 12px; color: var(--ink-3); }
  .hidden-note { color: var(--ink-3); font-size: 13px; font-style: italic; }
  .phase-note { margin-top: 32px; padding-top: 16px; border-top: 1px dashed var(--line-2); color: var(--ink-3); font-size: 12px; }
</style>
