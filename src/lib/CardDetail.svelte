<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import Avatar from '$lib/Avatar.svelte';
  import DueChip from '$lib/DueChip.svelte';
  import Popover from '$lib/Popover.svelte';
  import { dueMeta, shade, shadeText, timeAgo } from '$lib/ui';
  import { postAction } from '$lib/post';
  import type { Board, Card, Label, User } from '$lib/server/types';

  let {
    card,
    board,
    labels,
    users,
    currentUser,
    onClose
  }: {
    card: Card;
    board: Board;
    labels: Record<string, Label>;
    users: Record<string, User>;
    currentUser: User;
    onClose: () => void;
  } = $props();

  const routeId = $derived(`/b/${board.id}`);
  const post = (action: string, fields: Record<string, string>) => postAction(routeId, action, fields);

  const list = $derived(board.lists.find((l) => l.id === card.listId));
  const cardLabels = $derived(card.labels.map((l) => labels[l]).filter(Boolean));
  const members = $derived(card.members.map((m) => users[m]).filter(Boolean));
  const boardMembers = $derived(board.memberIds.map((id) => users[id]).filter(Boolean));
  const allLabels = $derived(Object.values(labels));
  const due = $derived(dueMeta(card.due));
  const done = $derived(card.checklist.filter((k) => k.done).length);
  const pct = $derived(card.checklist.length ? Math.round((done / card.checklist.length) * 100) : 0);
  const dueInputVal = $derived(card.due ? new Date(card.due).toISOString().slice(0, 10) : '');

  type FeedItem =
    | { _t: 'comment'; id: string; userId: string; at: string; text: string }
    | { _t: 'activity'; id: string; kind: string; actorUserId: string; at: string; text: string };
  const feed = $derived<FeedItem[]>(
    [
      ...card.comments.map((c) => ({ ...c, _t: 'comment' as const })),
      ...card.activity.map((a) => ({ ...a, _t: 'activity' as const }))
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  );

  let comment = $state('');
  let editingDesc = $state(false);
  let descDraft = $state('');
  let addingCheck = $state(false);
  let checkText = $state('');

  function startEditDesc() {
    descDraft = card.desc ?? '';
    editingDesc = true;
  }
  async function saveDesc() {
    await post('setDesc', { cardId: card.id, desc: descDraft.trim() });
    editingDesc = false;
  }
  async function submitComment() {
    const t = comment.trim();
    if (!t) return;
    comment = '';
    await post('comment', { cardId: card.id, text: t });
  }
  async function submitCheck() {
    const t = checkText.trim();
    if (!t) return;
    checkText = '';
    await post('addCheck', { cardId: card.id, text: t });
  }
  function setDue(value: string | null) {
    post('setDue', { cardId: card.id, due: value ?? '' });
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && !editingDesc) onClose();
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
    <div class="accent" style="background:linear-gradient(90deg, {board.accent}, {shade(board.accent)})"></div>

    <div class="cols">
      <div class="main">
        <div class="breadcrumb">
          <span class="bdot" style="background:{board.accent}"></span>
          {board.name} <Icon name="chevRight" size={13} /> <span class="list-name">{list?.name}</span>
        </div>

        <div class="title-row">
          <h2>{card.title}</h2>
          <button class="btn btn-ghost icon-btn" onclick={onClose}><Icon name="x" size={20} /></button>
        </div>

        {#if cardLabels.length > 0}
          <div class="labels">
            {#each cardLabels as l (l.id)}
              <span class="chip" style="height:26px;background:{l.color}24;color:{shadeText(l.color)}">
                <span class="ldot" style="background:{l.color}"></span>{l.name}
              </span>
            {/each}
          </div>
        {/if}

        <!-- description -->
        <div class="section">
          <div class="sec-head">
            <Icon name="align" size={17} color="var(--ink-3)" />
            <h3>Description</h3>
            {#if !editingDesc}
              <button class="btn btn-ghost edit" onclick={startEditDesc}>Edit</button>
            {/if}
          </div>
          <div class="sec-body">
            {#if editingDesc}
              <textarea
                bind:value={descDraft}
                rows="4"
                placeholder="Add a more detailed description…"
                onkeydown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveDesc();
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    editingDesc = false;
                  }
                }}></textarea>
              <div class="row-btns">
                <button class="btn btn-primary sm" onclick={saveDesc}>Save</button>
                <button class="btn btn-ghost sm" onclick={() => (editingDesc = false)}>Cancel</button>
              </div>
            {:else}
              <p class="desc" class:empty={!card.desc} onclick={startEditDesc} role="presentation">
                {card.desc || 'Add a more detailed description…'}
              </p>
            {/if}
          </div>
        </div>

        <!-- checklist -->
        {#if card.checklist.length > 0 || addingCheck}
          <div class="section">
            <div class="sec-head">
              <Icon name="checkSquare" size={17} color="var(--ink-3)" />
              <h3>Checklist</h3>
              {#if card.checklist.length > 0}<span class="pct mono">{pct}%</span>{/if}
            </div>
            <div class="sec-body">
              {#if card.checklist.length > 0}
                <div class="bar"><div class="fill" style="width:{pct}%"></div></div>
              {/if}
              <div class="checks">
                {#each card.checklist as k (k.id)}
                  <div class="check-row">
                    <button class="cbox" class:on={k.done} onclick={() => post('toggleCheck', { cardId: card.id, itemId: k.id })}>
                      <Icon name={k.done ? 'checkSquare' : 'square'} size={19} />
                    </button>
                    <span class="ctext" class:done={k.done}>{k.text}</span>
                    <button class="cremove" title="Remove" onclick={() => post('removeCheck', { cardId: card.id, itemId: k.id })}>
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                {/each}
              </div>
              {#if addingCheck}
                <div class="add-check">
                  <input
                    bind:value={checkText}
                    placeholder="Add an item…"
                    onkeydown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitCheck();
                      }
                      if (e.key === 'Escape') {
                        addingCheck = false;
                        checkText = '';
                      }
                    }} />
                  <div class="row-btns">
                    <button class="btn btn-primary sm" onclick={submitCheck}>Add</button>
                    <button class="btn btn-ghost sm" onclick={() => (addingCheck = false)}>Done</button>
                  </div>
                </div>
              {:else}
                <button class="btn btn-ghost add-item" onclick={() => (addingCheck = true)}><Icon name="plus" size={15} /> Add an item</button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- activity -->
        <div class="section">
          <div class="sec-head">
            <Icon name="message" size={17} color="var(--ink-3)" />
            <h3>Activity</h3>
          </div>
          <div class="sec-body">
            <div class="composer">
              <Avatar user={currentUser} size={32} />
              <input
                bind:value={comment}
                placeholder="Write a comment…"
                onkeydown={(e) => {
                  if (e.key === 'Enter') submitComment();
                }} />
            </div>
            <div class="feed">
              {#if feed.length === 0}<span class="empty-feed">No activity yet.</span>{/if}
              {#each feed as f (f.id)}
                {#if f._t === 'comment'}
                  {@const u = users[f.userId]}
                  <div class="comment">
                    <Avatar user={u} size={32} />
                    <div class="c-body">
                      <div class="c-head"><span class="c-name">{u?.name}</span><span class="c-time">{timeAgo(f.at)}</span></div>
                      <div class="c-text">{f.text}</div>
                    </div>
                  </div>
                {:else}
                  {@const u = users[f.actorUserId]}
                  {@const isAgent = f.kind === 'agent'}
                  <div class="activity">
                    {#if isAgent}
                      <span class="spark-av"><Icon name="spark" size={16} color="var(--beam)" /></span>
                    {:else}
                      <Avatar user={u} size={32} />
                    {/if}
                    <div class="a-body">
                      <div class="a-text">
                        <b>{isAgent ? 'Dioschub Assistant' : u?.name}</b>
                        {f.text} · <span class="a-time">{timeAgo(f.at)}</span>
                      </div>
                      {#if isAgent}
                        <div class="acting mono"><Icon name="shield" size={12} /> acting as {u?.email}</div>
                      {/if}
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- sidebar -->
      <div class="side">
        <div class="side-label">Assignees</div>
        <div class="side-row">
          {#each members as m (m.id)}
            <button class="member-pill" title="Remove {m.name}" onclick={() => post('toggleMember', { cardId: card.id, userId: m.id })}>
              <Avatar user={m} size={22} /><span>{m.name.split(' ')[0]}</span>
            </button>
          {/each}
          <Popover width={236} align="right">
            {#snippet trigger({ toggle })}
              <button class="add-round" title="Add assignee" onclick={toggle}><Icon name="plus" size={15} /></button>
            {/snippet}
            {#snippet children()}
              <div class="pop-head">Board members</div>
              {#each boardMembers as m (m.id)}
                <button class="pop-row" onclick={() => post('toggleMember', { cardId: card.id, userId: m.id })}>
                  <Avatar user={m} size={26} />
                  <span class="pr-meta"><span class="pr-name">{m.name}</span><span class="pr-sub">{m.title}</span></span>
                  {#if card.members.includes(m.id)}<Icon name="check" size={16} color="var(--brand)" />{/if}
                </button>
              {/each}
            {/snippet}
          </Popover>
        </div>

        <div class="side-label">Labels</div>
        <div class="side-row">
          {#each cardLabels as l (l.id)}
            <span class="chip" style="background:{l.color}24;color:{shadeText(l.color)}">
              <span class="ldot" style="background:{l.color}"></span>{l.name}
            </span>
          {/each}
          <Popover width={224} align="right">
            {#snippet trigger({ toggle })}
              <button class="add-label" onclick={toggle}><Icon name="plus" size={13} /> Label</button>
            {/snippet}
            {#snippet children()}
              <div class="pop-head">Labels</div>
              {#each allLabels as l (l.id)}
                <button class="pop-row" onclick={() => post('toggleLabel', { cardId: card.id, labelId: l.id })}>
                  <span class="label-full" style="background:{l.color}24;color:{shadeText(l.color)}">
                    <span class="ldot" style="background:{l.color}"></span>{l.name}
                  </span>
                  {#if card.labels.includes(l.id)}<Icon name="check" size={16} color="var(--brand)" />{/if}
                </button>
              {/each}
            {/snippet}
          </Popover>
        </div>

        <div class="side-label">Due date</div>
        <div class="side-row">
          <Popover width={232} align="right">
            {#snippet trigger({ toggle })}
              {#if due}
                <button onclick={toggle}><DueChip {due} /></button>
              {:else}
                <button class="btn btn-outline set-date" onclick={toggle}><Icon name="calendar" size={16} /> Set date</button>
              {/if}
            {/snippet}
            {#snippet children({ close })}
              <div class="pop-head">Due date</div>
              <input
                type="date"
                value={dueInputVal}
                class="date-input"
                onchange={(e) => setDue(e.currentTarget.value ? new Date(e.currentTarget.value + 'T17:00:00').toISOString() : null)} />
              {#if card.due}
                <button
                  class="btn btn-ghost clear"
                  onclick={() => {
                    setDue(null);
                    close();
                  }}>Clear date</button>
              {/if}
            {/snippet}
          </Popover>
        </div>

        <div class="side-label">Add to card</div>
        <div class="actions-col">
          <button class="action-btn" onclick={() => (addingCheck = true)}><Icon name="checkSquare" size={16} /> Checklist</button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; z-index: 120; background: rgba(26, 24, 20, 0.42); backdrop-filter: blur(3px);
    display: flex; align-items: flex-start; justify-content: center; padding: 52px 20px 40px; overflow-y: auto; animation: overlayIn 0.16s ease; }
  .modal { width: min(820px, 100%); background: var(--surface); border-radius: 18px; overflow: hidden;
    box-shadow: var(--shadow-pop); animation: scaleIn 0.2s cubic-bezier(0.2, 0.9, 0.3, 1); }
  .accent { height: 6px; }
  .cols { display: flex; }
  .main { flex: 1; padding: 22px 26px 28px; min-width: 0; }
  .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ink-3); margin-bottom: 12px; }
  .bdot { width: 8px; height: 8px; border-radius: 2.5px; }
  .list-name { font-weight: 600; color: var(--ink-2); }
  .title-row { display: flex; gap: 12px; align-items: flex-start; }
  h2 { font-family: var(--font-display); font-size: 25px; font-weight: 600; letter-spacing: -0.01em; margin: 0; color: var(--ink); line-height: 1.2; flex: 1; }
  .icon-btn { width: 34px; height: 34px; padding: 0; justify-content: center; flex: none; }
  .labels { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
  .ldot { width: 8px; height: 8px; border-radius: 99px; }

  .section { margin-top: 24px; }
  .sec-head { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }
  .sec-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--ink); flex: 1; }
  .edit { height: 28px; padding: 0 9px; font-size: 12.5px; }
  .pct { font-size: 12px; font-weight: 700; color: var(--ink-3); }
  .mono { font-family: var(--font-mono); }
  .sec-body { padding-left: 26px; }
  textarea { width: 100%; resize: vertical; border-radius: 10px; border: 1px solid var(--brand); padding: 11px 12px;
    font-size: 14px; color: var(--ink); outline: none; background: var(--surface); line-height: 1.55; font-family: inherit; }
  .row-btns { display: flex; gap: 8px; margin-top: 8px; }
  .sm { height: 32px; }
  .desc { margin: 0; font-size: 14px; color: var(--ink); line-height: 1.6; cursor: text; }
  .desc.empty { color: var(--ink-3); }

  .bar { height: 6px; border-radius: 99px; background: var(--surface-2); overflow: hidden; margin: 2px 0 12px; }
  .fill { height: 100%; background: var(--brand); border-radius: 99px; transition: width 0.3s cubic-bezier(0.2, 0.9, 0.3, 1); }
  .checks { display: flex; flex-direction: column; gap: 2px; }
  .check-row { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 8px; border-radius: 8px; }
  .check-row:hover { background: var(--canvas); }
  .cbox { display: flex; flex: none; color: var(--ink-3); }
  .cbox.on { color: var(--brand); }
  .ctext { flex: 1; font-size: 13.5px; color: var(--ink); }
  .ctext.done { color: var(--ink-3); text-decoration: line-through; }
  .cremove { width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; color: var(--ink-3); flex: none; }
  .cremove:hover { background: rgba(26, 24, 20, 0.06); color: var(--ink); }
  .add-check { margin-top: 8px; padding-left: 8px; }
  .add-check input { width: 100%; height: 36px; padding: 0 11px; border-radius: 9px; border: 1px solid var(--brand);
    font-size: 13.5px; color: var(--ink); outline: none; background: var(--surface); }
  .add-item { height: 32px; margin-top: 6px; font-size: 13px; }

  .composer { display: flex; gap: 11px; margin-bottom: 18px; }
  .composer input { width: 100%; height: 40px; padding: 0 13px; border-radius: 10px; border: 1px solid var(--line-2);
    font-size: 13.5px; color: var(--ink); outline: none; background: var(--canvas); }
  .composer input:focus { border-color: var(--brand); }
  .feed { display: flex; flex-direction: column; gap: 16px; }
  .empty-feed { font-size: 13px; color: var(--ink-3); }
  .comment { display: flex; gap: 11px; }
  .c-body { flex: 1; }
  .c-head { display: flex; align-items: baseline; gap: 8px; }
  .c-name { font-size: 13.5px; font-weight: 700; color: var(--ink); }
  .c-time { font-size: 11.5px; color: var(--ink-3); }
  .c-text { font-size: 13.5px; color: var(--ink); line-height: 1.55; margin-top: 3px; background: var(--canvas);
    padding: 9px 12px; border-radius: 4px 12px 12px 12px; border: 1px solid var(--line); }
  .activity { display: flex; gap: 11px; align-items: flex-start; }
  .spark-av { width: 32px; height: 32px; border-radius: 99px; background: var(--ink-900); display: grid; place-items: center;
    flex: none; box-shadow: 0 0 0 2px var(--surface); }
  .a-body { flex: 1; padding-top: 2px; }
  .a-text { font-size: 13px; color: var(--ink-2); line-height: 1.5; }
  .a-text b { color: var(--ink); font-weight: 700; }
  .a-time { color: var(--ink-3); }
  .acting { display: inline-flex; align-items: center; gap: 6px; margin-top: 5px; padding: 3px 8px; border-radius: 6px;
    background: var(--brand-tint); font-size: 11px; color: var(--brand-700); white-space: nowrap; }

  .side { width: 230px; flex: none; border-left: 1px solid var(--line); padding: 22px 18px; background: var(--canvas); }
  .side-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 9px; }
  .side-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
  .member-pill { display: flex; align-items: center; gap: 6px; padding: 3px 9px 3px 3px; border-radius: 99px; background: var(--surface); border: 1px solid var(--line); }
  .member-pill span { font-size: 12px; font-weight: 600; }
  .member-pill:hover { border-color: var(--ink-3); }
  .add-round { width: 28px; height: 28px; border-radius: 99px; border: 1px dashed var(--line-2); display: grid; place-items: center; color: var(--ink-3); }
  .add-round:hover { border-color: var(--ink-3); }
  .add-label { height: 22px; padding: 0 9px; border-radius: 6px; border: 1px dashed var(--line-2); display: flex; align-items: center; gap: 5px; color: var(--ink-3); font-size: 11.5px; font-weight: 700; }
  .add-label:hover { border-color: var(--ink-3); }
  .set-date { height: 34px; font-size: 13px; }
  .actions-col { display: flex; flex-direction: column; gap: 4px; }
  .action-btn { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 9px; background: var(--surface);
    border: 1px solid var(--line); font-size: 13px; font-weight: 600; color: var(--ink-2); text-align: left; width: 100%; }
  .action-btn:hover { border-color: var(--ink-3); }

  .pop-head { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); padding: 4px 8px 8px; }
  .pop-row { width: 100%; display: flex; align-items: center; gap: 9px; padding: 7px 8px; border-radius: 8px; text-align: left; }
  .pop-row:hover { background: var(--canvas); }
  .pr-meta { flex: 1; min-width: 0; }
  .pr-name { display: block; font-size: 13px; font-weight: 600; color: var(--ink); }
  .pr-sub { display: block; font-size: 11px; color: var(--ink-3); }
  .label-full { flex: 1; height: 26px; border-radius: 7px; display: flex; align-items: center; gap: 7px; padding: 0 10px; font-size: 12.5px; font-weight: 700; }
  .date-input { width: 100%; height: 38px; padding: 0 11px; border-radius: 9px; border: 1px solid var(--line-2); font-size: 13.5px; color: var(--ink); outline: none; background: var(--surface); }
  .clear { height: 32px; margin-top: 6px; width: 100%; justify-content: center; }
</style>
