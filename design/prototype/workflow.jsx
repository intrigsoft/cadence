/* Workflow designer — admin-only graphical pipeline editor.
   Stages ARE the board lists. Edges document the flow (not enforced).
   Per-stage role permissions (pick / drop / work) and per-role time-tracking
   eligibility are what the board actually enforces. */

const WF_W = 190, WF_H = 78;
const WF_ROLE_COLORS = ['#4B3FE4', '#3FA66A', '#E0A33E', '#8A5BD6', '#E05A4F', '#0E8C7F', '#C2410C', '#3E78D9'];
const WF_VERBS = [
  { k: 'pick', label: 'Pick', hint: 'Take cards out of this stage' },
  { k: 'drop', label: 'Drop', hint: 'Move cards into this stage' },
  { k: 'work', label: 'Work', hint: 'Start timers & act on cards here' },
];

function WorkflowDesigner({ board, data, cards, currentUser, onBack, onPatchBoard, onToast }) {
  const wf = board.workflow;
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('stage');
  const [drag, setDrag] = useState(null);       // { listId, offX, offY }
  const [livePos, setLivePos] = useState(null); // { listId, x, y }
  const [link, setLink] = useState(null);       // { from, x, y }
  const [hoverEdge, setHoverEdge] = useState(null);
  const innerRef = useRef(null);

  const roles = Object.values(board.roles || {});
  const countFor = (lid) => cards.filter((c) => c.listId === lid).length;
  const getPos = (lid) => (livePos && livePos.listId === lid) ? livePos : (wf.nodes[lid] || { x: 40, y: 40 });
  const snap = (v) => Math.max(0, Math.round(v / 10) * 10);
  const relPt = (e) => {
    const r = innerRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // ---- mutations --------------------------------------------------------------
  const patchWf = (fn) => onPatchBoard((b) => ({ ...b, workflow: fn(b.workflow, b) }));
  const addEdge = (from, to) => patchWf((w) =>
    w.edges.some((e) => e.from === from && e.to === to) ? w : { ...w, edges: [...w.edges, { from, to }] });
  const removeEdge = (i) => { setHoverEdge(null); patchWf((w) => ({ ...w, edges: w.edges.filter((_, j) => j !== i) })); };
  const setPerm = (lid, rid, verb, val) => patchWf((w) => {
    const lp = w.permissions[lid] || {};
    const rp = lp[rid] || { pick: false, drop: false, work: false };
    return { ...w, permissions: { ...w.permissions, [lid]: { ...lp, [rid]: { ...rp, [verb]: val } } } };
  });
  const setTrack = (lid, rid, val) => patchWf((w) => {
    const cur = w.tracking[rid] || [];
    return { ...w, tracking: { ...w.tracking, [rid]: val ? [...cur, lid] : cur.filter((x) => x !== lid) } };
  });
  const renameStage = (lid, name) => onPatchBoard((b) => ({
    ...b, lists: b.lists.map((l) => l.id === lid ? { ...l, name } : l) }));
  const moveStage = (lid, dir) => onPatchBoard((b) => {
    const i = b.lists.findIndex((l) => l.id === lid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= b.lists.length) return b;
    const lists = [...b.lists];
    [lists[i], lists[j]] = [lists[j], lists[i]];
    return { ...b, lists };
  });
  const addStage = () => {
    const id = board.id + '_l_' + Math.random().toString(36).slice(2, 6);
    onPatchBoard((b) => {
      const xs = Object.values(b.workflow.nodes);
      const x = Math.min(1280, (xs.length ? Math.max(...xs.map((n) => n.x)) : -200) + 240);
      return { ...b, lists: [...b.lists, { id, name: 'New stage' }],
        workflow: { ...b.workflow, nodes: { ...b.workflow.nodes, [id]: { x, y: 340 } } } };
    });
    setSel(id); setTab('stage');
  };
  const deleteStage = (lid) => {
    if (countFor(lid) > 0) { onToast('Move the cards out of this stage before deleting it.', 'deny'); return; }
    setSel(null);
    onPatchBoard((b) => {
      const nodes = { ...b.workflow.nodes }; delete nodes[lid];
      const permissions = { ...b.workflow.permissions }; delete permissions[lid];
      const tracking = {};
      Object.keys(b.workflow.tracking).forEach((rid) => { tracking[rid] = b.workflow.tracking[rid].filter((x) => x !== lid); });
      return { ...b, lists: b.lists.filter((l) => l.id !== lid),
        workflow: { nodes, permissions, tracking, edges: b.workflow.edges.filter((e) => e.from !== lid && e.to !== lid) } };
    });
  };
  const addRole = () => {
    const id = 'r_' + Math.random().toString(36).slice(2, 7);
    onPatchBoard((b) => ({ ...b, roles: { ...b.roles,
      [id]: { id, name: 'New role', color: WF_ROLE_COLORS[Object.keys(b.roles).length % WF_ROLE_COLORS.length] } } }));
  };
  const renameRole = (rid, name) => onPatchBoard((b) => ({
    ...b, roles: { ...b.roles, [rid]: { ...b.roles[rid], name } } }));
  const recolorRole = (rid) => onPatchBoard((b) => {
    const i = WF_ROLE_COLORS.indexOf(b.roles[rid].color);
    return { ...b, roles: { ...b.roles, [rid]: { ...b.roles[rid], color: WF_ROLE_COLORS[(i + 1) % WF_ROLE_COLORS.length] } } };
  });
  const deleteRole = (rid) => onPatchBoard((b) => {
    const roles2 = { ...b.roles }; delete roles2[rid];
    const ra = {}; Object.keys(b.roleAssignments).forEach((uid) => { if (b.roleAssignments[uid] !== rid) ra[uid] = b.roleAssignments[uid]; });
    const permissions = {};
    Object.keys(b.workflow.permissions).forEach((lid) => {
      const lp = { ...b.workflow.permissions[lid] }; delete lp[rid]; permissions[lid] = lp;
    });
    const tracking = { ...b.workflow.tracking }; delete tracking[rid];
    return { ...b, roles: roles2, roleAssignments: ra, workflow: { ...b.workflow, permissions, tracking } };
  });
  const assignRole = (uid, rid) => onPatchBoard((b) => {
    const ra = { ...b.roleAssignments };
    if (rid) ra[uid] = rid; else delete ra[uid];
    return { ...b, roleAssignments: ra };
  });

  // ---- canvas mouse -------------------------------------------------------------
  const onCanvasMove = (e) => {
    if (drag) { const p = relPt(e); setLivePos({ listId: drag.listId, x: snap(p.x - drag.offX), y: snap(p.y - drag.offY) }); }
    if (link) { const p = relPt(e); setLink((l) => ({ ...l, x: p.x, y: p.y })); }
  };
  const onCanvasUp = () => {
    if (drag && livePos) {
      const { listId, x, y } = livePos;
      patchWf((w) => ({ ...w, nodes: { ...w.nodes, [listId]: { x, y } } }));
    }
    setDrag(null); setLivePos(null); setLink(null);
  };

  // ---- edge path geometry ---------------------------------------------------
  const edgePath = (from, to) => {
    const a = getPos(from), b = getPos(to);
    const x1 = a.x + WF_W, y1 = a.y + WF_H / 2, x2 = b.x, y2 = b.y + WF_H / 2;
    const dh = Math.max(46, Math.abs(x2 - x1) / 2);
    return { d: `M ${x1} ${y1} C ${x1 + dh} ${y1}, ${x2 - dh} ${y2}, ${x2} ${y2}`,
      mx: (x1 + 3 * (x1 + dh) + 3 * (x2 - dh) + x2) / 8, my: (y1 + 3 * y1 + 3 * y2 + y2) / 8 };
  };

  const selList = sel && board.lists.find((l) => l.id === sel);
  const selIdx = sel ? board.lists.findIndex((l) => l.id === sel) : -1;

  return (
    <div className="grain" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ position: 'relative', zIndex: 2, flex: 'none', padding: '14px 24px', display: 'flex',
        alignItems: 'center', gap: 14, borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ height: 32, padding: '0 9px', fontSize: 13 }}>
          <Icons.chevLeft size={16} /> Board
        </button>
        <span style={{ width: 10, height: 32, borderRadius: 4, background: board.accent }} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Workflow designer</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{board.name}</div>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7,
          background: 'var(--brand-tint)', color: 'var(--brand-700)', fontSize: 11, fontWeight: 700 }}>
          <Icons.lock size={12} /> Admins only
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          Stages become board lists · drag the <b>◦</b> port to connect · edges document the flow
        </span>
        <button className="btn btn-primary" style={{ height: 34 }} onClick={addStage}><Icons.plus size={16} /> Add stage</button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', minHeight: 0 }}>
        {/* canvas */}
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <div ref={innerRef} onMouseMove={onCanvasMove} onMouseUp={onCanvasUp}
            onMouseDown={(e) => { if (e.target === innerRef.current) setSel(null); }}
            style={{ position: 'relative', width: 1560, height: 820, cursor: drag ? 'grabbing' : 'default',
              backgroundImage: 'radial-gradient(rgba(26,24,20,.13) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>

            {/* edges */}
            <svg width="1560" height="820" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <defs>
                <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="context-stroke" strokeWidth="1.6" strokeLinecap="round" />
                </marker>
              </defs>
              {wf.edges.map((e, i) => {
                const { d, mx, my } = edgePath(e.from, e.to);
                const hot = hoverEdge === i;
                return (
                  <g key={i} onMouseEnter={() => setHoverEdge(i)} onMouseLeave={() => setHoverEdge((h) => h === i ? null : h)}>
                    <path d={d} stroke="transparent" strokeWidth="16" fill="none" style={{ pointerEvents: 'stroke' }} />
                    <path d={d} stroke={hot ? 'var(--brand)' : '#A9A496'} strokeWidth={hot ? 2.2 : 1.7} fill="none"
                      markerEnd="url(#wf-arrow)" />
                    {hot && (
                      <g onClick={() => removeEdge(i)} style={{ pointerEvents: 'all', cursor: 'pointer' }}>
                        <circle cx={mx} cy={my} r="9" fill="var(--ink-900)" />
                        <path d={`M ${mx - 3.2} ${my - 3.2} l 6.4 6.4 M ${mx + 3.2} ${my - 3.2} l -6.4 6.4`}
                          stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                      </g>
                    )}
                  </g>
                );
              })}
              {link && (() => {
                const a = getPos(link.from);
                const x1 = a.x + WF_W, y1 = a.y + WF_H / 2;
                return <path d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${link.x - 50} ${link.y}, ${link.x} ${link.y}`}
                  stroke="var(--brand)" strokeWidth="2" strokeDasharray="5 4" fill="none" />;
              })()}
            </svg>

            {/* nodes */}
            {board.lists.map((l) => {
              const p = getPos(l.id);
              const active = sel === l.id;
              const trackers = roles.filter((r) => (wf.tracking[r.id] || []).includes(l.id));
              return (
                <div key={l.id}
                  onMouseDown={(e) => { e.preventDefault(); setSel(l.id); setTab('stage');
                    const pt = relPt(e); setDrag({ listId: l.id, offX: pt.x - p.x, offY: pt.y - p.y }); }}
                  onMouseUp={() => { if (link && link.from !== l.id) addEdge(link.from, l.id); }}
                  style={{ position: 'absolute', left: p.x, top: p.y, width: WF_W, height: WF_H,
                    background: 'var(--surface)', borderRadius: 12, padding: '11px 13px 9px',
                    border: active ? '1.5px solid var(--brand)' : '1px solid var(--line-2)',
                    boxShadow: active ? 'var(--shadow-pop)' : 'var(--shadow-card)',
                    cursor: drag ? 'grabbing' : 'grab', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', flex: 1, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
                      background: 'rgba(26,24,20,.05)', padding: '0 6px', borderRadius: 99 }}>{countFor(l.id)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 9 }}>
                    <Icons.timer size={12} style={{ color: trackers.length ? 'var(--ink-3)' : 'var(--line-2)' }} />
                    {trackers.length === 0 && <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>no tracking</span>}
                    {trackers.map((r) => (
                      <span key={r.id} title={`${r.name} tracks time here`} style={{ display: 'flex', alignItems: 'center',
                        gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--ink-2)', background: 'rgba(26,24,20,.05)',
                        padding: '1px 6px', borderRadius: 99 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: r.color }} />{r.name}
                      </span>
                    ))}
                  </div>
                  {/* in port */}
                  <span style={{ position: 'absolute', left: -5, top: WF_H / 2 - 5, width: 10, height: 10,
                    borderRadius: 99, background: 'var(--canvas)', border: '1.5px solid #A9A496' }} />
                  {/* out port */}
                  <span title="Drag to connect"
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault();
                      const pt = relPt(e); setLink({ from: l.id, x: pt.x, y: pt.y }); }}
                    style={{ position: 'absolute', right: -7, top: WF_H / 2 - 7, width: 14, height: 14,
                      borderRadius: 99, background: 'var(--brand)', border: '2.5px solid var(--surface)',
                      boxShadow: 'var(--shadow-card)', cursor: 'crosshair' }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* side panel */}
        <aside style={{ width: 318, flex: 'none', borderLeft: '1px solid var(--line)', background: 'var(--surface)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 4, padding: '12px 14px 0' }}>
            {[['stage', 'Stage'], ['roles', 'Roles & members']].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{ flex: 1, height: 32, borderRadius: 9,
                fontSize: 12.5, fontWeight: 700,
                background: tab === k ? 'var(--ink-900)' : 'var(--surface-2)',
                color: tab === k ? 'var(--ink-on-dark)' : 'var(--ink-2)' }}>{label}</button>
            ))}
          </div>

          {tab === 'stage' && !selList && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
              Select a stage on the canvas to set its name, role permissions, and time tracking.
            </div>
          )}

          {tab === 'stage' && selList && (
            <div style={{ padding: '16px 16px 24px' }}>
              <WfLabel>Stage name</WfLabel>
              <input value={selList.name} onChange={(e) => renameStage(sel, e.target.value)}
                style={{ width: '100%', height: 36, padding: '0 11px', borderRadius: 9, border: '1px solid var(--line-2)',
                  fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', outline: 'none', background: 'var(--canvas)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line-2)'} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <WfLabel style={{ margin: 0, flex: 1 }}>Column position</WfLabel>
                <button className="btn btn-outline" style={{ height: 28, width: 30, padding: 0, justifyContent: 'center' }}
                  disabled={selIdx <= 0} onClick={() => moveStage(sel, -1)}
                  title="Move left on the board"><Icons.chevLeft size={15} /></button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                  {selIdx + 1}/{board.lists.length}
                </span>
                <button className="btn btn-outline" style={{ height: 28, width: 30, padding: 0, justifyContent: 'center' }}
                  disabled={selIdx >= board.lists.length - 1} onClick={() => moveStage(sel, 1)}
                  title="Move right on the board"><Icons.chevRight size={15} /></button>
              </div>

              <WfLabel style={{ marginTop: 20 }}>Role permissions</WfLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 38px)', alignItems: 'center',
                rowGap: 4, columnGap: 2 }}>
                <span />
                {WF_VERBS.map((v) => (
                  <span key={v.k} title={v.hint} style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.05em',
                    textTransform: 'uppercase', color: 'var(--ink-3)', textAlign: 'center', cursor: 'help' }}>{v.label}</span>
                ))}
                {roles.map((r) => {
                  const rp = (wf.permissions[sel] || {})[r.id] || {};
                  return (
                    <React.Fragment key={r.id}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600,
                        color: 'var(--ink)', minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: r.color, flex: 'none' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      </span>
                      {WF_VERBS.map((v) => (
                        <span key={v.k} style={{ display: 'flex', justifyContent: 'center' }}>
                          <WfCheck on={!!rp[v.k]} onClick={() => setPerm(sel, r.id, v.k, !rp[v.k])}
                            title={`${r.name} — ${v.hint.toLowerCase()}`} />
                        </span>
                      ))}
                    </React.Fragment>
                  );
                })}
              </div>

              <WfLabel style={{ marginTop: 20 }}>Time tracking in this stage</WfLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {roles.map((r) => {
                  const on = (wf.tracking[r.id] || []).includes(sel);
                  return (
                    <button key={r.id} onClick={() => setTrack(sel, r.id, !on)} style={{ display: 'flex',
                      alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, textAlign: 'left',
                      background: on ? 'var(--brand-tint)' : 'var(--canvas)',
                      border: '1px solid ' + (on ? 'var(--brand-100)' : 'var(--line)') }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: r.color, flex: 'none' }} />
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600,
                        color: on ? 'var(--brand-700)' : 'var(--ink-2)' }}>{r.name}</span>
                      <Icons.timer size={14} style={{ color: on ? 'var(--brand)' : 'var(--line-2)' }} />
                      {on && <Icons.check size={14} style={{ color: 'var(--brand)' }} />}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 18, padding: '9px 11px', borderRadius: 9, background: 'var(--canvas)',
                border: '1px dashed var(--line-2)', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                Connections describe the intended flow for the team — they don't restrict moves.
                Pick / Drop / Work permissions do.
              </div>

              <button onClick={() => deleteStage(sel)} className="btn" style={{ height: 32, marginTop: 14, width: '100%',
                justifyContent: 'center', fontSize: 12.5, color: '#B0392B', background: '#FBE3DF' }}>
                Delete stage{countFor(sel) > 0 ? ` (${countFor(sel)} cards inside)` : ''}
              </button>
            </div>
          )}

          {tab === 'roles' && (
            <div style={{ padding: '16px 16px 24px' }}>
              <WfLabel>Roles on this board</WfLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {roles.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    borderRadius: 9, border: '1px solid var(--line)', background: 'var(--canvas)' }}>
                    <button onClick={() => recolorRole(r.id)} title="Change color" style={{ width: 18, height: 18,
                      borderRadius: 6, background: r.color, flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)' }} />
                    <input value={r.name} onChange={(e) => renameRole(r.id, e.target.value)}
                      style={{ flex: 1, minWidth: 0, height: 26, border: 'none', outline: 'none', background: 'transparent',
                        fontSize: 13, fontWeight: 600, color: 'var(--ink)' }} />
                    <button onClick={() => deleteRole(r.id)} title="Delete role" style={{ width: 24, height: 24,
                      borderRadius: 6, display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FBE3DF'; e.currentTarget.style.color = '#B0392B'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
                      <Icons.x size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn btn-outline" style={{ height: 32, marginTop: 8, width: '100%', justifyContent: 'center' }}
                onClick={addRole}><Icons.plus size={15} /> Add role</button>

              <WfLabel style={{ marginTop: 22 }}>Member assignments</WfLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {board.memberIds.map((uid) => {
                  const u = data.users[uid];
                  const rid = board.roleAssignments[uid] || '';
                  return (
                    <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar user={u} size={28} />
                      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{u.name}</span>
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-3)' }}>{u.title}</span>
                      </span>
                      <select value={rid} onChange={(e) => assignRole(uid, e.target.value || null)}
                        style={{ height: 30, borderRadius: 8, border: '1px solid var(--line-2)', background: 'var(--surface)',
                          fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-ui)', padding: '0 6px',
                          outline: 'none', maxWidth: 124 }}>
                        <option value="">No role</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 18, padding: '9px 11px', borderRadius: 9, background: 'var(--canvas)',
                border: '1px dashed var(--line-2)', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                Roles are scoped to this board. Members without a role can view the board but can't move cards or track time.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function WfLabel({ children, style }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
    color: 'var(--ink-3)', margin: '0 0 9px', ...style }}>{children}</div>;
}

function WfCheck({ on, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 24, height: 24, borderRadius: 7,
      display: 'grid', placeItems: 'center', transition: '.12s',
      background: on ? 'var(--brand)' : 'var(--surface)',
      border: on ? '1px solid var(--brand)' : '1px solid var(--line-2)', color: '#fff' }}>
      {on && <Icons.check size={14} />}
    </button>
  );
}

Object.assign(window, { WorkflowDesigner });
