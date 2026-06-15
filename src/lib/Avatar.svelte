<script lang="ts">
  import type { User } from '$lib/server/types';
  let {
    user,
    size = 26,
    ring = 'light',
    title
  }: { user: User | null | undefined; size?: number; ring?: 'light' | 'dark'; title?: string } = $props();
</script>

{#if user}
  <span
    class="avatar {ring === 'dark' ? 'ring-dark' : ''}"
    title={title ?? user.name}
    style="width:{size}px;height:{size}px;background:{user.color};font-size:{size * 0.4}px">
    {user.initials}
  </span>
{/if}
