<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import { fmtMins } from '$lib/ui';
  let { mins, running = false }: { mins: number; running?: boolean } = $props();
</script>

<span class="time-chip" class:running title={running ? 'Timer running' : 'Tracked time'}>
  {#if running}<span class="pulse"></span>{/if}
  <Icon name="timer" size={13} /> {fmtMins(mins)}
</span>

<style>
  .time-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700;
    padding: 2px 7px; border-radius: 6px; background: rgba(26, 24, 20, 0.05); color: var(--ink-2); }
  .time-chip.running { background: #ddf1ea; color: #0b6b60; }
  .pulse { width: 6px; height: 6px; border-radius: 99px; background: #0b6b60; animation: beamPulse 1.6s ease-in-out infinite; }
</style>
