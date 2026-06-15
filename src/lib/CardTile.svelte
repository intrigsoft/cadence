<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import AvatarStack from '$lib/AvatarStack.svelte';
  import DueChip from '$lib/DueChip.svelte';
  import { dueMeta, shadeText } from '$lib/ui';
  import type { Card, Label, User } from '$lib/server/types';

  let {
    card,
    labels,
    users,
    onOpen
  }: {
    card: Card;
    labels: Record<string, Label>;
    users: Record<string, User>;
    onOpen: (id: string) => void;
  } = $props();

  const cardLabels = $derived(card.labels.map((l) => labels[l]).filter(Boolean));
  const members = $derived(card.members.map((m) => users[m]).filter(Boolean));
  const due = $derived(dueMeta(card.due));
  const done = $derived(card.checklist.filter((k) => k.done).length);
  const hasAgent = $derived(card.activity.some((a) => a.kind === 'agent'));
  const hasMeta = $derived(
    !!due || card.checklist.length > 0 || card.comments.length > 0 || hasAgent || members.length > 0
  );
</script>

<div
  class="tile"
  role="button"
  tabindex="0"
  onclick={() => onOpen(card.id)}
  onkeydown={(e) => {
    if (e.key === 'Enter') onOpen(card.id);
  }}>
  {#if cardLabels.length > 0}
    <div class="labels">
      {#each cardLabels as l (l.id)}
        <span class="chip" style="background:{l.color}1F;color:{shadeText(l.color)}">
          <span class="ldot" style="background:{l.color}"></span>{l.name}
        </span>
      {/each}
    </div>
  {/if}

  <div class="title">{card.title}</div>

  {#if hasMeta}
    <div class="meta">
      {#if due}<DueChip {due} />{/if}
      {#if card.checklist.length > 0}
        <span class="m" class:done={done === card.checklist.length}>
          <Icon name="checkSquare" size={14} /> {done}/{card.checklist.length}
        </span>
      {/if}
      {#if card.comments.length > 0}
        <span class="m"><Icon name="message" size={14} /> {card.comments.length}</span>
      {/if}
      {#if hasAgent}
        <span class="agent" title="Touched by the Dioschub assistant"><Icon name="spark" size={12} /> Dioschub</span>
      {/if}
      <div class="grow"></div>
      {#if members.length > 0}<AvatarStack users={members} size={23} max={3} />{/if}
    </div>
  {/if}
</div>

<style>
  .tile { background: var(--surface); border-radius: 11px; border: 1px solid var(--line); padding: 11px 12px 10px;
    cursor: pointer; box-shadow: var(--shadow-card); transition: box-shadow 0.14s, transform 0.14s; position: relative; }
  .tile:hover { box-shadow: var(--shadow-pop); transform: translateY(-1px); }
  .labels { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
  .ldot { width: 7px; height: 7px; border-radius: 99px; }
  .title { font-size: 13.5px; font-weight: 500; color: var(--ink); line-height: 1.35; }
  .meta { display: flex; align-items: center; gap: 9px; margin-top: 11px; flex-wrap: wrap; }
  .m { display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--ink-3); }
  .m.done { color: #0b6b60; }
  .agent { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--brand);
    background: var(--brand-tint); padding: 2px 6px; border-radius: 6px; }
  .grow { flex: 1; }
</style>
