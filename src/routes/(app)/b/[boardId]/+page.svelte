<script lang="ts">
  import { flip } from 'svelte/animate';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import Icon from '$lib/Icon.svelte';
  import AvatarStack from '$lib/AvatarStack.svelte';
  import CardTile from '$lib/CardTile.svelte';
  import CardDetail from '$lib/CardDetail.svelte';
  import TimeReport from '$lib/TimeReport.svelte';
  import { searchQuery } from '$lib/stores';
  import { postAction } from '$lib/post';
  import type { PageData } from './$types';
  import type { Card, List, User } from '$lib/server/types';

  let { data }: { data: PageData } = $props();

  const routeId = $derived(`/b/${data.board.id}`);
  const members = $derived(data.board.memberIds.map((id) => data.users[id]).filter((u): u is User => !!u));
  const q = $derived($searchQuery.trim().toLowerCase());
  const dragDisabled = $derived(q.length > 0);

  // Build the dnd columns from server data; rebuilds after every invalidateAll
  // (the server is authoritative — a rejected move snaps back here).
  let columns = $state<{ list: List; items: Card[] }[]>([]);
  $effect(() => {
    columns = data.board.lists.map((l) => ({
      list: l,
      items: data.cards.filter((c) => c.listId === l.id)
    }));
  });

  function matches(c: Card): boolean {
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      (c.desc?.toLowerCase().includes(q) ?? false) ||
      c.labels.some((l) => data.labels[l]?.name.toLowerCase().includes(q))
    );
  }
  const shown = (items: Card[]) => (q ? items.filter(matches) : items);

  function handleConsider(i: number, e: CustomEvent<DndEvent<Card>>) {
    columns[i].items = e.detail.items;
    columns = [...columns];
  }
  async function handleFinalize(i: number, e: CustomEvent<DndEvent<Card>>) {
    columns[i].items = e.detail.items;
    columns = [...columns];
    const id = String(e.detail.info.id);
    const idx = e.detail.items.findIndex((c) => c.id === id);
    if (idx < 0) return; // this is the source zone; the target zone persists
    await postAction(routeId, 'move', { cardId: id, toListId: columns[i].list.id, toIndex: String(idx) });
  }

  let showReport = $state(false);

  // inline composers
  let addingCardFor = $state<string | null>(null);
  let cardDraft = $state('');
  let addingList = $state(false);
  let listDraft = $state('');

  async function submitCard(listId: string) {
    const t = cardDraft.trim();
    if (!t) return;
    cardDraft = '';
    await postAction(routeId, 'addCard', { listId, title: t });
  }
  async function submitList() {
    const t = listDraft.trim();
    if (!t) return;
    listDraft = '';
    addingList = false;
    await postAction(routeId, 'addList', { name: t });
  }

  // card modal — read fresh from data so it updates after mutations.
  // Honors a ?card=ID deep-link (e.g. from My Cards) on first render.
  let openCardId = $state<string | null>(get(page).url.searchParams.get('card'));
  const openCard = $derived(openCardId ? (data.cards.find((c) => c.id === openCardId) ?? null) : null);
</script>

<svelte:head><title>{data.board.name} · Cadence</title></svelte:head>

<div class="board">
  <div class="header">
    <div class="accent-bar" style="background:{data.board.accent};box-shadow:0 4px 14px -2px {data.board.accent}66"></div>
    <div class="head-text">
      <div class="title-line">
        <h1>{data.board.name}</h1>
        {#if data.board.visibility === 'private'}
          <span class="private"><Icon name="lock" size={12} /> Private</span>
        {/if}
      </div>
      <div class="subtitle">{data.board.subtitle}</div>
    </div>
    <div class="grow"></div>
    {#if data.myRole}
      <span class="role-pill" title="Your role on this board">
        <span class="rdot" style="background:{data.myRole.color}"></span>{data.myRole.name}
      </span>
    {/if}
    <button class="btn {showReport ? 'btn-primary' : 'btn-outline'} wf" onclick={() => (showReport = !showReport)} title="Board time report">
      <Icon name="chart" size={16} /> Report
    </button>
    {#if data.currentUser.role === 'admin'}
      <a class="btn btn-outline wf" href="/b/{data.board.id}/workflow"><Icon name="flow" size={16} /> Workflow</a>
    {/if}
    <AvatarStack users={members} size={30} max={5} />
  </div>

  {#if showReport}
    <TimeReport board={data.board} cards={data.cards} users={data.users} />
  {:else}
  <div class="lanes">
    {#each columns as col, i (col.list.id)}
      {@const visible = shown(col.items)}
      <div class="list">
        <div class="list-head">
          <span class="list-name">{col.list.name}</span>
          <span class="count mono">{col.items.length}</span>
          <div class="grow"></div>
          <button class="btn btn-ghost dots"><Icon name="dots" size={16} /></button>
        </div>

        <div
          class="cards"
          use:dndzone={{ items: col.items, flipDurationMs: 160, dragDisabled, type: 'card', dropTargetStyle: {} }}
          onconsider={(e) => handleConsider(i, e)}
          onfinalize={(e) => handleFinalize(i, e)}>
          {#each col.items as card (card.id)}
            <div animate:flip={{ duration: 160 }} class="card-wrap" style:display={matches(card) ? 'block' : 'none'}>
              <CardTile {card} labels={data.labels} users={data.users} onOpen={(id) => (openCardId = id)} />
            </div>
          {/each}
        </div>

        {#if addingCardFor === col.list.id}
          <div class="composer">
            <textarea
              bind:value={cardDraft}
              rows="2"
              placeholder="What needs doing?"
              onkeydown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitCard(col.list.id);
                }
                if (e.key === 'Escape') {
                  addingCardFor = null;
                  cardDraft = '';
                }
              }}></textarea>
            <div class="row-btns">
              <button class="btn btn-primary sm" onclick={() => submitCard(col.list.id)}>Add card</button>
              <button
                class="btn btn-ghost sm icon"
                onclick={() => {
                  addingCardFor = null;
                  cardDraft = '';
                }}><Icon name="x" size={17} /></button>
            </div>
          </div>
        {:else}
          <button
            class="add-card"
            onclick={() => {
              addingCardFor = col.list.id;
              cardDraft = '';
            }}><Icon name="plus" size={16} /> Add a card</button>
        {/if}
        {#if q && visible.length === 0}<div class="no-match">No matches</div>{/if}
      </div>
    {/each}

    <!-- add list -->
    {#if addingList}
      <div class="add-list-box">
        <input
          bind:value={listDraft}
          placeholder="List name…"
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitList();
            }
            if (e.key === 'Escape') {
              addingList = false;
              listDraft = '';
            }
          }} />
        <div class="row-btns">
          <button class="btn btn-primary sm" onclick={submitList}>Add list</button>
          <button class="btn btn-ghost sm icon" onclick={() => (addingList = false)}><Icon name="x" size={17} /></button>
        </div>
      </div>
    {:else}
      <button class="add-list" onclick={() => (addingList = true)}><Icon name="plus" size={17} /> Add a list</button>
    {/if}
  </div>
  {/if}
</div>

{#if openCard}
  <CardDetail
    card={openCard}
    board={data.board}
    labels={data.labels}
    users={data.users}
    currentUser={data.currentUser}
    runningTimer={data.runningTimer}
    onClose={() => (openCardId = null)} />
{/if}

<style>
  .board { position: relative; height: 100%; display: flex; flex-direction: column; }
  .header { position: relative; z-index: 1; flex: none; padding: 18px 28px 16px; display: flex; align-items: center; gap: 14px;
    border-bottom: 1px solid var(--line); }
  .accent-bar { width: 12px; height: 40px; border-radius: 5px; flex: none; }
  .head-text { min-width: 0; }
  .title-line { display: flex; align-items: center; gap: 10px; }
  h1 { font-family: var(--font-display); font-size: 23px; font-weight: 600; letter-spacing: -0.01em; margin: 0;
    color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .private { display: flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 7px; background: var(--surface-2);
    color: var(--ink-2); font-size: 11px; font-weight: 700; flex: none; }
  .subtitle { font-size: 13px; color: var(--ink-2); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .grow { flex: 1; }
  .role-pill { display: flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 99px; background: var(--surface);
    border: 1px solid var(--line-2); font-size: 12px; font-weight: 700; color: var(--ink-2); flex: none; }
  .rdot { width: 8px; height: 8px; border-radius: 99px; }
  .wf { height: 34px; flex: none; }

  .lanes { position: relative; z-index: 1; flex: 1; overflow-x: auto; overflow-y: hidden; display: flex; gap: 14px;
    padding: 18px 28px 22px; align-items: flex-start; }
  .list { flex: none; width: 272px; max-height: 100%; display: flex; flex-direction: column; background: var(--surface-2);
    border-radius: 14px; border: 1px solid var(--paper-edge); }
  .list-head { display: flex; align-items: center; gap: 8px; padding: 11px 13px 9px; flex: none; }
  .list-name { font-size: 13px; font-weight: 700; color: var(--ink); }
  .count { font-size: 11.5px; font-weight: 700; color: var(--ink-3); background: rgba(26, 24, 20, 0.05); padding: 1px 7px; border-radius: 99px; }
  .mono { font-family: var(--font-mono); }
  .dots { width: 26px; height: 26px; padding: 0; justify-content: center; border-radius: 7px; }
  .cards { overflow-y: auto; padding: 0 8px; flex: 1; min-height: 8px; }
  .card-wrap { margin-bottom: 8px; }
  .no-match { padding: 8px; font-size: 12px; color: var(--ink-3); text-align: center; }

  .composer { padding: 0 8px 8px; }
  .composer textarea { width: 100%; resize: none; border-radius: 10px; border: 1px solid var(--brand); padding: 10px 11px;
    font-size: 13.5px; color: var(--ink); outline: none; box-shadow: var(--shadow-card); background: var(--surface); font-family: inherit; }
  .row-btns { display: flex; gap: 8px; margin-top: 7px; }
  .sm { height: 32px; }
  .sm.icon { width: 32px; padding: 0; justify-content: center; }
  .add-card { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 13px; color: var(--ink-2);
    font-weight: 600; font-size: 13px; border-radius: 0 0 14px 14px; flex: none; }
  .add-card:hover { background: rgba(26, 24, 20, 0.04); }

  .add-list { flex: none; width: 272px; padding: 13px 14px; border-radius: 14px; text-align: left; color: var(--ink-3);
    font-weight: 600; font-size: 13.5px; background: rgba(26, 24, 20, 0.025); border: 1px dashed var(--line-2);
    display: flex; align-items: center; gap: 8px; }
  .add-list:hover { background: rgba(26, 24, 20, 0.05); }
  .add-list-box { flex: none; width: 272px; padding: 8px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--paper-edge); }
  .add-list-box input { width: 100%; height: 38px; padding: 0 11px; border-radius: 9px; border: 1px solid var(--brand);
    font-size: 13.5px; color: var(--ink); outline: none; background: var(--surface); }
</style>
