<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import { shade } from '$lib/ui';
  import { enhance } from '$app/forms';

  let { onClose }: { onClose: () => void } = $props();

  const ACCENTS = ['#4B3FE4', '#0E8C7F', '#C2410C', '#E05A4F', '#8A5BD6', '#1A1814'];
  let name = $state('');
  let accent = $state(ACCENTS[0]);
  let visibility = $state<'private' | 'workspace'>('private');

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="overlay"
  role="presentation"
  onmousedown={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}>
  <div class="modal">
    <div class="cover" style="background:linear-gradient(135deg, {accent}, {shade(accent)})">
      <div class="sheen"></div>
      <div class="ring"></div>
      <button class="close" onclick={onClose}><Icon name="x" size={18} /></button>
      {#if visibility === 'private'}
        <span class="private"><Icon name="lock" size={12} /> Private</span>
      {/if}
    </div>

    <form
      class="body"
      method="POST"
      action="/?/create"
      use:enhance={() =>
        async ({ update }) => {
          await update();
        }}>
      <h2>Create a board</h2>

      <label for="board-name">Board name</label>
      <!-- svelte-ignore a11y_autofocus -->
      <input id="board-name" name="name" bind:value={name} placeholder="e.g. Q4 Planning" autofocus />

      <div class="field-label">Color</div>
      <input type="hidden" name="accent" value={accent} />
      <div class="swatches">
        {#each ACCENTS as c (c)}
          <button
            type="button"
            class="swatch"
            style="background:linear-gradient(135deg, {c}, {shade(c)});box-shadow:{accent === c
              ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}`
              : 'none'}"
            onclick={() => (accent = c)}
            aria-label={c}></button>
        {/each}
      </div>

      <div class="field-label">Visibility</div>
      <input type="hidden" name="visibility" value={visibility} />
      <div class="vis">
        <button type="button" class="vis-opt" class:sel={visibility === 'private'} onclick={() => (visibility = 'private')}>
          <span class="vis-top"><Icon name="lock" size={16} /> <b>Private</b></span>
          <span class="vis-sub">Only members you add</span>
        </button>
        <button type="button" class="vis-opt" class:sel={visibility === 'workspace'} onclick={() => (visibility = 'workspace')}>
          <span class="vis-top"><Icon name="users" size={16} /> <b>Workspace</b></span>
          <span class="vis-sub">Anyone at Northwind</span>
        </button>
      </div>

      <div class="note"><Icon name="shield" size={14} /> You'll be the only member — the assistant's scope follows membership.</div>

      <div class="actions">
        <button class="btn btn-primary create" type="submit" disabled={!name.trim()}>Create board</button>
        <button class="btn btn-outline" type="button" onclick={onClose}>Cancel</button>
      </div>
    </form>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; z-index: 130; background: rgba(26, 24, 20, 0.42); backdrop-filter: blur(3px);
    display: grid; place-items: center; padding: 20px; animation: overlayIn 0.16s ease; }
  .modal { width: min(460px, 100%); background: var(--surface); border-radius: 18px; overflow: hidden;
    box-shadow: var(--shadow-pop); animation: scaleIn 0.2s cubic-bezier(0.2, 0.9, 0.3, 1); }
  .cover { height: 92px; position: relative; }
  .sheen { position: absolute; inset: 0; opacity: 0.5; background: radial-gradient(120% 90% at 85% 10%, rgba(255, 255, 255, 0.35), transparent 60%); }
  .ring { position: absolute; right: -18px; bottom: -28px; width: 110px; height: 110px; border-radius: 26px;
    border: 2px solid rgba(255, 255, 255, 0.22); transform: rotate(18deg); }
  .close { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 8px;
    background: rgba(26, 24, 20, 0.28); backdrop-filter: blur(4px); color: #fff; display: grid; place-items: center; }
  .private { position: absolute; bottom: 12px; left: 18px; display: flex; align-items: center; gap: 5px; padding: 3px 8px;
    border-radius: 7px; background: rgba(26, 24, 20, 0.28); backdrop-filter: blur(4px); color: #fff; font-size: 10.5px; font-weight: 700; }
  .body { padding: 20px 22px 22px; }
  h2 { font-family: var(--font-display); font-size: 21px; font-weight: 600; margin: 0; color: var(--ink); letter-spacing: -0.01em; }
  label, .field-label { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); margin: 18px 0 7px; }
  input[name='name'] { width: 100%; height: 42px; padding: 0 13px; border-radius: 10px; border: 1px solid var(--line-2);
    font-size: 14px; color: var(--ink); outline: none; background: var(--canvas); }
  input[name='name']:focus { border-color: var(--brand); }
  .swatches { display: flex; gap: 9px; }
  .swatch { width: 34px; height: 34px; border-radius: 9px; cursor: pointer; transition: 0.12s; }
  .vis { display: flex; gap: 8px; }
  .vis-opt { flex: 1; text-align: left; padding: 11px 13px; border-radius: 11px; border: 1px solid var(--line-2); background: var(--surface); transition: 0.12s; }
  .vis-opt.sel { border-color: var(--brand); background: var(--brand-tint); }
  .vis-top { display: flex; align-items: center; gap: 7px; color: var(--ink-2); font-size: 13.5px; }
  .vis-opt.sel .vis-top { color: var(--brand-700); }
  .vis-sub { display: block; font-size: 11.5px; color: var(--ink-3); margin-top: 3px; }
  .note { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 11.5px; color: var(--ink-3); }
  .actions { display: flex; gap: 9px; margin-top: 20px; }
  .create { flex: 1; height: 42px; justify-content: center; }
  .create:disabled { opacity: 0.45; pointer-events: none; }
  .actions .btn-outline { height: 42px; }
</style>
