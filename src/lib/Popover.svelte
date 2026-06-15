<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    width = 240,
    align = 'left',
    trigger,
    children
  }: {
    width?: number;
    align?: 'left' | 'right';
    trigger: Snippet<[{ toggle: () => void; open: boolean }]>;
    children: Snippet<[{ close: () => void }]>;
  } = $props();

  let open = $state(false);
  let root: HTMLDivElement;

  function onDown(e: MouseEvent) {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }
  function onKey(e: KeyboardEvent) {
    if (open && e.key === 'Escape') {
      e.stopPropagation();
      open = false;
    }
  }
</script>

<svelte:document onmousedown={onDown} onkeydowncapture={onKey} />

<div class="pop-root" bind:this={root}>
  {@render trigger({ toggle: () => (open = !open), open })}
  {#if open}
    <div class="pop" style="width:{width}px;{align}:0;transform-origin:top {align}">
      {@render children({ close: () => (open = false) })}
    </div>
  {/if}
</div>

<style>
  .pop-root { position: relative; }
  .pop { position: absolute; top: calc(100% + 6px); z-index: 20; background: var(--surface); border-radius: 12px;
    border: 1px solid var(--line); box-shadow: var(--shadow-pop); padding: 8px; animation: scaleIn 0.13s ease; }
</style>
