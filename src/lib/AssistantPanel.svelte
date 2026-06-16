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

  // boardId -> name, populated by loadBoards(); used to label card mentions.
  let boardNames = new Map<string, string>();
  // Cache card-search results per query so repeats/backspace don't refetch.
  const cardSearchCache = new Map<string, Mentionable[]>();

  /**
   * The signed-in user's boards — a small set, so we pre-fetch once and filter
   * in memory for `@board` mentions.
   */
  async function loadBoards(): Promise<Mentionable[]> {
    try {
      const res = await fetch('/api/v1/boards', { credentials: 'include' });
      const boards = (await res.json())?.data ?? [];
      boardNames = new Map<string, string>(boards.map((b: any) => [b.id, b.name]));
      return boards.map((b: any) => ({ id: b.id, name: b.name, kind: 'board', group: 'Boards' }));
    } catch {
      return [];
    }
  }

  /**
   * Async `@card` search against the backend (searches ALL accessible cards,
   * not just assigned ones), cached per query.
   */
  async function searchCards(needle: string): Promise<Mentionable[]> {
    const q = needle.trim();
    if (!q) return [];
    const cached = cardSearchCache.get(q);
    if (cached) return cached;
    try {
      const res = await fetch('/api/v1/cards/search?q=' + encodeURIComponent(q), { credentials: 'include' });
      const cards = (await res.json())?.data ?? [];
      const items: Mentionable[] = cards.slice(0, 15).map((c: any) => ({
        id: c.id,
        name: c.title,
        kind: 'card',
        description: boardNames.get(c.boardId),
        group: 'Cards',
      }));
      cardSearchCache.set(q, items);
      return items;
    } catch {
      return [];
    }
  }

  // Trailing debounce so we don't hit the backend on every keystroke. A
  // superseded call resolves to [] (the kit drops it via its race guard anyway).
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let supersede: ((v: Mentionable[]) => void) | null = null;
  function debouncedSearchCards(needle: string): Promise<Mentionable[]> {
    return new Promise((resolve) => {
      if (supersede) supersede([]);
      supersede = resolve;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(async () => {
        const r = await searchCards(needle);
        resolve(r);
        supersede = null;
      }, 180);
    });
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

    // Mention provider — @boards (pre-fetched, in-memory) + @cards (async
    // backend search across all accessible cards). The kit now supports an
    // async provider: it shows a loading row and drops stale results.
    void loadBoards().then((boards) => {
      if (cancelled) return;
      whenDioscReady(() => cancelled, (diosc) => {
        diosc('mentionProvider', (needle: string): Promise<Mentionable[]> => {
          const q = needle.trim().toLowerCase();
          const boardMatches = (q ? boards.filter((b) => b.name.toLowerCase().includes(q)) : boards).slice(0, 6);
          return debouncedSearchCards(needle).then((cards) => [...boardMatches, ...cards]);
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
