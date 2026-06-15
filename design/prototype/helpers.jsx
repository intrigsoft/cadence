/* Shared helpers: icons, Avatar, small utilities. Exported to window. */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const cx = (...a) => a.filter(Boolean).join(' ');

// ---- Icons (stroke, 1.7) ----------------------------------------------------
const Ic = ({ d, size = 18, fill, sw = 1.7, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'}
    stroke={fill ? 'none' : 'currentColor'} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  search: (p) => <Ic {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Ic>,
  plus: (p) => <Ic d="M12 5v14M5 12h14" {...p} />,
  chevDown: (p) => <Ic d="M6 9l6 6 6-6" {...p} />,
  chevRight: (p) => <Ic d="M9 6l6 6-6 6" {...p} />,
  chevLeft: (p) => <Ic d="M15 6l-6 6 6 6" {...p} />,
  lock: (p) => <Ic {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Ic>,
  grid: (p) => <Ic {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></Ic>,
  columns: (p) => <Ic {...p}><rect x="4" y="4" width="4.5" height="16" rx="1.5" /><rect x="10" y="4" width="4.5" height="11" rx="1.5" /><rect x="16" y="4" width="4.5" height="14" rx="1.5" /></Ic>,
  clock: (p) => <Ic {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></Ic>,
  check: (p) => <Ic d="M5 12.5l4.5 4.5L19 7" {...p} />,
  checkSquare: (p) => <Ic {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 12l2.5 2.5L16 9" /></Ic>,
  square: (p) => <Ic {...p}><rect x="4" y="4" width="16" height="16" rx="3" /></Ic>,
  message: (p) => <Ic d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V6a1 1 0 0 1 1-1z" {...p} />,
  shield: (p) => <Ic {...p}><path d="M12 3l7 2.5v5c0 4.6-3 7.8-7 9.5-4-1.7-7-4.9-7-9.5v-5L12 3z" /><path d="M9 12l2 2 4-4" /></Ic>,
  shieldDot: (p) => <Ic {...p}><path d="M12 3l7 2.5v5c0 4.6-3 7.8-7 9.5-4-1.7-7-4.9-7-9.5v-5L12 3z" /><circle cx="12" cy="11.5" r="1.4" fill="currentColor" stroke="none" /></Ic>,
  x: (p) => <Ic d="M6 6l12 12M18 6L6 18" {...p} />,
  dots: (p) => <Ic {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></Ic>,
  calendar: (p) => <Ic {...p}><rect x="4" y="5" width="16" height="16" rx="2.5" /><path d="M4 9h16M8 3v4M16 3v4" /></Ic>,
  user: (p) => <Ic {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></Ic>,
  users: (p) => <Ic {...p}><circle cx="9" cy="9" r="3" /><path d="M3.5 18.5a5.5 5.5 0 0 1 11 0" /><path d="M16 6.2a3 3 0 0 1 0 5.6M16.5 18.5a5.5 5.5 0 0 0-2-4.3" /></Ic>,
  send: (p) => <Ic d="M5 12l14-7-5 16-3.5-6.5L5 12z" {...p} />,
  sidebar: (p) => <Ic {...p}><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="M10 5v14" /></Ic>,
  bell: (p) => <Ic {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 19a2 2 0 0 0 4 0" /></Ic>,
  align: (p) => <Ic d="M5 7h14M5 12h10M5 17h7" {...p} />,
  tag: (p) => <Ic {...p}><path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7l7.5 7.5a1.5 1.5 0 0 1 0 2.1l-5.4 5.4a1.5 1.5 0 0 1-2.1 0L4 12.5z" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" /></Ic>,
  link: (p) => <Ic {...p}><path d="M9 15l6-6" /><path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1" /></Ic>,
  logout: (p) => <Ic {...p}><path d="M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" /><path d="M16 8l4 4-4 4M9 12h11" /></Ic>,
  settings: (p) => <Ic {...p}><circle cx="12" cy="12" r="3" /><path d="M19 13.5a7.5 7.5 0 0 0 0-3l1.6-1.2-1.5-2.6-1.9.7a7.4 7.4 0 0 0-2.6-1.5L14 2h-3l-.4 2.4a7.4 7.4 0 0 0-2.6 1.5l-1.9-.7L4.6 7.8 6.2 9a7.5 7.5 0 0 0 0 3l-1.6 1.2 1.5 2.6 1.9-.7a7.4 7.4 0 0 0 2.6 1.5L11 21h3l.4-2.4a7.4 7.4 0 0 0 2.6-1.5l1.9.7 1.5-2.6-1.4-1.2z" /></Ic>,
  dragDots: (p) => <Ic {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" /></Ic>,
  spark: (p) => <Ic {...p}><path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7L12 3.5z" /><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" /></Ic>,
  arrowRight: (p) => <Ic d="M5 12h14M13 6l6 6-6 6" {...p} />,
  timer: (p) => <Ic {...p}><circle cx="12" cy="13.5" r="7" /><path d="M12 10.5v3l2 1.5M9.5 3h5M12 3v3.5" /></Ic>,
  play: (p) => <Ic {...p}><path d="M8.5 5.5l10 6.5-10 6.5z" /></Ic>,
  stopSq: (p) => <Ic {...p}><rect x="7" y="7" width="10" height="10" rx="2" /></Ic>,
  flow: (p) => <Ic {...p}><rect x="3" y="9" width="6" height="6" rx="2" /><rect x="15" y="3" width="6" height="6" rx="2" /><rect x="15" y="15" width="6" height="6" rx="2" /><path d="M9 12c3 0 3-6 6-6M9 12c3 0 3 6 6 6" /></Ic>,
  chart: (p) => <Ic {...p}><path d="M4 20h16" /><path d="M7.5 20v-7M12 20V6M16.5 20v-10" /></Ic>,
  target: (p) => <Ic {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></Ic>,
  pause: (p) => <Ic d="M9 5.5v13M15 5.5v13" sw={2.2} {...p} />,
};

// ---- Avatar -----------------------------------------------------------------
function Avatar({ user, size = 26, ring = 'light', title }) {
  if (!user) return null;
  return (
    <span className={cx('avatar', ring === 'dark' && 'ring-dark')} title={title || user.name}
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.4 }}>
      {user.initials}
    </span>
  );
}

function AvatarStack({ users, size = 26, max = 4, ring = 'light' }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((u, i) => (
        <span key={u.id} style={{ marginLeft: i ? -8 : 0, zIndex: shown.length - i }}>
          <Avatar user={u} size={size} ring={ring} />
        </span>
      ))}
      {extra > 0 && (
        <span className="avatar" style={{ marginLeft: -8, width: size, height: size, fontSize: size * 0.36,
          background: '#C9C4B8', color: '#56524B' }}>+{extra}</span>
      )}
    </div>
  );
}

// ---- Date helpers -----------------------------------------------------------
const TODAY = new Date('2026-06-10T09:00:00');
function dueMeta(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const days = Math.round((d - TODAY) / (24 * 3600 * 1000));
  const opts = { month: 'short', day: 'numeric' };
  const label = d.toLocaleDateString('en-US', opts);
  let tone = 'normal', text = label;
  if (days < 0) { tone = 'over'; text = `${label}`; }
  else if (days === 0) { tone = 'today'; text = 'Today'; }
  else if (days === 1) { tone = 'soon'; text = 'Tomorrow'; }
  else if (days <= 3) { tone = 'soon'; }
  return { tone, text, days };
}
function timeAgo(iso) {
  const d = new Date(iso);
  const mins = Math.round((TODAY - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

Object.assign(window, { React, useState, useEffect, useRef, useMemo, useCallback, cx, Icons, Avatar, AvatarStack, dueMeta, timeAgo });
