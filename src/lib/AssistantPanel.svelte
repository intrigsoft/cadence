<script lang="ts">
  // The docked DioscHub assistant — the real embedded chatbot (`<diosc-chat
  // mode="embed">`), not the floating FAB. Replaces the former stub. The kit
  // loader defines the element + boots the engine; because this element already
  // exists in the DOM, the loader skips its own FAB injection.
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { assistantOpen } from '$lib/stores';
  import { env } from '$env/dynamic/public';

  const hub = (env.PUBLIC_DIOSC_HUB_URL || 'http://localhost:3333').replace(/\/$/, '');
  const apiKey = env.PUBLIC_DIOSC_EMBED_KEY ?? '';
  const assistantId = env.PUBLIC_DIOSC_ASSISTANT_ID ?? '';

  // One mentionable item, in the kit's `MentionItem` shape. The kit serialises a
  // chosen mention as `@[name](kind:id)` into the message, so the assistant sees
  // the precise board/card id instead of a fuzzy name.
  interface Mentionable {
    id: string;
    name: string;
    kind: string;
    description?: string;
    group?: string;
  }

  // Tool names that change workspace data — when one of these completes we
  // re-run the page's load functions so the board reflects what the assistant
  // just did. Read-only tools (get_*, search_*, list_*, my_cards, navigate, …)
  // intentionally don't match, so reads don't trigger needless refreshes.
  const MUTATING_TOOL =
    /(?:^|[_.])(create|update|delete|move|assign|unassign|add|remove|toggle|log|start|stop|save)(?:[_.]|$)/i;

  /** Run `cb` once `window.diosc` exists (it appears after the kit bundle loads). */
  function whenDioscReady(isCancelled: () => boolean, cb: (diosc: (...a: any[]) => any) => void) {
    const start = performance.now();
    const tick = () => {
      if (isCancelled()) return;
      const diosc = (window as any).diosc;
      if (typeof diosc === 'function') {
        cb(diosc);
        return;
      }
      if (performance.now() - start < 15000) setTimeout(tick, 150);
    };
    tick();
  }

  /**
   * Build a `@`-mention list of *the current user's* boards and assigned cards.
   * The kit's provider is synchronous, so we pre-fetch (cookie-scoped — "related
   * to me") and filter in memory.
   */
  async function loadMentionItems(): Promise<Mentionable[]> {
    try {
      const [boardsRes, cardsRes] = await Promise.all([
        fetch('/api/v1/boards', { credentials: 'include' }),
        fetch('/api/v1/cards/mine', { credentials: 'include' }),
      ]);
      const boards = (await boardsRes.json())?.data ?? [];
      const cards = (await cardsRes.json())?.data ?? [];
      const boardName = new Map<string, string>(boards.map((b: any) => [b.id, b.name]));
      return [
        ...boards.map((b: any) => ({ id: b.id, name: b.name, kind: 'board', group: 'Boards' })),
        ...cards.map((c: any) => ({
          id: c.id,
          name: c.title,
          kind: 'card',
          description: boardName.get(c.boardId),
          group: 'My cards',
        })),
      ];
    } catch {
      return []; // mentions are a nicety — fail quietly
    }
  }

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

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    // Mention provider — boards + cards related to the signed-in user.
    void loadMentionItems().then((items) => {
      if (cancelled || items.length === 0) return;
      whenDioscReady(() => cancelled, (diosc) => {
        diosc('mentionProvider', (needle: string): Mentionable[] => {
          const q = needle.trim().toLowerCase();
          const matches = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
          return matches.slice(0, 20);
        });
        cleanups.push(() => {
          try { (window as any).diosc?.('mentionProvider', null); } catch { /* noop */ }
        });
      });
    });

    // Live refresh — when the assistant runs a data-changing tool, re-fetch the
    // current page so the UI reflects it (e.g. a card moved to another list).
    whenDioscReady(() => cancelled, (diosc) => {
      const unsub = diosc('on', 'tool:completed', (data: any) => {
        if (data?.success === false) return;
        if (MUTATING_TOOL.test(String(data?.toolName ?? ''))) {
          void invalidateAll();
        }
      });
      if (typeof unsub === 'function') cleanups.push(unsub);
    });

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
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
