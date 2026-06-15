<script lang="ts">
  import { ICONS } from './icons';

  let {
    name,
    size = 18,
    sw = 1.7,
    color = 'currentColor',
    class: cls = ''
  }: { name: string; size?: number; sw?: number; color?: string; class?: string } = $props();

  const markup = $derived(ICONS[name] ?? '');
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  stroke-width={sw}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cls}
  aria-hidden="true">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html markup}
</svg>
