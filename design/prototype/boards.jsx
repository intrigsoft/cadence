/* Boards home: greeting, accessible board grid, and a hidden-boards note (BYOA cue) */

function BoardsHome({ data, currentUser, accessibleBoards, allBoardsCount, onNavigate, cardsByBoard, onNewBoard }) {
  const hidden = allBoardsCount - accessibleBoards.length;
  const hour = 9;
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const myOpen = Object.values(data.cards).filter((c) => c.members.includes(currentUser.id)).length;

  return (
    <div style={{ position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 40px 60px' }}>
        {/* hero */}
        <div style={{ animation: 'fadeUp .5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: '.02em' }}>
              {new Date(data.today).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, letterSpacing: '-.02em',
            margin: 0, color: 'var(--ink)', lineHeight: 1.05 }}>
            {greet}, {currentUser.name.split(' ')[0]}.
          </h1>
          <p style={{ fontSize: 15.5, color: 'var(--ink-2)', marginTop: 10, maxWidth: 560, lineHeight: 1.5 }}>
            You're on <b style={{ color: 'var(--ink)' }}>{accessibleBoards.length} board{accessibleBoards.length !== 1 && 's'}</b> with
            {' '}<b style={{ color: 'var(--ink)' }}>{myOpen} card{myOpen !== 1 && 's'}</b> assigned to you.
          </p>
        </div>

        {/* board grid */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '34px 0 16px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'var(--ink-3)', margin: 0 }}>Your boards</h2>
          <button className="btn btn-primary" style={{ height: 34 }} onClick={onNewBoard}>
            <Icons.plus size={17} /> New board
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))', gap: 16 }}>
          {accessibleBoards.map((b, i) => (
            <BoardCard key={b.id} board={b} data={data} count={cardsByBoard[b.id] || 0}
              onClick={() => onNavigate({ type: 'board', boardId: b.id })} index={i} />
          ))}
          <NewBoardTile onClick={onNewBoard} index={accessibleBoards.length} />
        </div>

        {/* hidden boards note — the permission-scoping cue */}
        {hidden > 0 && (
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            borderRadius: 12, border: '1px dashed var(--line-2)', background: 'rgba(26,24,20,.015)',
            animation: 'fadeUp .6s ease both', animationDelay: '.15s' }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface-2)', display: 'grid',
              placeItems: 'center', color: 'var(--ink-3)', flex: 'none' }}><Icons.lock size={17} /></span>
            <div style={{ flex: 1, lineHeight: 1.4 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                {hidden} more board{hidden !== 1 && 's'} in {data.workspace.name} you don't have access to
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                Cadence — and the Dioschub assistant — only ever show what your role permits.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardCard({ board, data, count, onClick, index }) {
  const [hover, setHover] = useState(false);
  const members = board.memberIds.map((id) => data.users[id]);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="focusable" style={{ textAlign: 'left', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)',
        border: '1px solid var(--line)', boxShadow: hover ? 'var(--shadow-pop)' : 'var(--shadow-card)',
        transform: hover ? 'translateY(-3px)' : 'none', transition: 'transform .18s cubic-bezier(.2,.9,.3,1), box-shadow .18s',
        animation: 'fadeUp .5s ease both', animationDelay: `${0.05 + index * 0.05}s`, display: 'flex', flexDirection: 'column' }}>
      {/* cover */}
      <div style={{ height: 86, position: 'relative', background: `linear-gradient(135deg, ${board.accent}, ${shade(board.accent)})`,
        overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .5,
          background: 'radial-gradient(120% 90% at 85% 10%, rgba(255,255,255,.35), transparent 60%)' }} />
        <div style={{ position: 'absolute', right: -18, bottom: -28, width: 110, height: 110, borderRadius: 26,
          border: '2px solid rgba(255,255,255,.22)', transform: 'rotate(18deg)' }} />
        {board.visibility === 'private' && (
          <span style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 7, background: 'rgba(26,24,20,.28)', backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: 10.5, fontWeight: 700 }}>
            <Icons.lock size={12} /> Private
          </span>
        )}
      </div>
      {/* body */}
      <div style={{ padding: '14px 16px 15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)',
          letterSpacing: '-.01em', lineHeight: 1.15 }}>{board.name}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4, flex: 1 }}>{board.subtitle}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <AvatarStack users={members} size={26} max={4} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)',
            fontWeight: 600 }}>
            <Icons.columns size={14} /><span>{count} {count === 1 ? 'card' : 'cards'}</span>
          </span>
        </div>
      </div>
    </button>
  );
}

function shade(hex) {
  // darken toward ink for the cover gradient
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 0.62;
  r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
  return `rgb(${r},${g},${b})`;
}

function NewBoardTile({ onClick, index }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="focusable" style={{ minHeight: 198, borderRadius: 16, border: '1px dashed var(--line-2)',
        background: hover ? 'rgba(75,63,228,.04)' : 'rgba(26,24,20,.015)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12, color: hover ? 'var(--brand)' : 'var(--ink-3)',
        transition: '.16s', animation: 'fadeUp .5s ease both', animationDelay: `${0.05 + index * 0.05}s` }}>
      <span style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center',
        background: hover ? 'var(--brand)' : 'var(--surface-2)', color: hover ? '#fff' : 'var(--ink-3)',
        transition: '.16s', boxShadow: hover ? '0 6px 18px -4px rgba(75,63,228,.5)' : 'none' }}>
        <Icons.plus size={24} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>New board</span>
    </button>
  );
}

const BOARD_ACCENTS = ['#4B3FE4', '#0E8C7F', '#C2410C', '#E05A4F', '#8A5BD6', '#1A1814'];

function NewBoardModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [accent, setAccent] = useState(BOARD_ACCENTS[0]);
  const [visibility, setVisibility] = useState('private');
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  const submit = () => onCreate({ name, accent, visibility });

  return (
    <div ref={overlayRef} onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 130, background: 'rgba(26,24,20,.42)', backdropFilter: 'blur(3px)',
        display: 'grid', placeItems: 'center', padding: 20, animation: 'overlayIn .16s ease' }}>
      <div style={{ width: 'min(460px, 100%)', background: 'var(--surface)', borderRadius: 18, overflow: 'hidden',
        boxShadow: 'var(--shadow-pop)', animation: 'scaleIn .2s cubic-bezier(.2,.9,.3,1)' }}>
        {/* live cover preview */}
        <div style={{ height: 92, position: 'relative', background: `linear-gradient(135deg, ${accent}, ${shade(accent)})` }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .5,
            background: 'radial-gradient(120% 90% at 85% 10%, rgba(255,255,255,.35), transparent 60%)' }} />
          <div style={{ position: 'absolute', right: -18, bottom: -28, width: 110, height: 110, borderRadius: 26,
            border: '2px solid rgba(255,255,255,.22)', transform: 'rotate(18deg)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30,
            borderRadius: 8, background: 'rgba(26,24,20,.28)', backdropFilter: 'blur(4px)', color: '#fff',
            display: 'grid', placeItems: 'center' }}><Icons.x size={18} /></button>
          {visibility === 'private' && (
            <span style={{ position: 'absolute', bottom: 12, left: 18, display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 7, background: 'rgba(26,24,20,.28)', backdropFilter: 'blur(4px)',
              color: '#fff', fontSize: 10.5, fontWeight: 700 }}><Icons.lock size={12} /> Private</span>
          )}
        </div>

        <div style={{ padding: '20px 22px 22px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, margin: 0,
            color: 'var(--ink)', letterSpacing: '-.01em' }}>Create a board</h2>

          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em',
            textTransform: 'uppercase', color: 'var(--ink-3)', margin: '18px 0 7px' }}>Board name</label>
          <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) submit(); }}
            placeholder="e.g. Q4 Planning"
            style={{ width: '100%', height: 42, padding: '0 13px', borderRadius: 10, border: '1px solid var(--line-2)',
              fontSize: 14, color: 'var(--ink)', outline: 'none', background: 'var(--canvas)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--line-2)'} />

          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em',
            textTransform: 'uppercase', color: 'var(--ink-3)', margin: '18px 0 9px' }}>Color</label>
          <div style={{ display: 'flex', gap: 9 }}>
            {BOARD_ACCENTS.map((c) => (
              <button key={c} onClick={() => setAccent(c)} style={{ width: 34, height: 34, borderRadius: 9,
                background: `linear-gradient(135deg, ${c}, ${shade(c)})`, cursor: 'pointer',
                boxShadow: accent === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : 'none', transition: '.12s' }} />
            ))}
          </div>

          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em',
            textTransform: 'uppercase', color: 'var(--ink-3)', margin: '18px 0 9px' }}>Visibility</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['private', 'Private', 'Only members you add', <Icons.lock size={16} />],
              ['workspace', 'Workspace', 'Anyone at Northwind', <Icons.users size={16} />]].map(([v, t, sub, ic]) => (
              <button key={v} onClick={() => setVisibility(v)} style={{ flex: 1, textAlign: 'left', padding: '11px 13px',
                borderRadius: 11, border: `1px solid ${visibility === v ? 'var(--brand)' : 'var(--line-2)'}`,
                background: visibility === v ? 'var(--brand-tint)' : 'var(--surface)', transition: '.12s' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: visibility === v ? 'var(--brand-700)' : 'var(--ink-2)' }}>
                  {ic}<span style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</span>
                </span>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{sub}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 11.5,
            color: 'var(--ink-3)' }}>
            <Icons.shield size={14} /> You'll be the only member — the assistant's scope follows membership.
          </div>

          <div style={{ display: 'flex', gap: 9, marginTop: 20 }}>
            <button className="btn btn-primary" disabled={!name.trim()} onClick={submit}
              style={{ flex: 1, height: 42, justifyContent: 'center',
                opacity: name.trim() ? 1 : 0.45, pointerEvents: name.trim() ? 'auto' : 'none' }}>
              Create board
            </button>
            <button className="btn btn-outline" style={{ height: 42 }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BoardsHome, BoardCard, shade, NewBoardTile, NewBoardModal });
