/* Card detail modal: editable description, checklist, assignees, labels, due date,
   activity feed with audit attribution. Sidebar actions are fully functional. */

// Lightweight anchored popover with click-outside + Esc to close.
function Popover({ trigger, children, width = 240, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {trigger({ open, toggle: () => setOpen((o) => !o), close: () => setOpen(false) })}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, width, zIndex: 20,
          background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)', boxShadow: 'var(--shadow-pop)',
          padding: 8, animation: 'scaleIn .13s ease', transformOrigin: `top ${align}` }}>
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

function PopHeader({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
    color: 'var(--ink-3)', padding: '4px 8px 8px' }}>{children}</div>;
}

function CardDetail({ cardId, data, currentUser, onClose, onToggleCheck, onAddComment,
  onToggleMember, onToggleLabel, onSetDue, onAddChecklistItem, onRemoveChecklistItem, onSetDesc,
  runningTimer, onStartTimer, onStopTimer, onLogTime }) {
  const card = data.cards.find((c) => c.id === cardId);
  const [comment, setComment] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [checkText, setCheckText] = useState('');
  const [addingCheck, setAddingCheck] = useState(false);
  const checkRef = useRef(null);
  const overlayRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  useEffect(() => { if (addingCheck && checkRef.current) checkRef.current.focus(); }, [addingCheck]);
  if (!card) return null;

  const board = data.boards[card.boardId];
  const list = board.lists.find((l) => l.id === card.listId);
  const labels = card.labels.map((l) => data.labels[l]);
  const members = card.members.map((m) => data.users[m]);
  const boardMembers = board.memberIds.map((id) => data.users[id]);
  const allLabels = Object.values(data.labels);
  const due = dueMeta(card.due);
  const done = card.checklist.filter((k) => k.done).length;
  const pct = card.checklist.length ? Math.round((done / card.checklist.length) * 100) : 0;

  const feed = [
    ...card.comments.map((c) => ({ ...c, _t: 'comment' })),
    ...card.activity.map((a) => ({ ...a, _t: 'activity' })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  const startEditDesc = () => { setDescDraft(card.desc || ''); setEditingDesc(true); };
  const saveDesc = () => { onSetDesc(card.id, descDraft.trim()); setEditingDesc(false); };
  const submitCheck = () => { const t = checkText.trim(); if (t) { onAddChecklistItem(card.id, t); setCheckText(''); checkRef.current && checkRef.current.focus(); } };
  // for the native date input value
  const dueInputVal = card.due ? new Date(card.due).toISOString().slice(0, 10) : '';

  return (
    <div ref={overlayRef} onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(26,24,20,.42)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '52px 20px 40px', overflowY: 'auto',
        animation: 'overlayIn .16s ease' }}>
      <div style={{ width: 'min(820px, 100%)', background: 'var(--surface)', borderRadius: 18, overflow: 'hidden',
        boxShadow: 'var(--shadow-pop)', animation: 'scaleIn .2s cubic-bezier(.2,.9,.3,1)' }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${board.accent}, ${shade(board.accent)})` }} />

        <div style={{ display: 'flex' }}>
          {/* main */}
          <div style={{ flex: 1, padding: '22px 26px 28px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2.5, background: board.accent }} />
              {board.name} <Icons.chevRight size={13} /> <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{list.name}</span>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, letterSpacing: '-.01em',
                margin: 0, color: 'var(--ink)', lineHeight: 1.2, flex: 1, textWrap: 'pretty' }}>{card.title}</h2>
              <button onClick={onClose} className="btn btn-ghost" style={{ width: 34, height: 34, padding: 0,
                justifyContent: 'center', flex: 'none' }}><Icons.x size={20} /></button>
            </div>

            {labels.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {labels.map((l) => (
                  <span key={l.id} className="chip" style={{ height: 26, background: l.color + '24', color: shade2(l.color) }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: l.color }} />{l.name}
                  </span>
                ))}
              </div>
            )}

            {/* description */}
            <Section icon={<Icons.align size={17} />} title="Description"
              right={!editingDesc && (
                <button className="btn btn-ghost" style={{ height: 28, padding: '0 9px', fontSize: 12.5 }}
                  onClick={startEditDesc}>Edit</button>
              )}>
              {editingDesc ? (
                <div>
                  <textarea autoFocus value={descDraft} onChange={(e) => setDescDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveDesc();
                      if (e.key === 'Escape') { e.stopPropagation(); setEditingDesc(false); } }}
                    placeholder="Add a more detailed description…" rows={4}
                    style={{ width: '100%', resize: 'vertical', borderRadius: 10, border: '1px solid var(--brand)',
                      padding: '11px 12px', fontSize: 14, color: 'var(--ink)', outline: 'none', background: 'var(--surface)',
                      lineHeight: 1.55 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" style={{ height: 32 }} onClick={saveDesc}>Save</button>
                    <button className="btn btn-ghost" style={{ height: 32 }} onClick={() => setEditingDesc(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p onClick={startEditDesc} style={{ margin: 0, fontSize: 14, color: card.desc ? 'var(--ink)' : 'var(--ink-3)',
                  lineHeight: 1.6, textWrap: 'pretty', cursor: 'text' }}>
                  {card.desc || 'Add a more detailed description…'}
                </p>
              )}
            </Section>

            {/* checklist */}
            {(card.checklist.length > 0 || addingCheck) && (
              <Section icon={<Icons.checkSquare size={17} />} title="Checklist"
                right={card.checklist.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{pct}%</span>}>
                {card.checklist.length > 0 && (
                  <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden', margin: '2px 0 12px' }}>
                    <div style={{ height: '100%', width: pct + '%', background: 'var(--brand)', borderRadius: 99,
                      transition: 'width .3s cubic-bezier(.2,.9,.3,1)' }} />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {card.checklist.map((k) => (
                    <div key={k.id} className="check-row" style={{ display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 6px 6px 8px', borderRadius: 8 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <button onClick={() => onToggleCheck(card.id, k.id)} style={{ display: 'flex', flex: 'none',
                        color: k.done ? 'var(--brand)' : 'var(--ink-3)' }}>
                        {k.done ? <Icons.checkSquare size={19} /> : <Icons.square size={19} />}
                      </button>
                      <span style={{ flex: 1, fontSize: 13.5, color: k.done ? 'var(--ink-3)' : 'var(--ink)',
                        textDecoration: k.done ? 'line-through' : 'none' }}>{k.text}</span>
                      <button onClick={() => onRemoveChecklistItem(card.id, k.id)} title="Remove"
                        style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center',
                          color: 'var(--ink-3)', flex: 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,24,20,.06)'; e.currentTarget.style.color = 'var(--ink)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
                        <Icons.x size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                {addingCheck ? (
                  <div style={{ marginTop: 8, paddingLeft: 8 }}>
                    <input ref={checkRef} value={checkText} onChange={(e) => setCheckText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCheck(); }
                        if (e.key === 'Escape') { e.stopPropagation(); setAddingCheck(false); setCheckText(''); } }}
                      placeholder="Add an item…"
                      style={{ width: '100%', height: 36, padding: '0 11px', borderRadius: 9, border: '1px solid var(--brand)',
                        fontSize: 13.5, color: 'var(--ink)', outline: 'none', background: 'var(--surface)' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
                      <button className="btn btn-primary" style={{ height: 30 }} onClick={submitCheck}>Add</button>
                      <button className="btn btn-ghost" style={{ height: 30 }}
                        onClick={() => { setAddingCheck(false); setCheckText(''); }}>Done</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-ghost" style={{ height: 32, marginTop: 6, marginLeft: 2, fontSize: 13 }}
                    onClick={() => setAddingCheck(true)}><Icons.plus size={15} /> Add an item</button>
                )}
              </Section>
            )}

            {/* time tracking */}
            <Section icon={<Icons.timer size={17} />} title="Time"
              right={cardTrackedMins(card) > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {fmtMins(cardTrackedMins(card))}
                </span>
              )}>
              <TimeBody card={card} board={board} data={data} currentUser={currentUser}
                runningTimer={runningTimer} onStart={onStartTimer} onStop={onStopTimer} onLog={onLogTime} />
            </Section>

            {/* activity */}
            <Section icon={<Icons.message size={17} />} title="Activity">
              <div style={{ display: 'flex', gap: 11, marginBottom: 18 }}>
                <Avatar user={currentUser} size={32} />
                <div style={{ flex: 1 }}>
                  <input value={comment} onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) { onAddComment(card.id, comment.trim()); setComment(''); } }}
                    placeholder="Write a comment…"
                    style={{ width: '100%', height: 40, padding: '0 13px', borderRadius: 10, border: '1px solid var(--line-2)',
                      fontSize: 13.5, color: 'var(--ink)', outline: 'none', background: 'var(--canvas)' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--line-2)'} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {feed.length === 0 && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>No activity yet.</span>}
                {feed.map((f) => f._t === 'comment'
                  ? <CommentRow key={f.id} item={f} data={data} />
                  : <ActivityRow key={f.id} item={f} data={data} />)}
              </div>
            </Section>
          </div>

          {/* sidebar */}
          <div style={{ width: 230, flex: 'none', borderLeft: '1px solid var(--line)', padding: '22px 18px',
            background: 'var(--canvas)' }}>
            <SideLabel>Assignees</SideLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
              {members.map((m) => (
                <button key={m.id} title={`Remove ${m.name}`} onClick={() => onToggleMember(card.id, m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 9px 3px 3px', borderRadius: 99,
                    background: 'var(--surface)', border: '1px solid var(--line)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line)'}>
                  <Avatar user={m} size={22} /><span style={{ fontSize: 12, fontWeight: 600 }}>{m.name.split(' ')[0]}</span>
                </button>
              ))}
              <Popover width={236} align="right" trigger={({ toggle }) => (
                <button onClick={toggle} title="Add assignee" style={{ width: 28, height: 28, borderRadius: 99,
                  border: '1px dashed var(--line-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line-2)'}><Icons.plus size={15} /></button>
              )}>
                {() => (<>
                  <PopHeader>Board members</PopHeader>
                  {boardMembers.map((m) => {
                    const on = card.members.includes(m.id);
                    return (
                      <button key={m.id} onClick={() => onToggleMember(card.id, m.id)} style={{ width: '100%',
                        display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 8, textAlign: 'left' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <Avatar user={m} size={26} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.title}</div>
                        </span>
                        {on && <Icons.check size={16} style={{ color: 'var(--brand)', flex: 'none' }} />}
                      </button>
                    );
                  })}
                </>)}
              </Popover>
            </div>

            <SideLabel>Labels</SideLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 18 }}>
              {labels.map((l) => (
                <span key={l.id} className="chip" style={{ background: l.color + '24', color: shade2(l.color) }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: l.color }} />{l.name}
                </span>
              ))}
              <Popover width={224} align="right" trigger={({ toggle }) => (
                <button onClick={toggle} title="Edit labels" style={{ height: 22, padding: '0 9px', borderRadius: 6,
                  border: '1px dashed var(--line-2)', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-3)',
                  fontSize: 11.5, fontWeight: 700 }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line-2)'}><Icons.plus size={13} /> Label</button>
              )}>
                {() => (<>
                  <PopHeader>Labels</PopHeader>
                  {allLabels.map((l) => {
                    const on = card.labels.includes(l.id);
                    return (
                      <button key={l.id} onClick={() => onToggleLabel(card.id, l.id)} style={{ width: '100%',
                        display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 8, textAlign: 'left' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ flex: 1, height: 26, borderRadius: 7, background: l.color + '24', color: shade2(l.color),
                          display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', fontSize: 12.5, fontWeight: 700 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: l.color }} />{l.name}
                        </span>
                        {on && <Icons.check size={16} style={{ color: 'var(--brand)', flex: 'none' }} />}
                      </button>
                    );
                  })}
                </>)}
              </Popover>
            </div>

            <SideLabel>Due date</SideLabel>
            <div style={{ marginBottom: 18 }}>
              <Popover width={232} align="right" trigger={({ toggle }) => (
                due ? (
                  <button onClick={toggle}><DueChip due={due} /></button>
                ) : (
                  <button onClick={toggle} className="btn btn-outline" style={{ height: 34, fontSize: 13 }}>
                    <Icons.calendar size={16} /> Set date
                  </button>
                )
              )}>
                {({ close }) => (<>
                  <PopHeader>Due date</PopHeader>
                  <input type="date" defaultValue={dueInputVal}
                    onChange={(e) => { onSetDue(card.id, e.target.value ? new Date(e.target.value + 'T17:00:00').toISOString() : null); }}
                    style={{ width: '100%', height: 38, padding: '0 11px', borderRadius: 9, border: '1px solid var(--line-2)',
                      fontSize: 13.5, color: 'var(--ink)', outline: 'none', background: 'var(--surface)' }} />
                  {card.due && (
                    <button className="btn btn-ghost" style={{ height: 32, marginTop: 6, width: '100%', justifyContent: 'center' }}
                      onClick={() => { onSetDue(card.id, null); close(); }}>Clear date</button>
                  )}
                </>)}
              </Popover>
            </div>

            <SideLabel>Add to card</SideLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Popover width={236} align="right" trigger={({ toggle }) => (
                <ActionBtn icon={<Icons.user size={16} />} label="Members" onClick={toggle} />
              )}>
                {() => (<>
                  <PopHeader>Board members</PopHeader>
                  {boardMembers.map((m) => {
                    const on = card.members.includes(m.id);
                    return (
                      <button key={m.id} onClick={() => onToggleMember(card.id, m.id)} style={{ width: '100%',
                        display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 8, textAlign: 'left' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <Avatar user={m} size={26} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.title}</div>
                        </span>
                        {on && <Icons.check size={16} style={{ color: 'var(--brand)', flex: 'none' }} />}
                      </button>
                    );
                  })}
                </>)}
              </Popover>
              <Popover width={224} align="right" trigger={({ toggle }) => (
                <ActionBtn icon={<Icons.tag size={16} />} label="Labels" onClick={toggle} />
              )}>
                {() => (<>
                  <PopHeader>Labels</PopHeader>
                  {allLabels.map((l) => {
                    const on = card.labels.includes(l.id);
                    return (
                      <button key={l.id} onClick={() => onToggleLabel(card.id, l.id)} style={{ width: '100%',
                        display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 8, textAlign: 'left' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ flex: 1, height: 26, borderRadius: 7, background: l.color + '24', color: shade2(l.color),
                          display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', fontSize: 12.5, fontWeight: 700 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: l.color }} />{l.name}
                        </span>
                        {on && <Icons.check size={16} style={{ color: 'var(--brand)', flex: 'none' }} />}
                      </button>
                    );
                  })}
                </>)}
              </Popover>
              <Popover width={232} align="right" trigger={({ toggle }) => (
                <ActionBtn icon={<Icons.calendar size={16} />} label="Due date" onClick={toggle} />
              )}>
                {({ close }) => (<>
                  <PopHeader>Due date</PopHeader>
                  <input type="date" defaultValue={dueInputVal}
                    onChange={(e) => { onSetDue(card.id, e.target.value ? new Date(e.target.value + 'T17:00:00').toISOString() : null); }}
                    style={{ width: '100%', height: 38, padding: '0 11px', borderRadius: 9, border: '1px solid var(--line-2)',
                      fontSize: 13.5, color: 'var(--ink)', outline: 'none', background: 'var(--surface)' }} />
                  {card.due && (
                    <button className="btn btn-ghost" style={{ height: 32, marginTop: 6, width: '100%', justifyContent: 'center' }}
                      onClick={() => { onSetDue(card.id, null); close(); }}>Clear date</button>
                  )}
                </>)}
              </Popover>
              <ActionBtn icon={<Icons.checkSquare size={16} />} label="Checklist"
                onClick={() => setAddingCheck(true)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
      borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 13,
      fontWeight: 600, color: 'var(--ink-2)', textAlign: 'left', width: '100%' }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-3)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line)'}>
      <span style={{ color: 'var(--ink-3)', display: 'flex' }}>{icon}</span>{label}
    </button>
  );
}

function Section({ icon, title, right, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ color: 'var(--ink-3)', display: 'flex' }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>{title}</h3>
        {right}
      </div>
      <div style={{ paddingLeft: 26 }}>{children}</div>
    </div>
  );
}

function SideLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
    color: 'var(--ink-3)', marginBottom: 9 }}>{children}</div>;
}

function CommentRow({ item, data }) {
  const u = data.users[item.userId];
  return (
    <div style={{ display: 'flex', gap: 11 }}>
      <Avatar user={u} size={32} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{u.name}</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{timeAgo(item.at)}</span>
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.55, marginTop: 3, background: 'var(--canvas)',
          padding: '9px 12px', borderRadius: '4px 12px 12px 12px', border: '1px solid var(--line)', textWrap: 'pretty' }}>
          {item.text}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ item, data }) {
  const u = data.users[item.actorUserId];
  const isAgent = item.kind === 'agent';
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      {isAgent ? (
        <span style={{ width: 32, height: 32, borderRadius: 99, background: 'var(--ink-900)', display: 'grid',
          placeItems: 'center', flex: 'none', boxShadow: '0 0 0 2px var(--surface)' }}>
          <Icons.spark size={16} style={{ color: 'var(--beam)' }} />
        </span>
      ) : <Avatar user={u} size={32} />}
      <div style={{ flex: 1, paddingTop: 2 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          <b style={{ color: 'var(--ink)', fontWeight: 700 }}>{isAgent ? 'Dioschub Assistant' : u.name}</b>{' '}
          {item.text}{' · '}<span style={{ color: 'var(--ink-3)' }}>{timeAgo(item.at)}</span>
        </div>
        {isAgent && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 5, padding: '3px 8px',
            borderRadius: 6, background: 'var(--brand-tint)', fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--brand-700)', whiteSpace: 'nowrap' }}>
            <Icons.shield size={12} /> <span>acting as {u.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CardDetail });
