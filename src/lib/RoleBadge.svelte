<script lang="ts">
  let { role }: { role: string } = $props();
  const MAP: Record<string, { bg: string; fg: string; t: string }> = {
    admin: { bg: 'var(--brand-100)', fg: 'var(--brand-700)', t: 'Admin' },
    member: { bg: '#DDF1EA', fg: '#0B6B60', t: 'Member' },
    guest: { bg: '#EDEAE0', fg: '#6B6760', t: 'Guest' }
  };
  const m = $derived(MAP[role] ?? MAP.guest);
</script>

<span class="role-badge" style="background:{m.bg};color:{m.fg}">{m.t}</span>

<style>
  .role-badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 6px;
    white-space: nowrap;
  }
</style>
