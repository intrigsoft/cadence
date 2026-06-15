/* Login screen — the product-true entry point.
   Real products get identity from SSO / the host session; for the public
   sandbox we stand that in with a "choose a demo identity" picker. */

function Login({ data, onLogin }) {
  const [email, setEmail] = useState('');
  const [hover, setHover] = useState(null);

  const accessCount = (u) => Object.values(data.boards).filter((b) => b.memberIds.includes(u.id)).length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--canvas)' }}>
      {/* left — brand / BYOA story (dark ink, like the assistant) */}
      <div className="on-dark grain" style={{ width: '42%', minWidth: 380, flex: 'none', position: 'relative',
        background: 'var(--ink-900)', color: 'var(--ink-on-dark)', display: 'flex', flexDirection: 'column',
        padding: '44px 48px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(140,125,255,.22), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Wordmark />
        </div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 99,
            background: 'var(--ink-800)', border: '1px solid var(--line-dark)', marginBottom: 22 }}>
            <Icons.shieldDot size={14} style={{ color: 'var(--beam)' }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-on-dark-2)' }}>Secured by Dioschub</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 33, fontWeight: 600, lineHeight: 1.12,
            letterSpacing: '-.02em', margin: 0, color: 'var(--ink-on-dark)' }}>
            You bring the identity.<br />We inherit the permissions.
          </h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-on-dark-2)', marginTop: 16, maxWidth: 380 }}>
            Cadence — and its embedded assistant — act with <b style={{ color: 'var(--ink-on-dark)' }}>your exact access</b>.
            Sign in once; everything you and the assistant do is scoped to your role and logged under your name.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26 }}>
            {[['Credential-blind', 'The assistant never sees or stores your password.'],
              ['Permission-scoped', 'You only ever see the boards your role permits.'],
              ['Fully audited', 'Every action is attributed to the signed-in user.']].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--ink-800)', flex: 'none',
                  display: 'grid', placeItems: 'center', marginTop: 1, border: '1px solid var(--line-dark)' }}>
                  <Icons.check size={13} style={{ color: 'var(--beam)' }} />
                </span>
                <span style={{ lineHeight: 1.35 }}>
                  <b style={{ fontSize: 13.5, color: 'var(--ink-on-dark)' }}>{t}</b>
                  <span style={{ fontSize: 13, color: 'var(--ink-on-dark-3)' }}> — {d}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, fontSize: 11.5, color: 'var(--ink-on-dark-3)', marginTop: 40 }}>
          © Northwind · Powered by Intrigsoft
        </div>
      </div>

      {/* right — sign in */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px',
        overflowY: 'auto' }}>
        <div style={{ width: 'min(420px, 100%)', animation: 'fadeUp .5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#4B3FE4,#0E8C7F)',
              display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>N</span>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{data.workspace.name} workspace</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--ink)' }}>Sign in to Cadence</div>
            </div>
          </div>

          {/* realistic SSO + email (decorative — the real product path) */}
          <button className="btn" style={{ width: '100%', height: 46, justifyContent: 'center', marginTop: 22,
            background: 'var(--ink-900)', color: 'var(--ink-on-dark)', fontSize: 14, whiteSpace: 'nowrap' }}
            onClick={() => onLogin('u_sarah', 'sso')}>
            <Icons.shield size={18} style={{ color: 'var(--beam)' }} /> Continue with Northwind SSO
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />
          </div>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Work email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@northwind.io"
            style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 11, border: '1px solid var(--line-2)',
              fontSize: 14, color: 'var(--ink)', outline: 'none', background: 'var(--surface)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--line-2)'} />
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', margin: '14px 0 6px' }}>Password</label>
          <input type="password" placeholder="••••••••"
            style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 11, border: '1px solid var(--line-2)',
              fontSize: 14, color: 'var(--ink)', outline: 'none', background: 'var(--surface)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--line-2)'} />
          <button className="btn btn-primary" style={{ width: '100%', height: 46, justifyContent: 'center', marginTop: 16,
            opacity: 0.55, pointerEvents: 'none', whiteSpace: 'nowrap' }}>Sign in</button>

          {/* sandbox identity picker */}
          <div style={{ marginTop: 30, padding: 16, borderRadius: 14, background: 'var(--surface)',
            border: '1px solid var(--line)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
                color: '#9A6512', background: '#FBEBD6', padding: '2px 7px', borderRadius: 6 }}>Sandbox</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Sign in as a sample user</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '0 0 12px', lineHeight: 1.5 }}>
              In production this is your real SSO login. Here, pick an identity to explore — watch how access
              and the assistant's scope change with each role.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.personaOrder.map((uid) => {
                const u = data.users[uid];
                return (
                  <button key={u.id} onClick={() => onLogin(u.id, 'demo')}
                    onMouseEnter={() => setHover(u.id)} onMouseLeave={() => setHover(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 11,
                      textAlign: 'left', border: '1px solid', borderColor: hover === u.id ? 'var(--brand)' : 'var(--line)',
                      background: hover === u.id ? 'var(--brand-tint)' : 'var(--canvas)', transition: '.12s' }}>
                    <Avatar user={u} size={34} />
                    <div style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{u.name}</span>
                        <RoleBadge role={u.role} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email} · {accessCount(u)} boards
                      </div>
                    </div>
                    <Icons.arrowRight size={17} style={{ color: hover === u.id ? 'var(--brand)' : 'var(--ink-3)', flex: 'none' }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Login });
