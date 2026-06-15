/* Dioschub assistant: docked dark panel. Embedded "secure layer" shell.
   Operates-as header + audit framing. (Live AI is wired by Claude Code.) */

function AssistantPanel({ open, data, currentUser, accessibleBoards, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [val, setVal] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // reset conversation when the persona changes — new identity, new scope
  useEffect(() => { setMsgs([]); setTyping(false); setVal(''); }, [currentUser.id]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, typing]);
  useEffect(() => { if (open && inputRef.current) setTimeout(() => inputRef.current.focus(), 260); }, [open]);

  const firstName = currentUser.name.split(' ')[0];
  const boardNames = accessibleBoards.map((b) => b.name);

  const send = (text) => {
    const t = (text || '').trim();
    if (!t) return;
    setMsgs((m) => [...m, { who: 'user', text: t }]);
    setVal('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, {
        who: 'bot',
        text: `In the live demo I'd act on this directly — moving cards, assigning work, or answering — but only across the ${boardNames.length} board${boardNames.length !== 1 ? 's' : ''} you can access, and every action is logged as <b>${currentUser.email}</b>.`,
        note: true,
      }]);
    }, 900);
  };

  const suggestions = [
    `What's assigned to me?`,
    `Summarize ${accessibleBoards[0] ? accessibleBoards[0].name : 'my board'}`,
    `What's overdue?`,
  ];

  return (
    <aside className="on-dark" style={{ width: open ? 'var(--assistant-w)' : 0, flex: 'none', overflow: 'hidden',
      transition: 'width .34s cubic-bezier(.3,.9,.3,1)', borderLeft: open ? '1px solid var(--line-dark)' : 'none',
      background: 'var(--ink-900)', height: '100%' }}>
      <div style={{ width: 'var(--assistant-w)', height: '100%', display: 'flex', flexDirection: 'column',
        animation: open ? 'panelIn .34s ease' : 'none' }}>

        {/* header */}
        <div style={{ flex: 'none', padding: '14px 16px 14px', borderBottom: '1px solid var(--line-dark)',
          background: 'linear-gradient(180deg, var(--ink-850), var(--ink-900))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--ink-800)',
              border: '1px solid var(--line-dark)', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Icons.spark size={19} style={{ color: 'var(--beam)' }} />
            </span>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5,
                  color: 'var(--ink-on-dark)' }}>Dioschub Assistant</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-on-dark-3)' }}>Embedded in Cadence</div>
            </div>
            <button onClick={onClose} className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0,
              justifyContent: 'center', color: 'var(--ink-on-dark-2)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244,241,234,.07)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}><Icons.x size={19} /></button>
          </div>

          {/* operating-as identity */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
            borderRadius: 10, background: 'var(--ink-850)', border: '1px solid var(--line-dark)' }}>
            <Avatar user={currentUser} size={26} ring="dark" />
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
                color: 'var(--ink-on-dark-3)' }}>Operating as</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-on-dark)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email}</div>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700,
              color: '#6FE0A8', flex: 'none' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: '#6FE0A8',
                boxShadow: '0 0 0 3px rgba(111,224,168,.18)' }} /> live
            </span>
          </div>

          {/* security badges */}
          <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
            {[['Credential-blind', <Icons.shieldDot size={12} />], ['Audit-logged', <Icons.check size={12} />],
              [`${accessibleBoards.length} boards in scope`, <Icons.lock size={12} />]].map(([t, ic]) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                color: 'var(--ink-on-dark-2)', background: 'var(--ink-800)', border: '1px solid var(--line-dark)',
                padding: '3px 7px', borderRadius: 7 }}>
                <span style={{ color: 'var(--beam)', display: 'flex' }}>{ic}</span>{t}
              </span>
            ))}
          </div>
        </div>

        {/* conversation */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 8px' }}>
          {/* welcome */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, animation: 'fadeUp .4s ease both' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ink-800)', display: 'grid',
              placeItems: 'center', flex: 'none', border: '1px solid var(--line-dark)' }}>
              <Icons.spark size={15} style={{ color: 'var(--beam)' }} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink-on-dark)', lineHeight: 1.55 }}>
                Hi {firstName} — I'm your Dioschub assistant, working inside Cadence with <b>your exact permissions</b>.
                I can see your <b>{accessibleBoards.length}</b> board{accessibleBoards.length !== 1 && 's'} — nothing you can't.
              </div>
            </div>
          </div>

          {/* messages */}
          {msgs.map((m, i) => m.who === 'user' ? (
            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <div style={{ maxWidth: '82%', background: 'var(--beam-soft)', color: '#fff', fontSize: 13.5,
                lineHeight: 1.5, padding: '9px 13px', borderRadius: '14px 14px 4px 14px', animation: 'fadeUp .25s ease both' }}>
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ink-800)', display: 'grid',
                placeItems: 'center', flex: 'none', border: '1px solid var(--line-dark)' }}>
                <Icons.spark size={15} style={{ color: 'var(--beam)' }} />
              </span>
              <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink-on-dark)', lineHeight: 1.55,
                animation: 'fadeUp .25s ease both' }} dangerouslySetInnerHTML={{ __html: m.text }} />
            </div>
          ))}
          {typing && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ink-800)', display: 'grid',
                placeItems: 'center', flex: 'none', border: '1px solid var(--line-dark)' }}>
                <Icons.spark size={15} style={{ color: 'var(--beam)' }} />
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 24 }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ink-on-dark-3)',
                    animation: 'beamPulse 1s ease-in-out infinite', animationDelay: `${d * 0.16}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* suggestions */}
        {msgs.length === 0 && (
          <div style={{ flex: 'none', padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-on-dark-2)',
                background: 'var(--ink-800)', border: '1px solid var(--line-dark)', padding: '6px 11px', borderRadius: 99,
                transition: '.12s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--beam-soft)'; e.currentTarget.style.color = 'var(--ink-on-dark)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-dark)'; e.currentTarget.style.color = 'var(--ink-on-dark-2)'; }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* input */}
        <div style={{ flex: 'none', padding: '12px 16px 14px', borderTop: '1px solid var(--line-dark)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--ink-850)',
            border: '1px solid var(--line-dark)', borderRadius: 13, padding: '7px 7px 7px 13px' }}>
            <textarea ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(val); } }}
              placeholder={`Ask anything, as ${firstName}…`} rows={1}
              style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', color: 'var(--ink-on-dark)',
                fontSize: 13.5, outline: 'none', maxHeight: 90, lineHeight: 1.45, padding: '5px 0' }} />
            <button onClick={() => send(val)} disabled={!val.trim()} style={{ width: 34, height: 34, borderRadius: 9,
              background: val.trim() ? 'var(--beam-soft)' : 'var(--ink-800)', display: 'grid', placeItems: 'center',
              flex: 'none', transition: '.14s', color: val.trim() ? '#fff' : 'var(--ink-on-dark-3)' }}>
              <Icons.send size={17} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10.5,
            color: 'var(--ink-on-dark-3)' }}>
            <Icons.shield size={12} style={{ color: 'var(--ink-on-dark-3)' }} />
            Dioschub never sees your credentials. Every action is logged as you.
          </div>
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { AssistantPanel });
