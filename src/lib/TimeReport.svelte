<script lang="ts">
  import Avatar from '$lib/Avatar.svelte';
  import { fmtMins } from '$lib/ui';
  import type { Board, Card, User } from '$lib/server/types';

  let {
    board,
    cards,
    users
  }: { board: Board; cards: Card[]; users: Record<string, User> } = $props();

  const members = $derived(board.memberIds.map((id) => users[id]).filter((u): u is User => !!u));

  type Agg = {
    cell: Record<string, number>;
    userTotal: Record<string, number>;
    listTotal: Record<string, number>;
    grand: number;
  };
  const agg = $derived.by<Agg>(() => {
    const cell: Record<string, number> = {};
    const userTotal: Record<string, number> = {};
    const listTotal: Record<string, number> = {};
    let grand = 0;
    for (const c of cards) {
      for (const e of c.timeEntries) {
        const k = e.userId + '|' + e.listId;
        cell[k] = (cell[k] ?? 0) + e.minutes;
        userTotal[e.userId] = (userTotal[e.userId] ?? 0) + e.minutes;
        listTotal[e.listId] = (listTotal[e.listId] ?? 0) + e.minutes;
        grand += e.minutes;
      }
    }
    return { cell, userTotal, listTotal, grand };
  });

  const byCard = $derived(
    cards
      .map((c) => ({ c, mins: c.timeEntries.reduce((s, e) => s + e.minutes, 0) }))
      .filter((x) => x.mins > 0)
      .sort((a, b) => b.mins - a.mins)
  );
  const maxCard = $derived(byCard.length ? byCard[0].mins : 1);
  const roleFor = (uid: string) => {
    const rid = board.roleAssignments[uid];
    return rid ? board.roles[rid] : null;
  };
</script>

<div class="scroll">
  <div class="wrap">
    <h2>Time report</h2>
    <p class="lede">
      {#if agg.grand > 0}
        Total of <b>{fmtMins(agg.grand)}</b> tracked on this board — by person and stage.
      {:else}
        Nothing tracked yet. Timers and manual logs will land here.
      {/if}
    </p>

    {#if agg.grand > 0}
      <div class="card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="left">Member</th>
                {#each board.lists as l (l.id)}<th>{l.name}</th>{/each}
                <th class="strong">Total</th>
              </tr>
            </thead>
            <tbody>
              {#each members as u (u.id)}
                {@const role = roleFor(u.id)}
                <tr>
                  <td class="left member">
                    <Avatar user={u} size={26} />
                    <span class="m-name">{u.name}</span>
                    {#if role}<span class="m-role"><span class="rdot" style="background:{role.color}"></span>{role.name}</span>{/if}
                  </td>
                  {#each board.lists as l (l.id)}
                    {@const v = agg.cell[u.id + '|' + l.id]}
                    <td class="num" class:dim={!v}>{v ? fmtMins(v) : '·'}</td>
                  {/each}
                  <td class="num strong">{agg.userTotal[u.id] ? fmtMins(agg.userTotal[u.id]) : '·'}</td>
                </tr>
              {/each}
              <tr class="foot">
                <td class="left strong">All members</td>
                {#each board.lists as l (l.id)}
                  <td class="num strong" class:dim={!agg.listTotal[l.id]}>{agg.listTotal[l.id] ? fmtMins(agg.listTotal[l.id]) : '·'}</td>
                {/each}
                <td class="num brand">{fmtMins(agg.grand)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h3>By card</h3>
      <div class="bars">
        {#each byCard as { c, mins } (c.id)}
          {@const l = board.lists.find((x) => x.id === c.listId)}
          <div class="bar-row">
            <span class="bc-title">{c.title}</span>
            <span class="bc-stage">{l?.name ?? ''}</span>
            <span class="track"><span class="fill" style="width:{Math.max(4, (mins / maxCard) * 100)}%;background:{board.accent}"></span></span>
            <span class="bc-mins mono">{fmtMins(mins)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .scroll { position: relative; z-index: 1; height: 100%; overflow-y: auto; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 30px 32px 60px; }
  h2 { font-family: var(--font-display); font-size: 24px; font-weight: 600; letter-spacing: -0.01em; margin: 0; color: var(--ink); }
  .lede { font-size: 13.5px; color: var(--ink-2); margin: 6px 0 22px; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-card); overflow: hidden; }
  .table-scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3);
    text-align: right; padding: 8px 12px; white-space: nowrap; }
  th.left { text-align: left; }
  th.strong { color: var(--ink); }
  td { font-family: var(--font-mono); font-size: 12.5px; text-align: right; padding: 9px 12px; border-top: 1px solid var(--line); white-space: nowrap; }
  td.left { font-family: var(--font-ui); text-align: left; }
  td.num.dim { color: var(--line-2); }
  td.strong { font-weight: 700; color: var(--ink); }
  td.brand { font-weight: 700; color: var(--brand); }
  .member { display: flex; align-items: center; gap: 9px; }
  .m-name { font-size: 13px; font-weight: 700; }
  .m-role { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--ink-2);
    background: rgba(26, 24, 20, 0.05); padding: 1px 7px; border-radius: 99px; }
  .rdot { width: 6px; height: 6px; border-radius: 99px; }
  tr.foot td { font-weight: 700; }
  h3 { font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); margin: 26px 0 12px; }
  .bars { display: flex; flex-direction: column; gap: 8px; }
  .bar-row { display: flex; align-items: center; gap: 14px; padding: 11px 16px; border-radius: 12px; background: var(--surface);
    border: 1px solid var(--line); box-shadow: var(--shadow-card); }
  .bc-title { font-size: 13.5px; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 140px; flex: 0 1 auto; }
  .bc-stage { font-size: 11.5px; color: var(--ink-3); font-weight: 600; flex: none; }
  .track { flex: 1; height: 6px; border-radius: 99px; background: var(--surface-2); overflow: hidden; }
  .fill { display: block; height: 100%; border-radius: 99px; }
  .bc-mins { font-size: 12.5px; font-weight: 600; color: var(--ink); flex: none; width: 64px; text-align: right; }
  .mono { font-family: var(--font-mono); }
</style>
