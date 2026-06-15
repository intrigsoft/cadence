/* Root App: state, routing, permission scoping, mutations.
   Workflow-aware: stage×role gating on moves, focus mode, timers, report + designer views. */

const LS = 'cadence_demo_state_v1';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "enforcement": "Block",
  "timeChips": true,
  "autoStop": true,
  "focusZone": true,
  "zoneTint": "rgba(255,255,255,.72)",
  "workTint": true
}/*EDITMODE-END*/;

function App() {
  const data = window.CADENCE_DATA;
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (_) { return {}; } })();

  const [currentUserId, setCurrentUserId] = useState(saved.userId || 'u_sarah');
  const [authed, setAuthed] = useState(saved.authed ?? false);
  const [view, setView] = useState(() => {
    const v = saved.view || { type: 'home' };
    if ((v.type === 'board' || v.type === 'workflow') && !data.boards[v.boardId]) return { type: 'home' };
    return v;
  });
  const [cards, setCards] = useState(data.cards);
  const [boards, setBoards] = useState(data.boards);
  const [openCardId, setOpenCardId] = useState(null);
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(saved.assistantOpen ?? true);
  const [query, setQuery] = useState('');
  const [toasts, setToasts] = useState([]);
  const [focusMode, setFocusMode] = useState(saved.focusMode ?? false);
  const [boardMode, setBoardMode] = useState('lists');
  const [timers, setTimers] = useState(saved.timers || {}); // userId -> { cardId, startedAt }
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const currentUser = data.users[currentUserId];
  const runningTimer = timers[currentUserId] || null;
  const liveData = useMemo(() => ({ ...data, boards, cards }), [data, boards, cards]);

  const accessibleBoards = useMemo(() => {
    const order = ['b_sprint', 'b_roadmap', 'b_launch', 'b_bugs', 'b_leadership'];
    const rank = (id) => { const i = order.indexOf(id); return i === -1 ? 99 : i; };
    return Object.keys(boards).sort((a, b) => rank(a) - rank(b))
      .map((id) => boards[id]).filter((b) => b.memberIds.includes(currentUserId));
  }, [currentUserId, boards]);

  const cardsByBoard = useMemo(() => {
    const m = {}; cards.forEach((c) => { m[c.boardId] = (m[c.boardId] || 0) + 1; }); return m;
  }, [cards]);

  // persist
  useEffect(() => {
    localStorage.setItem(LS, JSON.stringify({ userId: currentUserId, view, assistantOpen, authed, focusMode, timers }));
  }, [currentUserId, view, assistantOpen, authed, focusMode, timers]);

  // toast helper
  const toast = useCallback((text, tone) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // guard: if current board view becomes inaccessible after persona switch
  useEffect(() => {
    if (view.type === 'board' || view.type === 'workflow') {
      const b = boards[view.boardId];
      if (!b || !b.memberIds.includes(currentUserId) || (view.type === 'workflow' && currentUser.role !== 'admin')) {
        setView({ type: 'home' });
        setOpenCardId(null);
      }
    }
  }, [currentUserId]);

  const login = (uid, method) => {
    const u = data.users[uid];
    const n = Object.values(boards).filter((b) => b.memberIds.includes(uid)).length;
    setCurrentUserId(uid);
    setView({ type: 'home' });
    setOpenCardId(null);
    setAuthed(true);
    toast(`Signed in as <b>${u.name}</b>${method === 'sso' ? ' via SSO' : ''}. The assistant operates as you across <b>${n} board${n !== 1 ? 's' : ''}</b>.`);
  };

  const logout = () => {
    setAuthed(false);
    setOpenCardId(null);
    setNewBoardOpen(false);
  };

  const switchPersona = (uid) => {
    const u = data.users[uid];
    const n = Object.values(boards).filter((b) => b.memberIds.includes(uid)).length;
    const roleTxt = { admin: 'Admin', member: 'Member', guest: 'Guest' }[u.role];
    setCurrentUserId(uid);
    setView({ type: 'home' });
    setOpenCardId(null);
    toast(`Now signed in as <b>${u.name}</b> (${roleTxt}). Assistant scope: <b>${n} board${n !== 1 ? 's' : ''}</b>.`);
  };

  const navigate = (v) => {
    if (v.type === 'board' || v.type === 'workflow') {
      const b = boards[v.boardId];
      if (!b.memberIds.includes(currentUserId)) {
        toast(`Access denied — you're not a member of <b>${b.name}</b>.`, 'deny');
        return;
      }
      if (v.type === 'workflow' && currentUser.role !== 'admin') {
        toast('Only workspace admins can open the workflow designer.', 'deny');
        return;
      }
      if (v.type === 'board') setBoardMode('lists');
    }
    setView(v); setQuery('');
  };

  // ---- card mutations ----
  const moveCard = (cardId, toListId, toIndex) => {
    setCards((prev) => {
      const moved = prev.find((c) => c.id === cardId);
      if (!moved) return prev;
      const updated = prev.map((c) => c.id === cardId ? { ...c, listId: toListId } : c);
      const target = updated.filter((c) => c.listId === toListId && c.id !== cardId).sort((a, b) => a.pos - b.pos);
      const idx = Math.max(0, Math.min(toIndex, target.length));
      const ordered = [...target.slice(0, idx), updated.find((c) => c.id === cardId), ...target.slice(idx)];
      const posMap = {}; ordered.forEach((c, i) => { posMap[c.id] = i; });
      return updated.map((c) => posMap[c.id] !== undefined ? { ...c, pos: posMap[c.id] } : c);
    });
  };

  // ---- time tracking ----
  const appendEntry = (cardId, entry) => setCards((prev) => prev.map((c) => c.id !== cardId ? c : {
    ...c, timeEntries: [...(c.timeEntries || []), entry] }));

  const mkEntry = (uid, card, listId, minutes, manual) => {
    const board = boards[card.boardId];
    const role = wfRole(board, uid);
    return { id: 'te_' + Math.random().toString(36).slice(2, 8), userId: uid, roleId: role ? role.id : null,
      listId, minutes, at: new Date().toISOString(), manual: !!manual };
  };

  // stop + log the running timer for a user; returns { mins, card } or null
  const stopTimerFor = (uid) => {
    const t = timers[uid]; if (!t) return null;
    const card = cards.find((c) => c.id === t.cardId);
    const mins = Math.max(1, Math.round((Date.now() - t.startedAt) / 60000));
    if (card) appendEntry(card.id, mkEntry(uid, card, card.listId, mins, false));
    setTimers((prev) => { const n = { ...prev }; delete n[uid]; return n; });
    return { mins, card };
  };

  const startTimer = (cardId) => {
    const existing = timers[currentUserId];
    if (existing && existing.cardId !== cardId) {
      const r = stopTimerFor(currentUserId);
      if (r && r.card) toast(`Stopped your other timer — logged <b>${fmtMins(r.mins)}</b> on “${r.card.title}”.`);
    }
    setTimers((prev) => ({ ...prev, [currentUserId]: { cardId, startedAt: Date.now() } }));
  };

  const stopTimer = () => {
    const r = stopTimerFor(currentUserId);
    if (r && r.card) {
      const board = boards[r.card.boardId];
      const list = board.lists.find((l) => l.id === r.card.listId);
      toast(`Timer stopped — logged <b>${fmtMins(r.mins)}</b> in <b>${list ? list.name : 'this stage'}</b>.`);
    }
  };

  const logTime = (cardId, minutes) => {
    const card = cards.find((c) => c.id === cardId); if (!card) return;
    appendEntry(cardId, mkEntry(currentUserId, card, card.listId, minutes, true));
    toast(`Logged <b>${fmtMins(minutes)}</b> on “${card.title}”.`);
  };

  // move with stage×role permission gating + timer auto-stop
  const tryMoveCard = (cardId, toListId, toIndex) => {
    const card = cards.find((c) => c.id === cardId); if (!card) return;
    const board = boards[card.boardId];
    const from = board.lists.find((l) => l.id === card.listId);
    const to = board.lists.find((l) => l.id === toListId);
    const role = wfRole(board, currentUserId);
    const allowed = card.listId === toListId || wfCan(board, currentUser, toListId, 'drop');
    if (!allowed) {
      if (tw.enforcement === 'Block') {
        toast(`<b>${role ? role.name : 'Your role'}</b> can't move cards into <b>${to ? to.name : 'that stage'}</b>.`, 'deny');
        return;
      }
      toast(`Heads up — <b>${role ? role.name : 'your role'}</b> isn't meant to move cards into <b>${to ? to.name : 'that stage'}</b>.`, 'warn');
    }
    const t = timers[currentUserId];
    if (t && t.cardId === cardId && card.listId !== toListId && !wfCanTrack(board, currentUser, toListId)) {
      if (tw.autoStop) {
        const mins = Math.max(1, Math.round((Date.now() - t.startedAt) / 60000));
        appendEntry(cardId, mkEntry(currentUserId, card, card.listId, mins, false));
        setTimers((prev) => { const n = { ...prev }; delete n[currentUserId]; return n; });
        toast(`Timer auto-stopped — logged <b>${fmtMins(mins)}</b> in <b>${from ? from.name : 'the previous stage'}</b>. ${role ? role.name : 'Your role'} doesn't track time in ${to ? to.name : 'the new stage'}.`);
      } else {
        toast(`Your timer is still running, but <b>${role ? role.name : 'your role'}</b> doesn't track time in <b>${to ? to.name : 'the new stage'}</b>.`, 'warn');
      }
    }
    moveCard(cardId, toListId, toIndex);
  };

  // ---- board mutations ----
  const patchBoard = (boardId, fn) => setBoards((prev) => ({ ...prev, [boardId]: fn(prev[boardId]) }));

  const createBoard = ({ name, accent, visibility }) => {
    const id = 'b_new_' + Math.random().toString(36).slice(2, 7);
    const board = {
      id, name: name.trim() || 'Untitled board', subtitle: 'Created just now', accent, visibility,
      memberIds: [currentUserId],
      lists: [
        { id: id + '_l1', name: 'To Do' },
        { id: id + '_l2', name: 'In Progress' },
        { id: id + '_l3', name: 'Done' },
      ],
    };
    window.ensureWorkflow(board);
    setBoards((prev) => ({ ...prev, [id]: board }));
    setNewBoardOpen(false);
    setView({ type: 'board', boardId: id });
    toast(`Board <b>${board.name}</b> created \u2014 you're the only member so far.`);
  };

  const addCard = (listId, title) => {
    const board = boards[view.boardId];
    const maxPos = Math.max(0, ...cards.filter((c) => c.listId === listId).map((c) => c.pos));
    const id = 'c_new_' + Math.random().toString(36).slice(2, 7);
    setCards((prev) => [...prev, { id, boardId: board.id, listId, title, pos: maxPos + 1,
      labels: [], members: [], checklist: [], comments: [], activity: [], timeEntries: [] }]);
  };

  const addList = (name) => {
    const lid = view.boardId + '_l_' + Math.random().toString(36).slice(2, 6);
    setBoards((prev) => {
      const b = prev[view.boardId];
      if (!b) return prev;
      const xs = Object.values(b.workflow.nodes);
      const x = Math.min(1280, (xs.length ? Math.max(...xs.map((n) => n.x)) : -200) + 240);
      const permissions = { ...b.workflow.permissions, [lid]: {} };
      Object.keys(b.roles || {}).forEach((rid) => { permissions[lid][rid] = { pick: true, drop: true, work: true }; });
      return { ...prev, [view.boardId]: { ...b, lists: [...b.lists, { id: lid, name: name.trim() }],
        workflow: { ...b.workflow, nodes: { ...b.workflow.nodes, [lid]: { x, y: 150 } }, permissions } } };
    });
  };

  const toggleCheck = (cardId, kId) => {
    setCards((prev) => prev.map((c) => c.id !== cardId ? c : {
      ...c, checklist: c.checklist.map((k) => k.id === kId ? { ...k, done: !k.done } : k),
    }));
  };

  const addComment = (cardId, text) => {
    setCards((prev) => prev.map((c) => c.id !== cardId ? c : {
      ...c, comments: [...c.comments, { id: 'm_' + Math.random().toString(36).slice(2), userId: currentUserId,
        at: data.today, text }],
    }));
  };

  const patchCard = (cardId, fn) => setCards((prev) => prev.map((c) => c.id !== cardId ? c : fn(c)));

  const toggleMember = (cardId, userId) => patchCard(cardId, (c) => ({
    ...c, members: c.members.includes(userId) ? c.members.filter((m) => m !== userId) : [...c.members, userId],
  }));
  const toggleLabel = (cardId, labelId) => patchCard(cardId, (c) => ({
    ...c, labels: c.labels.includes(labelId) ? c.labels.filter((l) => l !== labelId) : [...c.labels, labelId],
  }));
  const setDue = (cardId, iso) => patchCard(cardId, (c) => ({ ...c, due: iso }));
  const addChecklistItem = (cardId, text) => patchCard(cardId, (c) => ({
    ...c, checklist: [...c.checklist, { id: 'k_' + Math.random().toString(36).slice(2, 7), text, done: false }],
  }));
  const removeChecklistItem = (cardId, kId) => patchCard(cardId, (c) => ({
    ...c, checklist: c.checklist.filter((k) => k.id !== kId),
  }));
  const setDesc = (cardId, desc) => patchCard(cardId, (c) => ({ ...c, desc }));

  // ---- crumb for topbar ----
  let crumb;
  if ((view.type === 'board' || view.type === 'workflow') && boards[view.boardId]) {
    const b = boards[view.boardId];
    crumb = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <button onClick={() => navigate({ type: 'home' })} className="btn btn-ghost"
          style={{ height: 32, padding: '0 8px', fontSize: 13 }}><Icons.chevLeft size={17} /> Boards</button>
        <span style={{ color: 'var(--line-2)' }}>/</span>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: b.accent }} />
        <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
        {view.type === 'workflow' && (
          <>
            <span style={{ color: 'var(--line-2)' }}>/</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5,
              color: 'var(--brand)' }}><Icons.flow size={15} /> Workflow</span>
          </>
        )}
      </div>
    );
  } else {
    crumb = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icons.grid size={18} style={{ color: 'var(--ink-3)' }} />
        <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>
          {view.type === 'mycards' ? 'My cards' : 'All boards'}
        </span>
      </div>
    );
  }

  const tweaksPanel = (
    <TweaksPanel>
      <TweakSection label="Workflow permissions" />
      <TweakRadio label="Illegal moves" value={tw.enforcement} options={['Block', 'Warn']}
        onChange={(v) => setTweak('enforcement', v)} />
      <TweakSection label="Focus zone" />
      <TweakToggle label="Highlight focus zone" value={tw.focusZone} onChange={(v) => setTweak('focusZone', v)} />
      <TweakColor label="Zone tint" value={tw.zoneTint}
        options={['rgba(255,255,255,.72)', '#E8EFD2', '#DDF1EA', '#EFEDFB']}
        onChange={(v) => setTweak('zoneTint', v)} />
      <TweakToggle label="Tint working stages" value={tw.workTint} onChange={(v) => setTweak('workTint', v)} />
      <TweakSection label="Time tracking" />
      <TweakToggle label="Time chips on cards" value={tw.timeChips} onChange={(v) => setTweak('timeChips', v)} />
      <TweakToggle label="Auto-stop timer on move" value={tw.autoStop} onChange={(v) => setTweak('autoStop', v)} />
    </TweaksPanel>
  );

  if (!authed) {
    return (
      <React.Fragment>
        <Login data={data} onLogin={login} />
        <Toaster toasts={toasts} />
        {tweaksPanel}
      </React.Fragment>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar data={liveData} currentUser={currentUser} boards={accessibleBoards}
        activeBoardId={(view.type === 'board' || view.type === 'workflow') ? view.boardId : null}
        view={view.type} onNavigate={navigate} onNewBoard={() => setNewBoardOpen(true)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar data={data} currentUser={currentUser} crumb={crumb} query={query} onSearch={setQuery}
          assistantOpen={assistantOpen} onToggleAssistant={() => setAssistantOpen((o) => !o)}
          onSwitchPersona={switchPersona} onLogout={logout} />

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <main style={{ flex: 1, minWidth: 0, background: 'var(--canvas)', position: 'relative' }}>
            {view.type === 'board' && boards[view.boardId] && (
              <BoardView board={boards[view.boardId]} data={liveData} currentUser={currentUser}
                cards={cards.filter((c) => c.boardId === view.boardId)} query={query}
                onOpenCard={setOpenCardId} onMoveCard={tryMoveCard} onAddCard={addCard} onAddList={addList}
                onToast={toast} focusMode={focusMode} onSetFocusMode={setFocusMode}
                boardMode={boardMode} onSetBoardMode={setBoardMode}
                onOpenWorkflow={() => navigate({ type: 'workflow', boardId: view.boardId })}
                runningTimer={runningTimer} onStartTimer={startTimer} onStopTimer={stopTimer}
                timeChips={tw.timeChips} enforcement={tw.enforcement}
                focusZone={tw.focusZone} focusZoneColor={tw.zoneTint} workTint={tw.workTint} />
            )}
            {view.type === 'workflow' && boards[view.boardId] && (
              <WorkflowDesigner board={boards[view.boardId]} data={liveData} currentUser={currentUser}
                cards={cards.filter((c) => c.boardId === view.boardId)}
                onBack={() => navigate({ type: 'board', boardId: view.boardId })}
                onPatchBoard={(fn) => patchBoard(view.boardId, fn)} onToast={toast} />
            )}
            {view.type === 'home' && (
              <BoardsHome data={liveData} currentUser={currentUser} accessibleBoards={accessibleBoards}
                allBoardsCount={Object.keys(boards).length} onNavigate={navigate} cardsByBoard={cardsByBoard}
                onNewBoard={() => setNewBoardOpen(true)} />
            )}
            {view.type === 'mycards' && (
              <MyCards data={liveData} currentUser={currentUser} accessibleBoards={accessibleBoards}
                cards={cards} onOpenCard={setOpenCardId} onNavigate={navigate} />
            )}
          </main>

          <AssistantPanel open={assistantOpen} data={liveData} currentUser={currentUser}
            accessibleBoards={accessibleBoards} onClose={() => setAssistantOpen(false)} />
        </div>
      </div>

      {openCardId && (
        <CardDetail cardId={openCardId} data={liveData} currentUser={currentUser}
          onClose={() => setOpenCardId(null)} onToggleCheck={toggleCheck} onAddComment={addComment}
          onToggleMember={toggleMember} onToggleLabel={toggleLabel} onSetDue={setDue}
          onAddChecklistItem={addChecklistItem} onRemoveChecklistItem={removeChecklistItem} onSetDesc={setDesc}
          runningTimer={runningTimer} onStartTimer={startTimer} onStopTimer={stopTimer} onLogTime={logTime} />
      )}

      <Toaster toasts={toasts} />
      {newBoardOpen && <NewBoardModal onClose={() => setNewBoardOpen(false)} onCreate={createBoard} />}
      {tweaksPanel}
    </div>
  );
}

// ---- My cards view ----------------------------------------------------------
function MyCards({ data, currentUser, accessibleBoards, cards, onOpenCard, onNavigate }) {
  const mine = cards.filter((c) => c.members.includes(currentUser.id));
  const byBoard = accessibleBoards.map((b) => ({ board: b, items: mine.filter((c) => c.boardId === b.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 40px 60px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-.02em',
          margin: 0, color: 'var(--ink)' }}>My cards</h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 8 }}>
          {mine.length} card{mine.length !== 1 && 's'} assigned to you across {byBoard.length} board{byBoard.length !== 1 && 's'}.
        </p>
        {byBoard.map(({ board, items }) => (
          <div key={board.id} style={{ marginTop: 30 }}>
            <button onClick={() => onNavigate({ type: 'board', boardId: board.id })}
              style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: board.accent }} />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                color: 'var(--ink-2)' }}>{board.name}</span>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((c) => {
                const list = board.lists.find((l) => l.id === c.listId);
                const due = dueMeta(c.due);
                const mins = cardTrackedMins(c);
                return (
                  <button key={c.id} onClick={() => onOpenCard(c.id)} style={{ display: 'flex', alignItems: 'center',
                    gap: 12, padding: '13px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)',
                    textAlign: 'left', boxShadow: 'var(--shadow-card)' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--line-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
                      {c.labels.slice(0, 3).map((l) => (
                        <span key={l} style={{ width: 8, height: 8, borderRadius: 99, background: data.labels[l].color }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', flex: 1 }}>{c.title}</span>
                    {mins > 0 && <TimeChip mins={mins} />}
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{list ? list.name : ''}</span>
                    {due && <DueChip due={due} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {byBoard.length === 0 && (
          <div style={{ marginTop: 40, padding: 40, textAlign: 'center', color: 'var(--ink-3)',
            border: '1px dashed var(--line-2)', borderRadius: 14 }}>
            Nothing assigned to you yet.
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
