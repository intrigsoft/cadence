<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import Avatar from '$lib/Avatar.svelte';
  import RoleBadge from '$lib/RoleBadge.svelte';
  import { roleLabel } from '$lib/ui';
  import type { User } from '$lib/server/types';

  let {
    currentUser,
    personas,
    accessibleBoardCount
  }: { currentUser: User; personas: Array<User & { boardCount: number }>; accessibleBoardCount: number } = $props();

  let open = $state(false);
  let showSwitch = $state(false);
  let root: HTMLDivElement;

  function onDocClick(e: MouseEvent) {
    if (root && !root.contains(e.target as Node)) {
      open = false;
      showSwitch = false;
    }
  }
</script>

<svelte:document onmousedown={onDocClick} />

<div class="account" bind:this={root}>
  <button class="trigger focusable" class:open onclick={() => (open = !open)} title={currentUser.email}>
    <Avatar user={currentUser} size={28} />
    <span class="who">
      <span class="name">{currentUser.name.split(' ')[0]}</span>
      <span class="role">{roleLabel(currentUser.role)}</span>
    </span>
    <Icon name="chevDown" size={15} color="var(--ink-3)" />
  </button>

  {#if open}
    <div class="menu">
      <div class="identity">
        <Avatar user={currentUser} size={42} />
        <div class="id-text">
          <div class="id-line"><span class="id-name">{currentUser.name}</span><RoleBadge role={currentUser.role} /></div>
          <div class="id-title">{currentUser.title}</div>
          <div class="id-email mono">{currentUser.email}</div>
        </div>
      </div>

      <div class="sso-note">
        <Icon name="shieldDot" size={15} color="var(--brand)" />
        <span>Signed in via SSO. The assistant operates as you across <b>{accessibleBoardCount} boards</b>.</span>
      </div>

      <button class="row"><span class="row-ico"><Icon name="settings" size={17} /></span>Account settings</button>
      <form method="POST" action="/logout" class="row-form">
        <button class="row" type="submit"><span class="row-ico"><Icon name="logout" size={17} /></span>Sign out</button>
      </form>

      <div class="switch">
        <button class="switch-head" onclick={() => (showSwitch = !showSwitch)}>
          <span class="tag">Sandbox</span>
          <span class="switch-label">Switch demo identity</span>
          <span class="chev" style="transform:{showSwitch ? 'rotate(180deg)' : 'none'}"><Icon name="chevDown" size={15} color="var(--ink-3)" /></span>
        </button>
        {#if showSwitch}
          <div class="personas">
            {#each personas.filter((p) => p.id !== currentUser.id) as u (u.id)}
              <form method="POST" action="/identity">
                <input type="hidden" name="userId" value={u.id} />
                <button class="persona" type="submit">
                  <Avatar user={u} size={28} />
                  <span class="p-meta">
                    <span class="p-line"><span class="p-name">{u.name}</span><RoleBadge role={u.role} /></span>
                    <span class="p-boards mono">{u.boardCount} boards</span>
                  </span>
                </button>
              </form>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .account { position: relative; }
  .trigger { display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 9px 0 6px; border-radius: 999px;
    border: 1px solid var(--line-2); background: var(--surface); transition: 0.12s; }
  .trigger.open { background: var(--canvas); }
  .who { line-height: 1.05; text-align: left; }
  .who .name { display: block; font-size: 13px; font-weight: 700; color: var(--ink); }
  .who .role { display: block; font-size: 10.5px; color: var(--ink-3); }

  .menu { position: absolute; top: 46px; right: 0; width: 300px; background: var(--surface); border-radius: 14px;
    box-shadow: var(--shadow-pop); border: 1px solid var(--line); padding: 8px; z-index: 60;
    animation: scaleIn 0.14s ease; transform-origin: top right; }
  .identity { display: flex; align-items: center; gap: 11px; padding: 8px 9px 12px; }
  .id-text { min-width: 0; line-height: 1.25; }
  .id-line { display: flex; align-items: center; gap: 7px; }
  .id-name { font-size: 14px; font-weight: 700; color: var(--ink); white-space: nowrap; }
  .id-title { font-size: 11.5px; color: var(--ink-2); }
  .id-email { font-size: 10.5px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mono { font-family: var(--font-mono); }

  .sso-note { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 10px;
    background: var(--brand-tint); margin-bottom: 6px; }
  .sso-note span { font-size: 11.5px; color: var(--brand-700); line-height: 1.4; }

  .row-form { display: contents; }
  .row { width: 100%; display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 9px;
    text-align: left; color: var(--ink); font-size: 13.5px; font-weight: 500; }
  .row:hover { background: var(--canvas); }
  .row-ico { color: var(--ink-3); display: flex; }

  .switch { border-top: 1px solid var(--line); margin-top: 6px; padding-top: 8px; }
  .switch-head { width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 9px; text-align: left; }
  .switch-head:hover { background: var(--canvas); }
  .tag { font-size: 9.5px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: #9a6512;
    background: #fbebd6; padding: 2px 6px; border-radius: 5px; }
  .switch-label { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
  .chev { display: flex; transition: 0.15s; }
  .personas { margin-top: 4px; }
  .personas form { display: contents; }
  .persona { width: 100%; display: flex; align-items: center; gap: 10px; padding: 7px 9px; border-radius: 9px; text-align: left; }
  .persona:hover { background: var(--canvas); }
  .p-meta { flex: 1; min-width: 0; }
  .p-line { display: flex; align-items: center; gap: 6px; }
  .p-name { font-size: 13px; font-weight: 600; color: var(--ink); }
  .p-boards { font-size: 10.5px; color: var(--ink-3); display: block; }
</style>
