<script lang="ts">
  import type { User } from '$lib/server/types';
  import Avatar from './Avatar.svelte';

  let {
    users,
    size = 26,
    max = 4,
    ring = 'light'
  }: { users: User[]; size?: number; max?: number; ring?: 'light' | 'dark' } = $props();

  const shown = $derived(users.slice(0, max));
  const extra = $derived(users.length - shown.length);
</script>

<div class="stack">
  {#each shown as u, i (u.id)}
    <span style="margin-left:{i ? -8 : 0}px;z-index:{shown.length - i}">
      <Avatar user={u} {size} {ring} />
    </span>
  {/each}
  {#if extra > 0}
    <span
      class="avatar"
      style="margin-left:-8px;width:{size}px;height:{size}px;font-size:{size * 0.36}px;background:#C9C4B8;color:#56524B"
      >+{extra}</span>
  {/if}
</div>

<style>
  .stack {
    display: flex;
    align-items: center;
  }
</style>
