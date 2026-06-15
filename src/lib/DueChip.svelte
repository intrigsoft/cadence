<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import type { DueMeta } from '$lib/ui';

  let { due }: { due: DueMeta } = $props();

  const TONES: Record<string, { bg: string; fg: string }> = {
    over: { bg: '#FBE3DF', fg: '#B0392B' },
    today: { bg: '#FBEBD6', fg: '#9A6512' },
    soon: { bg: '#FBEBD6', fg: '#9A6512' },
    normal: { bg: 'rgba(26,24,20,.05)', fg: 'var(--ink-2)' }
  };
  const t = $derived(TONES[due.tone]);
</script>

<span class="due" style="background:{t.bg};color:{t.fg}">
  <Icon name="clock" size={13} /> {due.text}
</span>

<style>
  .due { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; }
</style>
