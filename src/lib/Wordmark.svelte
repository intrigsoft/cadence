<script lang="ts">
  let { small = false }: { small?: boolean } = $props();
</script>

<div class="wordmark">
  <span class="mark">
    <span class="inner"></span>
  </span>
  {#if !small}<span class="name">Cadence</span>{/if}
</div>

<style>
  .wordmark {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .mark {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: var(--beam);
    display: grid;
    place-items: center;
    box-shadow: 0 2px 10px rgba(140, 125, 255, 0.45);
  }
  .inner {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    background: #fff;
    transform: rotate(12deg);
    box-shadow: inset 0 0 0 2.5px var(--beam-soft);
  }
  .name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 19px;
    letter-spacing: -0.01em;
    color: var(--ink-on-dark);
  }
</style>
