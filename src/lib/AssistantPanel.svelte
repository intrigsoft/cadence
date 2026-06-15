<script lang="ts">
  // The docked DioscHub assistant — the real embedded chatbot (`<diosc-chat
  // mode="embed">`), not the floating FAB. Replaces the former stub. The kit
  // loader defines the element + boots the engine; because this element already
  // exists in the DOM, the loader skips its own FAB injection.
  import { onMount } from 'svelte';
  import { assistantOpen } from '$lib/stores';
  import { env } from '$env/dynamic/public';

  const hub = (env.PUBLIC_DIOSC_HUB_URL || 'http://localhost:3333').replace(/\/$/, '');
  const apiKey = env.PUBLIC_DIOSC_EMBED_KEY ?? '';
  const assistantId = env.PUBLIC_DIOSC_ASSISTANT_ID ?? '';

  onMount(() => {
    if (!apiKey) return;
    // Just load the kit bundle. Everything else (apiKey, backendUrl, assistantId,
    // bindEndpoint, embed mode) is declared as attributes on <diosc-chat> below,
    // so the engine configures + binds + auto-connects with no config/connect race.
    // The loader sees our existing element and skips its own FAB injection.
    const s = document.createElement('script');
    s.src = `${hub}/api/embed/${apiKey}/loader.js`;
    s.async = true;
    document.head.appendChild(s);
  });
</script>

<aside class="panel" class:open={$assistantOpen}>
  <div class="inner">
    {#if apiKey}
      <!-- svelte-ignore element_invalid_self_closing_tag -->
      <diosc-chat mode="embed" api-key={apiKey} backend-url={hub} assistant-id={assistantId} bind-endpoint="/api/diosc/bind"></diosc-chat>
    {:else}
      <div class="unconfigured">
        Set <code>PUBLIC_DIOSC_EMBED_KEY</code> (and <code>PUBLIC_DIOSC_ASSISTANT_ID</code>) to embed the DioscHub assistant.
      </div>
    {/if}
  </div>
</aside>

<style>
  .panel {
    width: 0;
    flex: none;
    overflow: hidden;
    transition: width 0.34s cubic-bezier(0.3, 0.9, 0.3, 1);
    background: var(--ink-900);
    height: 100%;
  }
  .panel.open {
    width: var(--assistant-w);
    border-left: 1px solid var(--line-dark);
  }
  .inner {
    width: var(--assistant-w);
    height: 100%;
  }
  diosc-chat {
    display: block;
    width: 100%;
    height: 100%;
  }
  .unconfigured {
    color: var(--ink-on-dark-3);
    padding: 20px;
    font-size: 13px;
    line-height: 1.6;
  }
  code {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--ink-on-dark-2);
  }
</style>
