/* Kanban board view: lists, card tiles, drag-and-drop, inline card composer.
   Workflow-aware: stage×role permission gating on drags, focus mode (collapses
   stages irrelevant to your role into rails), time chips, and the report mode. */

function BoardView({ board, data, currentUser, cards, query, onOpenCard, onMoveCard, onAddCard, onAddList,
  onToast, focusMode, onSetFocusMode, boardMode, onSetBoardMode, onOpenWorkflow, runningTimer,
  onStartTimer, onStopTimer, timeChips, enforcement, focusZone, focusZoneColor, workTint }) {
  const [drag, setDrag] = useState(null);        // { cardId, fromListId }
  const [drop, setDrop] = useState(null);        // { listId, index }
  const [expanded, setExpanded] = useState({});  // listId -> true (focus-mode override)
  const members = board.memberIds.map((id) => data.users[id]);
  const myRole = wfRole(board, currentUser.id);
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => { setExpanded({}); }, [board.id, focusMode, currentUser.id]);

  const cardsFor = (listId) => cards
    .filter((c) => c.listId === listId)
    .sort((a, b) => a.pos - b.pos);

  const q = query.trim().toLowerCase();
  const matches = (c) => !q || c.title.toLowerCase().includes(q) ||
    (c.desc || '').toLowerCase().includes(q) || c.labels.some((l) => data.labels[l].name.toLowerCase().includes(q));

  const relevant = (lid) => wfListRelevant(board, currentUser, lid);
  const canPick = (lid) => wfCan(board, currentUser, lid, 'pick');
  const canDropTo = (lid) => !drag || lid === drag.fromListId || wfCan(board, currentUser, lid, 'drop');

  const endDrag = () => { setDrag(null); setDrop(null); };
  const commitDrop = () => {
    if (drag && drop) onMoveCard(drag.cardId, drop.listId, drop.index);
    endDrag();
  };

  const relevantCount = board.lists.filter((l) => relevant(l.id)).length;
  const focusUseful = relevantCount < board.lists.length;
  const zoneOn = !!(focusZone && focusUseful && myRole && relevantCount > 0);

  // contiguous runs of focus / non-focus stages, for the full-board highlight container
  const listGroups = [];
  board.lists.forEach((l) => {
    const f = relevant(l.id);
    const last = listGroups[listGroups.length - 1];
    if (last && last.focus === f) last.lists.push(l);
    else listGroups.push({ focus: f, lists: [l] });
  });

  const renderList = (list) => {
    const rel = relevant(list.id);
    const isRail = focusMode && !rel && !expanded[list.id];
    const listCards = cardsFor(list.id).filter(matches);
    const isDropList = drop && drop.listId === list.id;
    const allowed = canDropTo(list.id) || enforcement === 'Warn';
    const dimmed = drag && !allowed;
    const canTrackList = wfCanTrack(board, currentUser, list.id);
    const working = !!(workTint && focusUseful &&
      (wfCan(board, currentUser, list.id, 'work') || canTrackList));
            return (
              <AnimList key={list.id} collapsed={isRail}
                rail={<RailList list={list} count={cardsFor(list.id).length}
                  onExpand={() => setExpanded((m) => ({ ...m, [list.id]: true }))} />}>
              <List list={list} count={cardsFor(list.id).length}
                isDropTarget={isDropList} accent={board.accent} dimmed={dimmed}
                inert={!rel} working={working} canTrackList={working && canTrackList}
                collapsible={focusMode && !rel}
                onCollapse={() => setExpanded((m) => { const n = { ...m }; delete n[list.id]; return n; })}
                onAddCard={(title) => onAddCard(list.id, title)}
                onListDragOver={(e) => {
                  e.preventDefault();
                  if (!drag || !allowed) return;
                  if (listCards.length === 0) setDrop({ listId: list.id, index: 0 });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag && !allowed) {
                    onToast(`<b>${myRole ? myRole.name : 'Your role'}</b> can't move cards into <b>${list.name}</b>.`, 'deny');
                    endDrag();
                    return;
                  }
                  commitDrop();
                }}>
                {listCards.map((c, idx) => (
                  <React.Fragment key={c.id}>
                    {isDropList && drop.index === idx && <DropSlot />}
                    <CardTile card={c} data={data} dragging={drag && drag.cardId === c.id}
                      timeChips={timeChips}
                      canTrackHere={wfCanTrack(board, currentUser, list.id)}
                      onStartTimer={onStartTimer} onStopTimer={onStopTimer}
                      runningHere={runningTimer && runningTimer.cardId === c.id ? runningTimer : null}
                      onOpen={() => onOpenCard(c.id)}
                      onDragStart={(e) => {
                        if (!canPick(list.id)) {
                          e.preventDefault();
                          onToast(`<b>${myRole ? myRole.name : 'Your role'}</b> can't pick cards up from <b>${list.name}</b>.`, 'deny');
                          return;
                        }
                        setDrag({ cardId: c.id, fromListId: list.id });
                        e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', c.id); } catch (_) {}
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!drag || !allowed) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        const after = e.clientY > r.top + r.height / 2;
                        setDrop({ listId: list.id, index: idx + (after ? 1 : 0) });
                      }} />
                  </React.Fragment>
                ))}
                {isDropList && drop.index >= listCards.length && <DropSlot />}
              </List>
              </AnimList>
            );
  };

  return (
    <div className="grain" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* board header */}
      <div style={{ position: 'relative', zIndex: 1, flex: 'none', padding: '18px 28px 16px',
        display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--line)' }}>
        <div style={{ width: 12, height: 40, borderRadius: 5, background: board.accent, flex: 'none',
          boxShadow: `0 4px 14px -2px ${board.accent}66` }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em',
              margin: 0, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.name}</h1>
            {board.visibility === 'private' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7,
                background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 11, fontWeight: 700, flex: 'none' }}>
                <Icons.lock size={12} /> Private
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis' }}>{board.subtitle}</div>
        </div>
        <div style={{ flex: 1 }} />

        {myRole && (
          <span title="Your role on this board" style={{ display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 11px', borderRadius: 99, background: 'var(--surface)', border: '1px solid var(--line-2)',
            fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', flex: 'none' }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: myRole.color }} />{myRole.name}
          </span>
        )}

        <FocusSeg value={focusMode} onChange={onSetFocusMode} useful={focusUseful} />

        <button onClick={() => onSetBoardMode(boardMode === 'report' ? 'lists' : 'report')}
          className={boardMode === 'report' ? 'btn btn-primary' : 'btn btn-outline'}
          style={{ height: 34, flex: 'none' }} title="Board time report">
          <Icons.chart size={16} /> Report
        </button>

        {isAdmin && (
          <button className="btn btn-outline" style={{ height: 34, flex: 'none' }} onClick={onOpenWorkflow}
            title="Open the workflow designer (admins only)">
            <Icons.flow size={16} /> Workflow
          </button>
        )}

        <AvatarStack users={members} size={30} max={5} />
      </div>

      {boardMode === 'report' ? (
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0 }}>
          <TimeReport board={board} cards={cards} data={data} />
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowX: 'auto', overflowY: 'hidden',
          display: 'flex', gap: 14, padding: '18px 28px 22px', alignItems: 'flex-start' }}
          onDragEnd={endDrag}>
          {zoneOn
            ? listGroups.map((g, i) => g.focus ? (
                <div key={'zone' + i} title={`Stages where ${myRole.name} works on this board`}
                  style={{ flex: 'none', alignSelf: 'stretch', margin: '-10px 0',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: focusMode ? '10px 0' : '10px 12px',
                  borderRadius: 18,
                  background: focusMode ? 'rgba(255,255,255,0)' : (focusZoneColor || 'rgba(255,255,255,.72)'),
                  transition: 'background .4s ease, padding .34s cubic-bezier(.32,.72,.28,1)' }}>
                  {g.lists.map(renderList)}
                </div>
              ) : g.lists.map(renderList))
            : board.lists.map(renderList)}
          {/* add list affordance */}
          <AddListComposer onAdd={onAddList} />
        </div>
      )}
    </div>
  );
}

// segmented Focus / Full board control — sliding-thumb animation
function FocusSeg({ value, onChange, useful }) {
  const opts = [
    { v: true, label: 'My focus', icon: <Icons.target size={14} /> },
    { v: false, label: 'Full board', icon: <Icons.columns size={14} /> },
  ];
  return (
    <div title={useful ? 'Focus on the stages your role works in' : 'Every stage is relevant to your role'}
      style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: 3,
        borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--paper-edge)', flex: 'none' }}>
      <span aria-hidden="true" style={{ position: 'absolute', top: 3, bottom: 3, left: 3, width: 'calc(50% - 4px)',
        borderRadius: 8, background: 'var(--surface)', boxShadow: 'var(--shadow-card)',
        transform: value ? 'translateX(0)' : 'translateX(calc(100% + 2px))',
        transition: 'transform .28s cubic-bezier(.32,.72,.28,1)' }} />
      {opts.map((o) => (
        <button key={o.label} onClick={() => onChange(o.v)} style={{ position: 'relative', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 6, height: 27, padding: '0 11px', borderRadius: 8,
          fontSize: 12, fontWeight: 700, background: 'transparent', transition: 'color .22s ease',
          color: value === o.v ? 'var(--ink)' : 'var(--ink-3)' }}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

// animated shell: morphs width between full list (272) and rail (44), crossfading contents
function AnimList({ collapsed, rail, children }) {
  return (
    <div style={{ flex: 'none', alignSelf: 'stretch', position: 'relative', overflow: 'hidden',
      width: collapsed ? 44 : 272, borderRadius: 14,
      transition: 'width .34s cubic-bezier(.32,.72,.28,1)' }}>
      <div style={{ width: 272, height: '100%', display: 'flex', alignItems: 'flex-start',
        opacity: collapsed ? 0 : 1, transition: 'opacity .22s ease',
        pointerEvents: collapsed ? 'none' : 'auto' }}>
        {children}
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: collapsed ? 1 : 0,
        transition: 'opacity .22s ease', pointerEvents: collapsed ? 'auto' : 'none' }}>
        {rail}
      </div>
    </div>
  );
}

// collapsed rail for stages outside the user's focus
function RailList({ list, count, onExpand }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onExpand} title={`${list.name} — outside your focus. Click to expand.`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ width: '100%', height: '100%', minHeight: 240, borderRadius: 14,
        border: '1px dashed ' + (hover ? 'var(--ink-3)' : 'var(--line-2)'),
        background: hover ? 'rgba(26,24,20,.05)' : 'rgba(26,24,20,.025)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12, padding: '14px 0', transition: '.13s' }}>
      <Icons.chevRight size={15} style={{ color: 'var(--ink-3)', flex: 'none' }} />
      <span style={{ writingMode: 'vertical-rl', fontSize: 12, fontWeight: 700, letterSpacing: '.05em',
        color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{list.name}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
        background: 'rgba(26,24,20,.06)', padding: '1px 7px', borderRadius: 99, flex: 'none' }}>{count}</span>
    </button>
  );
}

function DropSlot() {
  return <div style={{ height: 4, margin: '2px 4px 6px', borderRadius: 99, background: 'var(--brand)',
    boxShadow: '0 0 0 3px var(--brand-100)' }} />;
}

function List({ list, count, children, isDropTarget, accent, dimmed, inert, working, canTrackList,
  collapsible, onCollapse, onAddCard, onListDragOver, onDrop }) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const taRef = useRef(null);
  useEffect(() => { if (adding && taRef.current) taRef.current.focus(); }, [adding]);
  const submit = () => { const t = val.trim(); if (t) { onAddCard(t); setVal(''); } };

  return (
    <div onDragOver={onListDragOver} onDrop={onDrop}
      style={{ flex: 'none', width: 272, maxHeight: '100%', display: 'flex', flexDirection: 'column',
        background: working ? 'var(--brand-tint)' : 'var(--surface-2)', borderRadius: 14,
        border: '1px solid ' + (working ? 'var(--brand-100)' : 'var(--paper-edge)'),
        boxShadow: isDropTarget ? `inset 0 0 0 2px ${accent}` : 'none',
        opacity: dimmed ? 0.45 : 1, transition: 'box-shadow .12s, opacity .15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px 9px', flex: 'none' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '.01em' }}>{list.name}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
          background: 'rgba(26,24,20,.05)', padding: '1px 7px', borderRadius: 99 }}>{count}</span>
        {canTrackList && (
          <Icons.timer size={13} style={{ color: 'var(--brand)' }} title="Your role tracks time in this stage" />
        )}
        {inert && !collapsible && (
          <Icons.lock size={12} style={{ color: 'var(--ink-3)' }} title="No actions for your role in this stage" />
        )}
        <div style={{ flex: 1 }} />
        {collapsible ? (
          <button className="btn btn-ghost" onClick={onCollapse} title="Collapse back to rail"
            style={{ width: 26, height: 26, padding: 0, justifyContent: 'center', borderRadius: 7 }}>
            <Icons.chevLeft size={15} />
          </button>
        ) : (
          <button className="btn btn-ghost" style={{ width: 26, height: 26, padding: 0, justifyContent: 'center', borderRadius: 7 }}>
            <Icons.dots size={16} />
          </button>
        )}
      </div>
      <div style={{ overflowY: 'auto', padding: '0 8px', flex: 1, minHeight: 8 }}>
        {children}
        {adding && (
          <div style={{ marginBottom: 8 }}>
            <textarea ref={taRef} value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                if (e.key === 'Escape') { setAdding(false); setVal(''); } }}
              placeholder="What needs doing?" rows={2}
              style={{ width: '100%', resize: 'none', borderRadius: 10, border: '1px solid var(--brand)',
                padding: '10px 11px', fontSize: 13.5, color: 'var(--ink)', outline: 'none', boxShadow: 'var(--shadow-card)',
                background: 'var(--surface)' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
              <button className="btn btn-primary" style={{ height: 32 }} onClick={submit}>Add card</button>
              <button className="btn btn-ghost" style={{ height: 32, width: 32, padding: 0, justifyContent: 'center' }}
                onClick={() => { setAdding(false); setVal(''); }}><Icons.x size={17} /></button>
            </div>
          </div>
        )}
      </div>
      {!adding && (
        <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 13px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, borderTop: '1px solid transparent',
          borderRadius: '0 0 14px 14px', flex: 'none' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,24,20,.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Icons.plus size={16} /> Add a card
        </button>
      )}
    </div>
  );
}

function CardTile({ card, data, onOpen, onDragStart, onDragOver, dragging, timeChips, runningHere,
  canTrackHere, onStartTimer, onStopTimer }) {
  const [hover, setHover] = useState(false);
  const now = useNowTick(!!runningHere);
  const labels = card.labels.map((l) => data.labels[l]);
  const members = card.members.map((m) => data.users[m]);
  const due = dueMeta(card.due);
  const done = card.checklist.filter((k) => k.done).length;
  const hasAgent = card.activity.some((a) => a.kind === 'agent');
  const tracked = cardTrackedMins(card);
  const liveTotal = tracked + (runningHere ? liveMins(runningHere, now) : 0);
  const showTime = timeChips && (tracked > 0 || runningHere || canTrackHere);
  const timeVisible = tracked > 0 || runningHere || hover;

  return (
    <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onClick={onOpen}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--surface)', borderRadius: 11, border: '1px solid var(--line)', padding: '11px 12px 10px',
        marginBottom: 8, cursor: 'pointer', boxShadow: hover ? 'var(--shadow-pop)' : 'var(--shadow-card)',
        opacity: dragging ? 0.4 : 1, transform: hover && !dragging ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow .14s, transform .14s', position: 'relative' }}>
      {labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {labels.map((l) => (
            <span key={l.id} className="chip" style={{ background: l.color + '1F', color: shade2(l.color) }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: l.color }} />{l.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.35, textWrap: 'pretty' }}>
        {card.title}
      </div>

      {(due || card.checklist.length > 0 || card.comments.length > 0 || hasAgent || members.length > 0 || showTime) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 11, flexWrap: 'wrap' }}>
          {due && <DueChip due={due} />}
          {showTime && (
            <span style={{ display: 'flex', opacity: timeVisible ? 1 : 0, transition: 'opacity .15s',
              pointerEvents: timeVisible ? 'auto' : 'none' }}>
              <TimerChip mins={liveTotal} running={!!runningHere} canTrack={canTrackHere}
                onStart={() => onStartTimer(card.id)} onStop={onStopTimer} />
            </span>
          )}
          {card.checklist.length > 0 && (
            <Meta icon={<Icons.checkSquare size={14} />} text={`${done}/${card.checklist.length}`}
              tone={done === card.checklist.length ? 'done' : 'normal'} />
          )}
          {card.comments.length > 0 && <Meta icon={<Icons.message size={14} />} text={card.comments.length} />}
          {hasAgent && (
            <span title="Touched by the Dioschub assistant" style={{ display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-tint)',
              padding: '2px 6px', borderRadius: 6 }}>
              <Icons.spark size={12} /> Dioschub
            </span>
          )}
          <div style={{ flex: 1 }} />
          {members.length > 0 && <AvatarStack users={members} size={23} max={3} />}
        </div>
      )}
    </div>
  );
}

function DueChip({ due }) {
  const tones = {
    over: { bg: '#FBE3DF', fg: '#B0392B' },
    today: { bg: '#FBEBD6', fg: '#9A6512' },
    soon: { bg: '#FBEBD6', fg: '#9A6512' },
    normal: { bg: 'rgba(26,24,20,.05)', fg: 'var(--ink-2)' },
  };
  const t = tones[due.tone];
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700,
      padding: '2px 7px', borderRadius: 6, background: t.bg, color: t.fg }}>
      <Icons.clock size={13} /> {due.text}
    </span>
  );
}

function Meta({ icon, text, tone }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600,
      color: tone === 'done' ? '#0B6B60' : 'var(--ink-3)' }}>
      {icon} {text}
    </span>
  );
}

// darken a label color for readable text on its tint
function shade2(hex) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 0.7;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

// inline composer for adding a list
function AddListComposer({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const ref = useRef(null);
  useEffect(() => { if (adding && ref.current) ref.current.focus(); }, [adding]);
  const submit = () => { const t = val.trim(); if (t) { onAdd(t); setVal(''); ref.current && ref.current.focus(); } };

  if (!adding) {
    return (
      <button onClick={() => setAdding(true)} style={{ flex: 'none', width: 272, padding: '13px 14px', borderRadius: 14,
        textAlign: 'left', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5, background: 'rgba(26,24,20,.025)',
        border: '1px dashed var(--line-2)', display: 'flex', alignItems: 'center', gap: 8 }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,24,20,.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(26,24,20,.025)'}>
        <Icons.plus size={17} /> Add a list
      </button>
    );
  }
  return (
    <div style={{ flex: 'none', width: 272, padding: 8, borderRadius: 14, background: 'var(--surface-2)',
      border: '1px solid var(--paper-edge)' }}>
      <input ref={ref} value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { setAdding(false); setVal(''); } }}
        placeholder="List name…"
        style={{ width: '100%', height: 38, padding: '0 11px', borderRadius: 9, border: '1px solid var(--brand)',
          fontSize: 13.5, color: 'var(--ink)', outline: 'none', background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
        <button className="btn btn-primary" style={{ height: 32 }} onClick={submit}>Add list</button>
        <button className="btn btn-ghost" style={{ height: 32, width: 32, padding: 0, justifyContent: 'center' }}
          onClick={() => { setAdding(false); setVal(''); }}><Icons.x size={17} /></button>
      </div>
    </div>
  );
}

Object.assign(window, { BoardView, List, CardTile, DueChip, shade2, AddListComposer, RailList, FocusSeg, AnimList });
