<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import Avatar from '$lib/Avatar.svelte';
  import { postAction } from '$lib/post';
  import { toast } from '$lib/stores';
  import type { PageData } from './$types';
  import type { List, Role, Workflow } from '$lib/server/types';

  let { data }: { data: PageData } = $props();

  const WF_W = 190;
  const WF_H = 78;
  const ROLE_COLORS = ['#4B3FE4', '#3FA66A', '#E0A33E', '#8A5BD6', '#E05A4F', '#0E8C7F', '#C2410C', '#3E78D9'];
  const VERBS = [
    { k: 'pick', label: 'Pick', hint: 'Take cards out of this stage' },
    { k: 'drop', label: 'Drop', hint: 'Move cards into this stage' },
    { k: 'work', label: 'Work', hint: 'Start timers & act on cards here' }
  ] as const;

  const routeId = $derived(`/b/${data.board.id}/workflow`);

  // Local editable draft — server is updated after each change.
  type Draft = { lists: List[]; roles: Record<string, Role>; roleAssignments: Record<string, string>; workflow: Workflow };
  let draft = $state<Draft>(
    structuredClone({
      lists: data.board.lists,
      roles: data.board.roles,
      roleAssignments: data.board.roleAssignments,
      workflow: data.board.workflow
    })
  );

  function save() {
    postAction(routeId, 'save', { payload: JSON.stringify(draft) });
  }

  let sel = $state<string | null>(null);
  let tab = $state<'stage' | 'roles'>('stage');
  let drag = $state<{ listId: string; offX: number; offY: number } | null>(null);
  let livePos = $state<{ listId: string; x: number; y: number } | null>(null);
  let link = $state<{ from: string; x: number; y: number } | null>(null);
  let hoverEdge = $state<number | null>(null);
  let canvasEl: HTMLDivElement;

  const roles = $derived(Object.values(draft.roles));
  const selList = $derived(sel ? draft.lists.find((l) => l.id === sel) : null);
  const selIdx = $derived(sel ? draft.lists.findIndex((l) => l.id === sel) : -1);
  const countFor = (lid: string) => data.cardCounts[lid] ?? 0;
  const getPos = (lid: string) =>
    livePos && livePos.listId === lid ? livePos : (draft.workflow.nodes[lid] ?? { x: 40, y: 40 });
  const snap = (v: number) => Math.max(0, Math.round(v / 10) * 10);
  function relPt(e: MouseEvent) {
    const r = canvasEl.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // --- mutations --------------------------------------------------------------
  function addEdge(from: string, to: string) {
    if (from === to || draft.workflow.edges.some((e) => e.from === from && e.to === to)) return;
    draft.workflow.edges.push({ from, to });
    save();
  }
  function removeEdge(i: number) {
    hoverEdge = null;
    draft.workflow.edges.splice(i, 1);
    save();
  }
  function setPerm(lid: string, rid: string, verb: 'pick' | 'drop' | 'work', val: boolean) {
    const lp = (draft.workflow.permissions[lid] ??= {});
    const rp = (lp[rid] ??= { pick: false, drop: false, work: false });
    rp[verb] = val;
    save();
  }
  function setTrack(lid: string, rid: string, val: boolean) {
    const cur = draft.workflow.tracking[rid] ?? [];
    draft.workflow.tracking[rid] = val ? [...cur, lid] : cur.filter((x) => x !== lid);
    save();
  }
  function renameStage(lid: string, name: string) {
    const l = draft.lists.find((x) => x.id === lid);
    if (l) l.name = name;
  }
  function moveStage(lid: string, dir: number) {
    const i = draft.lists.findIndex((l) => l.id === lid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= draft.lists.length) return;
    [draft.lists[i], draft.lists[j]] = [draft.lists[j], draft.lists[i]];
    save();
  }
  function addStage() {
    const id = 'l_' + crypto.randomUUID();
    const xs = Object.values(draft.workflow.nodes);
    const x = Math.min(1280, (xs.length ? Math.max(...xs.map((n) => n.x)) : -200) + 240);
    draft.lists.push({ id, name: 'New stage' });
    draft.workflow.nodes[id] = { x, y: 340 };
    draft.workflow.permissions[id] = {};
    sel = id;
    tab = 'stage';
    save();
  }
  function deleteStage(lid: string) {
    if (countFor(lid) > 0) {
      toast('Move the cards out of this stage before deleting it.', 'deny');
      return;
    }
    sel = null;
    draft.lists = draft.lists.filter((l) => l.id !== lid);
    delete draft.workflow.nodes[lid];
    delete draft.workflow.permissions[lid];
    for (const rid of Object.keys(draft.workflow.tracking)) {
      draft.workflow.tracking[rid] = draft.workflow.tracking[rid].filter((x) => x !== lid);
    }
    draft.workflow.edges = draft.workflow.edges.filter((e) => e.from !== lid && e.to !== lid);
    save();
  }
  function addRole() {
    const id = 'r_' + crypto.randomUUID();
    draft.roles[id] = { id, name: 'New role', color: ROLE_COLORS[Object.keys(draft.roles).length % ROLE_COLORS.length] };
    save();
  }
  function renameRole(rid: string, name: string) {
    draft.roles[rid].name = name;
  }
  function recolorRole(rid: string) {
    const i = ROLE_COLORS.indexOf(draft.roles[rid].color);
    draft.roles[rid].color = ROLE_COLORS[(i + 1) % ROLE_COLORS.length];
    save();
  }
  function deleteRole(rid: string) {
    delete draft.roles[rid];
    for (const uid of Object.keys(draft.roleAssignments)) {
      if (draft.roleAssignments[uid] === rid) delete draft.roleAssignments[uid];
    }
    for (const lid of Object.keys(draft.workflow.permissions)) delete draft.workflow.permissions[lid][rid];
    delete draft.workflow.tracking[rid];
    save();
  }
  function assignRole(uid: string, rid: string) {
    if (rid) draft.roleAssignments[uid] = rid;
    else delete draft.roleAssignments[uid];
    save();
  }

  // --- canvas interaction -----------------------------------------------------
  function onNodeDown(e: MouseEvent, lid: string) {
    e.preventDefault();
    sel = lid;
    tab = 'stage';
    const p = getPos(lid);
    const pt = relPt(e);
    drag = { listId: lid, offX: pt.x - p.x, offY: pt.y - p.y };
  }
  function onPortDown(e: MouseEvent, lid: string) {
    e.stopPropagation();
    e.preventDefault();
    const pt = relPt(e);
    link = { from: lid, x: pt.x, y: pt.y };
  }
  function onWinMove(e: MouseEvent) {
    if (drag) {
      const p = relPt(e);
      livePos = { listId: drag.listId, x: snap(p.x - drag.offX), y: snap(p.y - drag.offY) };
    }
    if (link) {
      const p = relPt(e);
      link = { ...link, x: p.x, y: p.y };
    }
  }
  function onWinUp() {
    if (drag && livePos) {
      draft.workflow.nodes[livePos.listId] = { x: livePos.x, y: livePos.y };
      save();
    }
    drag = null;
    livePos = null;
    link = null;
  }
  function onNodeUp(lid: string) {
    if (link && link.from !== lid) addEdge(link.from, lid);
  }

  function edgePath(from: string, to: string) {
    const a = getPos(from);
    const b = getPos(to);
    const x1 = a.x + WF_W;
    const y1 = a.y + WF_H / 2;
    const x2 = b.x;
    const y2 = b.y + WF_H / 2;
    const dh = Math.max(46, Math.abs(x2 - x1) / 2);
    return {
      d: `M ${x1} ${y1} C ${x1 + dh} ${y1}, ${x2 - dh} ${y2}, ${x2} ${y2}`,
      mx: (x1 + 3 * (x1 + dh) + 3 * (x2 - dh) + x2) / 8,
      my: (y1 + 3 * y1 + 3 * y2 + y2) / 8
    };
  }
</script>

<svelte:head><title>Workflow · {data.board.name}</title></svelte:head>
<svelte:window onmousemove={onWinMove} onmouseup={onWinUp} />

<div class="wf">
  <div class="wf-header">
    <a class="btn btn-ghost back" href="/b/{data.board.id}"><Icon name="chevLeft" size={16} /> Board</a>
    <span class="accent" style="background:{data.board.accent}"></span>
    <div class="htitle">
      <div class="ht-name">Workflow designer</div>
      <div class="ht-board">{data.board.name}</div>
    </div>
    <span class="admins"><Icon name="lock" size={12} /> Admins only</span>
    <div class="grow"></div>
    <span class="hint">Stages become board lists · drag the ◦ port to connect · edges document the flow</span>
    <button class="btn btn-primary" onclick={addStage}><Icon name="plus" size={16} /> Add stage</button>
  </div>

  <div class="wf-body">
    <div class="canvas-scroll">
      <div
        class="canvas"
        bind:this={canvasEl}
        role="presentation"
        onmousedown={(e) => {
          if (e.target === canvasEl) sel = null;
        }}>
        <svg width="1560" height="820" class="edges">
          <defs>
            <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="context-stroke" stroke-width="1.6" stroke-linecap="round" />
            </marker>
          </defs>
          {#each draft.workflow.edges as e, i (e.from + '>' + e.to)}
            {@const p = edgePath(e.from, e.to)}
            {@const hot = hoverEdge === i}
            <g
              role="presentation"
              onmouseenter={() => (hoverEdge = i)}
              onmouseleave={() => {
                if (hoverEdge === i) hoverEdge = null;
              }}>
              <path d={p.d} stroke="transparent" stroke-width="16" fill="none" class="edge-hit" />
              <path d={p.d} stroke={hot ? 'var(--brand)' : '#A9A496'} stroke-width={hot ? 2.2 : 1.7} fill="none" marker-end="url(#wf-arrow)" />
              {#if hot}
                <g class="edge-del" role="button" tabindex="-1" onclick={() => removeEdge(i)}>
                  <circle cx={p.mx} cy={p.my} r="9" fill="var(--ink-900)" />
                  <path d={`M ${p.mx - 3.2} ${p.my - 3.2} l 6.4 6.4 M ${p.mx + 3.2} ${p.my - 3.2} l -6.4 6.4`} stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
                </g>
              {/if}
            </g>
          {/each}
          {#if link}
            {@const a = getPos(link.from)}
            <path
              d={`M ${a.x + WF_W} ${a.y + WF_H / 2} C ${a.x + WF_W + 50} ${a.y + WF_H / 2}, ${link.x - 50} ${link.y}, ${link.x} ${link.y}`}
              stroke="var(--brand)"
              stroke-width="2"
              stroke-dasharray="5 4"
              fill="none" />
          {/if}
        </svg>

        {#each draft.lists as l (l.id)}
          {@const p = getPos(l.id)}
          {@const active = sel === l.id}
          {@const trackers = roles.filter((r) => (draft.workflow.tracking[r.id] ?? []).includes(l.id))}
          <div
            class="node"
            class:active
            style="left:{p.x}px;top:{p.y}px;width:{WF_W}px;height:{WF_H}px"
            role="presentation"
            onmousedown={(e) => onNodeDown(e, l.id)}
            onmouseup={() => onNodeUp(l.id)}>
            <div class="node-top">
              <span class="node-name">{l.name}</span>
              <span class="node-count mono">{countFor(l.id)}</span>
            </div>
            <div class="node-track">
              <Icon name="timer" size={12} color={trackers.length ? 'var(--ink-3)' : 'var(--line-2)'} />
              {#if trackers.length === 0}<span class="no-track">no tracking</span>{/if}
              {#each trackers as r (r.id)}
                <span class="trk"><span class="rdot" style="background:{r.color}"></span>{r.name}</span>
              {/each}
            </div>
            <span class="port in"></span>
            <span class="port out" role="presentation" title="Drag to connect" onmousedown={(e) => onPortDown(e, l.id)}></span>
          </div>
        {/each}
      </div>
    </div>

    <aside class="panel">
      <div class="tabs">
        <button class:on={tab === 'stage'} onclick={() => (tab = 'stage')}>Stage</button>
        <button class:on={tab === 'roles'} onclick={() => (tab = 'roles')}>Roles &amp; members</button>
      </div>

      {#if tab === 'stage'}
        {#if !selList}
          <div class="empty-panel">Select a stage on the canvas to set its name, role permissions, and time tracking.</div>
        {:else}
          <div class="panel-body">
            <div class="wf-label">Stage name</div>
            <input class="text" value={selList.name} oninput={(e) => renameStage(sel!, e.currentTarget.value)} onchange={save} />

            <div class="pos-row">
              <div class="wf-label nomargin">Column position</div>
              <button class="btn btn-outline mini" disabled={selIdx <= 0} onclick={() => moveStage(sel!, -1)}><Icon name="chevLeft" size={15} /></button>
              <span class="pos mono">{selIdx + 1}/{draft.lists.length}</span>
              <button class="btn btn-outline mini" disabled={selIdx >= draft.lists.length - 1} onclick={() => moveStage(sel!, 1)}><Icon name="chevRight" size={15} /></button>
            </div>

            <div class="wf-label spaced">Role permissions</div>
            <div class="perm-grid">
              <span></span>
              {#each VERBS as v (v.k)}<span class="verb" title={v.hint}>{v.label}</span>{/each}
              {#each roles as r (r.id)}
                {@const rp = draft.workflow.permissions[sel!]?.[r.id] ?? { pick: false, drop: false, work: false }}
                <span class="role-name"><span class="rdot" style="background:{r.color}"></span><span class="rn">{r.name}</span></span>
                {#each VERBS as v (v.k)}
                  <span class="checkcell">
                    <button class="wfcheck" class:on={rp[v.k]} onclick={() => setPerm(sel!, r.id, v.k, !rp[v.k])} title="{r.name} — {v.hint.toLowerCase()}">
                      {#if rp[v.k]}<Icon name="check" size={14} color="#fff" />{/if}
                    </button>
                  </span>
                {/each}
              {/each}
            </div>

            <div class="wf-label spaced">Time tracking in this stage</div>
            <div class="track-list">
              {#each roles as r (r.id)}
                {@const on = (draft.workflow.tracking[r.id] ?? []).includes(sel!)}
                <button class="track-row" class:on onclick={() => setTrack(sel!, r.id, !on)}>
                  <span class="rdot" style="background:{r.color}"></span>
                  <span class="tr-name">{r.name}</span>
                  <Icon name="timer" size={14} color={on ? 'var(--brand)' : 'var(--line-2)'} />
                  {#if on}<Icon name="check" size={14} color="var(--brand)" />{/if}
                </button>
              {/each}
            </div>

            <div class="note">Connections describe the intended flow — they don't restrict moves. Pick / Drop / Work permissions do.</div>
            <button class="del-stage" onclick={() => deleteStage(sel!)}>
              Delete stage{countFor(sel!) > 0 ? ` (${countFor(sel!)} cards inside)` : ''}
            </button>
          </div>
        {/if}
      {:else}
        <div class="panel-body">
          <div class="wf-label">Roles on this board</div>
          <div class="role-list">
            {#each roles as r (r.id)}
              <div class="role-edit">
                <button class="swatch" style="background:{r.color}" title="Change color" onclick={() => recolorRole(r.id)} aria-label="Change color"></button>
                <input class="role-input" value={r.name} oninput={(e) => renameRole(r.id, e.currentTarget.value)} onchange={save} />
                <button class="role-del" title="Delete role" onclick={() => deleteRole(r.id)}><Icon name="x" size={14} /></button>
              </div>
            {/each}
          </div>
          <button class="btn btn-outline add-role" onclick={addRole}><Icon name="plus" size={15} /> Add role</button>

          <div class="wf-label spaced">Member assignments</div>
          <div class="assign-list">
            {#each data.board.memberIds as uid (uid)}
              {@const u = data.users[uid]}
              <div class="assign-row">
                <Avatar user={u} size={28} />
                <span class="a-meta"><span class="a-name">{u.name}</span><span class="a-title">{u.title}</span></span>
                <select value={draft.roleAssignments[uid] ?? ''} onchange={(e) => assignRole(uid, e.currentTarget.value)}>
                  <option value="">No role</option>
                  {#each roles as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
                </select>
              </div>
            {/each}
          </div>
          <div class="note">Roles are scoped to this board. Members without a role can view it but can't move cards or track time.</div>
        </div>
      {/if}
    </aside>
  </div>
</div>

<style>
  .wf { position: relative; height: 100%; display: flex; flex-direction: column; }
  .wf-header { position: relative; z-index: 2; flex: none; padding: 14px 24px; display: flex; align-items: center; gap: 14px;
    border-bottom: 1px solid var(--line); background: var(--surface); }
  .back { height: 32px; padding: 0 9px; font-size: 13px; }
  .accent { width: 10px; height: 32px; border-radius: 4px; }
  .htitle { line-height: 1.15; }
  .ht-name { font-family: var(--font-display); font-size: 18px; font-weight: 600; color: var(--ink); }
  .ht-board { font-size: 12px; color: var(--ink-3); }
  .admins { display: flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 7px; background: var(--brand-tint);
    color: var(--brand-700); font-size: 11px; font-weight: 700; }
  .grow { flex: 1; }
  .hint { font-size: 12px; color: var(--ink-3); }

  .wf-body { position: relative; z-index: 1; flex: 1; display: flex; min-height: 0; }
  .canvas-scroll { flex: 1; overflow: auto; min-width: 0; }
  .canvas { position: relative; width: 1560px; height: 820px; background-image: radial-gradient(rgba(26, 24, 20, 0.13) 1px, transparent 1px); background-size: 24px 24px; }
  .edges { position: absolute; inset: 0; pointer-events: none; }
  .edge-hit { pointer-events: stroke; }
  .edge-del { pointer-events: all; cursor: pointer; }

  .node { position: absolute; background: var(--surface); border-radius: 12px; padding: 11px 13px 9px;
    border: 1px solid var(--line-2); box-shadow: var(--shadow-card); cursor: grab; user-select: none; }
  .node.active { border: 1.5px solid var(--brand); box-shadow: var(--shadow-pop); }
  .node-top { display: flex; align-items: center; gap: 8px; }
  .node-name { font-size: 13.5px; font-weight: 700; color: var(--ink); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .node-count { font-size: 11px; font-weight: 700; color: var(--ink-3); background: rgba(26, 24, 20, 0.05); padding: 0 6px; border-radius: 99px; }
  .mono { font-family: var(--font-mono); }
  .node-track { display: flex; align-items: center; gap: 5px; margin-top: 9px; }
  .no-track { font-size: 10.5px; color: var(--ink-3); }
  .trk { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--ink-2);
    background: rgba(26, 24, 20, 0.05); padding: 1px 6px; border-radius: 99px; }
  .rdot { width: 6px; height: 6px; border-radius: 99px; flex: none; }
  .port { position: absolute; border-radius: 99px; }
  .port.in { left: -5px; top: calc(50% - 5px); width: 10px; height: 10px; background: var(--canvas); border: 1.5px solid #a9a496; }
  .port.out { right: -7px; top: calc(50% - 7px); width: 14px; height: 14px; background: var(--brand); border: 2.5px solid var(--surface);
    box-shadow: var(--shadow-card); cursor: crosshair; }

  .panel { width: 318px; flex: none; border-left: 1px solid var(--line); background: var(--surface); overflow-y: auto; display: flex; flex-direction: column; }
  .tabs { display: flex; gap: 4px; padding: 12px 14px 0; }
  .tabs button { flex: 1; height: 32px; border-radius: 9px; font-size: 12.5px; font-weight: 700; background: var(--surface-2); color: var(--ink-2); }
  .tabs button.on { background: var(--ink-900); color: var(--ink-on-dark); }
  .empty-panel { padding: 40px 24px; text-align: center; color: var(--ink-3); font-size: 13px; line-height: 1.6; }
  .panel-body { padding: 16px 16px 24px; }
  .wf-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); margin: 0 0 9px; }
  .wf-label.spaced { margin-top: 20px; }
  .wf-label.nomargin { margin: 0; flex: 1; }
  .text, .role-input { width: 100%; height: 36px; padding: 0 11px; border-radius: 9px; border: 1px solid var(--line-2);
    font-size: 13.5px; font-weight: 600; color: var(--ink); outline: none; background: var(--canvas); }
  .text:focus { border-color: var(--brand); }
  .pos-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
  .mini { height: 28px; width: 30px; padding: 0; justify-content: center; }
  .pos { font-size: 12px; color: var(--ink-2); }
  .perm-grid { display: grid; grid-template-columns: 1fr repeat(3, 38px); align-items: center; row-gap: 4px; column-gap: 2px; }
  .verb { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); text-align: center; cursor: help; }
  .role-name { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--ink); min-width: 0; }
  .rn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .checkcell { display: flex; justify-content: center; }
  .wfcheck { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; transition: 0.12s;
    background: var(--surface); border: 1px solid var(--line-2); }
  .wfcheck.on { background: var(--brand); border-color: var(--brand); }
  .track-list { display: flex; flex-direction: column; gap: 6px; }
  .track-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 9px; text-align: left;
    background: var(--canvas); border: 1px solid var(--line); }
  .track-row.on { background: var(--brand-tint); border-color: var(--brand-100); }
  .tr-name { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
  .track-row.on .tr-name { color: var(--brand-700); }
  .note { margin-top: 18px; padding: 9px 11px; border-radius: 9px; background: var(--canvas); border: 1px dashed var(--line-2);
    font-size: 11.5px; color: var(--ink-3); line-height: 1.5; }
  .del-stage { height: 32px; margin-top: 14px; width: 100%; border-radius: var(--r-md); font-size: 12.5px; font-weight: 600;
    color: #b0392b; background: #fbe3df; }
  .role-list { display: flex; flex-direction: column; gap: 6px; }
  .role-edit { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 9px; border: 1px solid var(--line); background: var(--canvas); }
  .swatch { width: 18px; height: 18px; border-radius: 6px; flex: none; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12); }
  .role-input { height: 26px; border: none; background: transparent; padding: 0; font-size: 13px; }
  .role-del { width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; color: var(--ink-3); }
  .role-del:hover { background: #fbe3df; color: #b0392b; }
  .add-role { height: 32px; margin-top: 8px; width: 100%; justify-content: center; }
  .assign-list { display: flex; flex-direction: column; gap: 8px; }
  .assign-row { display: flex; align-items: center; gap: 9px; }
  .a-meta { flex: 1; min-width: 0; line-height: 1.15; }
  .a-name { display: block; font-size: 13px; font-weight: 600; color: var(--ink); }
  .a-title { display: block; font-size: 10.5px; color: var(--ink-3); }
  select { height: 30px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--surface); font-size: 12px;
    font-weight: 600; color: var(--ink); font-family: var(--font-ui); padding: 0 6px; outline: none; max-width: 124px; }
</style>
