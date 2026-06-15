<script lang="ts">
  import { page } from '$app/stores';
  import Sidebar from '$lib/Sidebar.svelte';
  import TopBar from '$lib/TopBar.svelte';
  import AssistantPanel from '$lib/AssistantPanel.svelte';
  import NewBoardModal from '$lib/NewBoardModal.svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  let newBoardOpen = $state(false);

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
</div>

<style>
  .app { display: flex; height: 100vh; overflow: hidden; }
  .column { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .content { flex: 1; display: flex; min-height: 0; }
  .main { flex: 1; min-width: 0; background: var(--canvas); position: relative; overflow: hidden; }
</style>
