<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { env } from '$env/dynamic/public';
  import Sidebar from '$lib/Sidebar.svelte';
  import TopBar from '$lib/TopBar.svelte';
  import AssistantPanel from '$lib/AssistantPanel.svelte';
  import NewBoardModal from '$lib/NewBoardModal.svelte';
  import Toaster from '$lib/Toaster.svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  let newBoardOpen = $state(false);

  // Embed the DioscHub assistant kit. The loader auto-injects <diosc-chat>; we
  // pre-seed diosc('config', { bindEndpoint }) into the queue (drained at engine
  // init) so the kit calls our /api/diosc/bind to bind the signed-in user's BYOA
  // artifact. Only mounts when an embed key is configured.
  onMount(() => {
    const key = env.PUBLIC_DIOSC_EMBED_KEY;
    if (!key) return;
    const hub = (env.PUBLIC_DIOSC_HUB_URL || 'http://localhost:3333').replace(/\/$/, '');
    type DioscFn = { (...a: unknown[]): void; q?: unknown[][] };
    const w = window as unknown as { diosc?: DioscFn };
    if (!w.diosc) {
      const fn: DioscFn = (...a: unknown[]) => {
        (fn.q = fn.q || []).push(a);
      };
      fn.q = [];
      w.diosc = fn;
    }
    const diosc = w.diosc;
    diosc('config', { bindEndpoint: '/api/diosc/bind', autoConnect: true });
    const s = document.createElement('script');
    s.src = `${hub}/api/embed/${key}/loader.js`;
    s.async = true;
    // The kit bootstraps its engine on window 'load', which can race ahead of
    // the <diosc-chat> element configuring apiKey/backendUrl — so auto-connect
    // misses. Re-assert config + connect a few times until the WS is up; connect
    // is idempotent. This also guarantees bindEndpoint is set before the bind.
    s.onload = () => {
      let tries = 0;
      const iv = setInterval(() => {
        try {
          diosc('config', { bindEndpoint: '/api/diosc/bind', autoConnect: true });
          diosc('connect');
        } catch {
          /* engine not ready yet */
        }
        if (++tries >= 6) clearInterval(iv);
      }, 600);
    };
    document.head.appendChild(s);
  });

  const activeBoardId = $derived(
    $page.url.pathname.startsWith('/b/') ? $page.url.pathname.split('/')[2] : null
  );
  const activeBoard = $derived(activeBoardId ? (data.boards.find((b) => b.id === activeBoardId) ?? null) : null);
</script>

<div class="app">
  <Sidebar workspace={data.workspace} boards={data.boards} onNewBoard={() => (newBoardOpen = true)} />

  <div class="column">
    <TopBar
      currentUser={data.currentUser}
      personas={data.personas}
      accessibleBoardCount={data.accessibleBoardCount}
      {activeBoard} />

    <div class="content">
      <main class="main grain">
        {@render children()}
      </main>
      <AssistantPanel currentUser={data.currentUser} boards={data.boards} />
    </div>
  </div>

  {#if newBoardOpen}
    <NewBoardModal onClose={() => (newBoardOpen = false)} />
  {/if}

  <Toaster />
</div>

<style>
  .app { display: flex; height: 100vh; overflow: hidden; }
  .column { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .content { flex: 1; display: flex; min-height: 0; }
  .main { flex: 1; min-width: 0; background: var(--canvas); position: relative; overflow: hidden; }
</style>
