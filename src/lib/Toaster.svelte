<script lang="ts">
  import { fly } from 'svelte/transition';
  import Icon from '$lib/Icon.svelte';
  import { toasts } from '$lib/stores';

  const ICON: Record<string, string> = { deny: 'lock', warn: 'timer', info: 'shield' };
  const COLOR: Record<string, string> = { deny: '#FF8A7A', warn: '#E8B45A', info: 'var(--beam)' };
</script>

<div class="toaster">
  {#each $toasts as t (t.id)}
    <div class="toast" transition:fly={{ y: 10, duration: 220 }}>
      <span class="ico" style="color:{COLOR[t.tone]}"><Icon name={ICON[t.tone]} size={18} /></span>
      <span class="text">{t.text}</span>
    </div>
  {/each}
</div>

<style>
  .toaster { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 200;
    display: flex; flex-direction: column; gap: 10px; align-items: center; pointer-events: none; }
  .toast { display: flex; align-items: center; gap: 11px; padding: 11px 16px 11px 13px; border-radius: 12px;
    background: var(--ink-900); color: var(--ink-on-dark); box-shadow: var(--shadow-pop); max-width: 460px; }
  .ico { display: flex; flex: none; }
  .text { font-size: 13px; line-height: 1.4; }
</style>
