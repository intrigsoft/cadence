/* App shell: Sidebar (dark, permission-scoped), TopBar, PersonaSwitcher, Toaster */

function Wordmark({ small }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--beam)',
        display: 'grid', placeItems: 'center', boxShadow: '0 2px 10px rgba(140,125,255,.45)' }}>
        <span style={{ width: 11, height: 11, borderRadius: 3, background: '#fff',
          transform: 'rotate(12deg)', boxShadow: 'inset 0 0 0 2.5px var(--beam-soft)' }} />
      </span>
      {!small && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19,
        letterSpacing: '-.01em', color: 'var(--ink-on-dark)' }}>Cadence</span>}
    </div>
  );
}

function Sidebar({ data, currentUser, boards, activeBoardId, view, onNavigate, onNewBoard }) {
  const ws = data.workspace;
  return (
    <aside className="on-dark" style={{ width: 'var(--sidebar-w)', flex: 'none', background: 'var(--ink-900)',
      borderRight: '1px solid var(--line-dark)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* workspace header */}
      <div style={{ padding: '15px 16px 14px', borderBottom: '1px solid var(--line-dark)' }}>
        <Wordmark />
        <button onClick={() => onNavigate({ type: 'home' })} style={{ marginTop: 14, width: '100%',
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 9px', borderRadius: 10,
          background: 'var(--ink-800)', border: '1px solid var(--line-dark)', textAlign: 'left' }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#4B3FE4,#0E8C7F)',
            display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>N</span>
          <span style={{ lineHeight: 1.1 }}>
            <div style={{ color: 'var(--ink-on-dark)', fontWeight: 700, fontSize: 14 }}>{ws.name}</div>
            <div style={{ color: 'var(--ink-on-dark-3)', fontSize: 11.5 }}>{ws.plan} plan</div>
          </span>
        </button>
      </div>

      {/* nav */}
      <nav style={{ padding: '12px 10px', overflowY: 'auto', flex: 1 }}>
        <NavItem icon={<Icons.grid size={17} />} label="All boards"
          active={view === 'home'} onClick={() => onNavigate({ type: 'home' })} />
        <NavItem icon={<Icons.user size={17} />} label="My cards"
          active={view === 'mycards'} onClick={() => onNavigate({ type: 'mycards' })} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 9px 7px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            color: 'var(--ink-on-dark-3)' }}>Your boards</span>
          <button onClick={onNewBoard} title="New board" style={{ width: 22, height: 22, borderRadius: 6,
            display: 'grid', placeItems: 'center', color: 'var(--ink-on-dark-2)', transition: '.12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244,241,234,.08)'; e.currentTarget.style.color = 'var(--beam)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-on-dark-2)'; }}>
            <Icons.plus size={16} />
          </button>
        </div>
        {boards.map((b) => (
          <button key={b.id} onClick={() => onNavigate({ type: 'board', boardId: b.id })}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 9px',
              borderRadius: 9, marginBottom: 1, textAlign: 'left',
              background: activeBoardId === b.id ? 'var(--ink-800)' : 'transparent',
              transition: '.12s' }}
            onMouseEnter={(e) => { if (activeBoardId !== b.id) e.currentTarget.style.background = 'rgba(244,241,234,.05)'; }}
            onMouseLeave={(e) => { if (activeBoardId !== b.id) e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: b.accent, flex: 'none',
              boxShadow: activeBoardId === b.id ? `0 0 0 3px ${b.accent}33` : 'none' }} />
            <span style={{ color: activeBoardId === b.id ? 'var(--ink-on-dark)' : 'var(--ink-on-dark-2)',
              fontSize: 13.5, fontWeight: activeBoardId === b.id ? 600 : 500, flex: 1, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
            {b.visibility === 'private' && <Icons.lock size={13} style={{ color: 'var(--ink-on-dark-3)', flex: 'none' }} />}
          </button>
        ))}
      </nav>

      {/* dioschub footer badge */}
      <div style={{ padding: 12, borderTop: '1px solid var(--line-dark)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 10,
          background: 'var(--ink-850)', border: '1px solid var(--line-dark)' }}>
          <Icons.shieldDot size={16} style={{ color: 'var(--beam)', flex: 'none' }} />
          <span style={{ lineHeight: 1.15, flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-on-dark-2)' }}>Secured by Dioschub</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-on-dark-3)', fontFamily: 'var(--font-mono)' }}>credential-blind layer</div>
          </span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11,
      padding: '8px 9px', borderRadius: 9, marginBottom: 1, textAlign: 'left',
      color: active ? 'var(--ink-on-dark)' : 'var(--ink-on-dark-2)',
      background: active ? 'var(--ink-800)' : 'transparent', fontSize: 13.5, fontWeight: active ? 600 : 500,
      transition: '.12s' }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(244,241,234,.05)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <span style={{ color: active ? 'var(--beam)' : 'var(--ink-on-dark-3)', display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
}

// ---- TopBar -----------------------------------------------------------------
function TopBar({ data, currentUser, crumb, onSearch, query, assistantOpen, onToggleAssistant, onSwitchPersona, onLogout }) {
  return (
    <header style={{ height: 'var(--topbar-h)', flex: 'none', display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 18px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', position: 'relative', zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {crumb}
      </div>

      <div style={{ flex: 1 }} />

      {/* search */}
      <div style={{ position: 'relative', width: 264, maxWidth: '32vw' }}>
        <Icons.search size={16} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ink-3)' }} />
        <input value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Search cards…"
          style={{ width: '100%', height: 38, padding: '0 12px 0 34px', borderRadius: 10, border: '1px solid var(--line-2)',
            background: 'var(--canvas)', fontSize: 13.5, color: 'var(--ink)', outline: 'none' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--brand)'; e.target.style.background = 'var(--surface)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--line-2)'; e.target.style.background = 'var(--canvas)'; }} />
      </div>

      <button className="btn btn-ghost" style={{ width: 38, padding: 0, justifyContent: 'center' }} title="Notifications">
        <Icons.bell size={19} />
      </button>

      <AccountMenu data={data} currentUser={currentUser} onSwitchPersona={onSwitchPersona} onLogout={onLogout} />

      {/* assistant toggle */}
      <button onClick={onToggleAssistant} className="focusable" style={{ display: 'flex', alignItems: 'center', gap: 9,
        height: 38, padding: '0 14px 0 11px', borderRadius: 10, fontWeight: 600, fontSize: 13.5,
        background: assistantOpen ? 'var(--ink-900)' : 'var(--ink-850)', color: 'var(--ink-on-dark)',
        boxShadow: assistantOpen ? 'inset 0 0 0 1px var(--beam)' : '0 1px 3px rgba(26,24,20,.18)', transition: '.15s' }}>
        <Icons.spark size={17} style={{ color: 'var(--beam)' }} />
        Assistant
      </button>
    </header>
  );
}

// ---- Account menu (real product: identity from login/SSO) -------------------
function AccountMenu({ data, currentUser, onSwitchPersona, onLogout }) {
  const [open, setOpen] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowSwitch(false); } };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const accessCount = (u) => Object.values(data.boards).filter((b) => b.memberIds.includes(u.id)).length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} className="focusable" title={currentUser.email}
        style={{ display: 'flex', alignItems: 'center', gap: 9, height: 38, padding: '0 9px 0 6px', borderRadius: 999,
          border: '1px solid var(--line-2)', background: open ? 'var(--canvas)' : 'var(--surface)', transition: '.12s' }}>
        <Avatar user={currentUser} size={28} />
        <span style={{ lineHeight: 1.05, textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{currentUser.name.split(' ')[0]}</span>
          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-3)' }}>{({ admin: 'Admin', member: 'Member', guest: 'Guest' })[currentUser.role]}</span>
        </span>
        <Icons.chevDown size={15} style={{ color: 'var(--ink-3)' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 46, right: 0, width: 300, background: 'var(--surface)',
          borderRadius: 14, boxShadow: 'var(--shadow-pop)', border: '1px solid var(--line)', padding: 8, zIndex: 60,
          animation: 'scaleIn .14s ease', transformOrigin: 'top right' }}>
          {/* signed-in identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 9px 12px' }}>
            <Avatar user={currentUser} size={42} />
            <div style={{ minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{currentUser.name}</span>
                <RoleBadge role={currentUser.role} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{currentUser.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10,
            background: 'var(--brand-tint)', marginBottom: 6 }}>
            <Icons.shieldDot size={15} style={{ color: 'var(--brand)', flex: 'none' }} />
            <span style={{ fontSize: 11.5, color: 'var(--brand-700)', lineHeight: 1.4 }}>
              Signed in via SSO. The assistant operates as you across <b>{accessCount(currentUser)} boards</b>.
            </span>
          </div>

          <MenuRow icon={<Icons.settings size={17} />} label="Account settings" />
          <MenuRow icon={<Icons.logout size={17} />} label="Sign out" onClick={onLogout} />

          {/* sandbox-only quick switch */}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 8 }}>
            <button onClick={() => setShowSwitch((s) => !s)} style={{ width: '100%', display: 'flex', alignItems: 'center',
              gap: 8, padding: '7px 9px', borderRadius: 9, textAlign: 'left' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase',
                color: '#9A6512', background: '#FBEBD6', padding: '2px 6px', borderRadius: 5 }}>Sandbox</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>Switch demo identity</span>
              <Icons.chevDown size={15} style={{ color: 'var(--ink-3)', transform: showSwitch ? 'rotate(180deg)' : 'none',
                transition: '.15s' }} />
            </button>
            {showSwitch && (
              <div style={{ marginTop: 4 }}>
                {data.personaOrder.filter((uid) => uid !== currentUser.id).map((uid) => {
                  const u = data.users[uid];
                  return (
                    <button key={u.id} onClick={() => { onSwitchPersona(u.id); setOpen(false); setShowSwitch(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 9px',
                        borderRadius: 9, textAlign: 'left' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <Avatar user={u} size={28} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{u.name}</span>
                          <RoleBadge role={u.role} />
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{accessCount(u)} boards</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px',
      borderRadius: 9, textAlign: 'left', color: 'var(--ink)', fontSize: 13.5, fontWeight: 500 }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      <span style={{ color: 'var(--ink-3)', display: 'flex' }}>{icon}</span>{label}
    </button>
  );
}

function RoleBadge({ role }) {
  const map = {
    admin: { bg: 'var(--brand-100)', fg: 'var(--brand-700)', t: 'Admin' },
    member: { bg: '#DDF1EA', fg: '#0B6B60', t: 'Member' },
    guest: { bg: '#EDEAE0', fg: '#6B6760', t: 'Guest' },
  };
  const m = map[role] || map.guest;
  return <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase',
    padding: '2px 7px', borderRadius: 6, background: m.bg, color: m.fg }}>{m.t}</span>;
}

// ---- Toaster ----------------------------------------------------------------
function Toaster({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
      display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', pointerEvents: 'none' }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px 11px 13px',
          borderRadius: 12, background: 'var(--ink-900)', color: 'var(--ink-on-dark)', boxShadow: 'var(--shadow-pop)',
          animation: 'toastIn .22s cubic-bezier(.2,.9,.3,1)', maxWidth: 460 }}>
          <span style={{ color: t.tone === 'deny' ? '#FF8A7A' : t.tone === 'warn' ? '#E8B45A' : 'var(--beam)', display: 'flex', flex: 'none' }}>
            {t.tone === 'deny' ? <Icons.lock size={18} /> : t.tone === 'warn' ? <Icons.timer size={18} /> : <Icons.shield size={18} />}
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: t.text }} />
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Sidebar, TopBar, AccountMenu, RoleBadge, Toaster, Wordmark });
