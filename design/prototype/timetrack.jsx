/* Time tracking: live timers, manual logging, card chips, and the board report.
   Eligibility is role × stage, defined in board.workflow.tracking. */

function useNowTick(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

const liveMins = (timer, now) => Math.max(0, Math.floor((now - timer.startedAt) / 60000));

// Small chip on card tiles
function TimeChip({ mins, running }) {
  return (
    <span title={running ? 'Timer running' : 'Tracked time'} style={{ display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 11.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
      background: running ? '#DDF1EA' : 'rgba(26,24,20,.05)', color: running ? '#0B6B60' : 'var(--ink-2)' }}>
      {running && <span style={{ width: 6, height: 6, borderRadius: 99, background: '#0B6B60',
        animation: 'beamPulse 1.6s ease-in-out infinite' }} />}
      <Icons.timer size={13} /> {fmtMins(mins)}
    </span>
  );
}

// Interactive play/pause chip for card tiles — shown where the user's role may track time.
// "Pause" stops the timer and logs the elapsed time as an entry.
function TimerChip({ mins, running, canTrack, onStart, onStop }) {
  const [hover, setHover] = useState(false);
  if (running) {
    return (
      <button title="Pause timer — logs the elapsed time"
        onClick={(e) => { e.stopPropagation(); onStop(); }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700,
          padding: '2px 8px', borderRadius: 6, cursor: 'pointer', transition: '.13s',
          background: hover ? '#C5E8DA' : '#DDF1EA', color: '#0B6B60' }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: '#0B6B60',
          animation: 'beamPulse 1.6s ease-in-out infinite' }} />
        <Icons.pause size={11} /> {fmtMins(mins)}
      </button>
    );
  }
  if (canTrack) {
    return (
      <button title="Start timer"
        onClick={(e) => { e.stopPropagation(); onStart(); }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700,
          padding: '2px 8px', borderRadius: 6, cursor: 'pointer', transition: '.13s',
          background: hover ? 'var(--brand-tint)' : 'rgba(26,24,20,.05)',
          color: hover ? 'var(--brand)' : 'var(--ink-2)' }}>
        <Icons.play size={11} /> {mins > 0 ? fmtMins(mins) : 'Track'}
      </button>
    );
  }
  return <TimeChip mins={mins} running={false} />;
}

// Body of the "Time" section in card detail
function TimeBody({ card, board, data, currentUser, runningTimer, onStart, onStop, onLog }) {
  const myRunning = runningTimer && runningTimer.cardId === card.id;
  const now = useNowTick(!!myRunning);
  const [logVal, setLogVal] = useState('');
  const canTrack = wfCanTrack(board, currentUser, card.listId);
  const role = wfRole(board, currentUser.id);
  const list = board.lists.find((l) => l.id === card.listId);
  const entries = [...(card.timeEntries || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
  const trackable = (role && board.workflow.tracking[role.id]) || [];
  const trackNames = trackable.map((lid) => (board.lists.find((l) => l.id === lid) || {}).name).filter(Boolean);

  const submitLog = () => {
    const mins = parseDuration(logVal);
    if (mins && mins > 0) { onLog(card.id, mins); setLogVal(''); }
  };

  return (
    <div>
      {/* controls */}
      {myRunning ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
          background: '#DDF1EA', border: '1px solid #BCE3D6' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: '#0B6B60',
            animation: 'beamPulse 1.6s ease-in-out infinite', flex: 'none' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0B6B60', flex: 1 }}>
            Timer running in {list ? list.name : 'this stage'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: '#0B6B60' }}>
            {fmtMins(liveMins(runningTimer, now))}
          </span>
          <button className="btn" onClick={() => onStop()} style={{ height: 30, background: '#0B6B60', color: '#fff',
            fontSize: 12.5 }}><Icons.stopSq size={14} /> Stop</button>
        </div>
      ) : canTrack ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-primary" style={{ height: 34 }} onClick={() => onStart(card.id)}>
            <Icons.play size={15} /> Start timer
          </button>
          <input value={logVal} onChange={(e) => setLogVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitLog(); }}
            placeholder="or log: 1h 30m"
            style={{ width: 130, height: 34, padding: '0 11px', borderRadius: 9, border: '1px solid var(--line-2)',
              fontSize: 13, color: 'var(--ink)', outline: 'none', background: 'var(--canvas)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--line-2)'} />
          <button className="btn btn-outline" style={{ height: 34 }} onClick={submitLog}>Log</button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, padding: '9px 12px', borderRadius: 10,
          background: 'var(--canvas)', border: '1px dashed var(--line-2)' }}>
          {role
            ? <>Time for <b style={{ color: 'var(--ink-2)' }}>{role.name}</b> is tracked in{' '}
                <b style={{ color: 'var(--ink-2)' }}>{trackNames.length ? trackNames.join(', ') : 'no stage yet'}</b> — not in {list ? list.name : 'this stage'}.</>
            : <>You don't have a role on this board, so time tracking isn't available.</>}
        </div>
      )}

      {/* entries */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {entries.map((e) => {
            const u = data.users[e.userId];
            const r = e.roleId && board.roles ? board.roles[e.roleId] : null;
            const l = board.lists.find((x) => x.id === e.listId);
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar user={u} size={26} />
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{u ? u.name : 'Unknown'}</span>
                {r && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                  color: 'var(--ink-2)', background: 'rgba(26,24,20,.05)', padding: '1px 7px', borderRadius: 99 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: r.color }} />{r.name}
                </span>}
                <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  in {l ? l.name : 'a removed stage'}{e.manual ? ' · logged manually' : ''} · {timeAgo(e.at)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                  {fmtMins(e.minutes)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Board-level time report --------------------------------------------------
function TimeReport({ board, cards, data }) {
  const members = board.memberIds.map((id) => data.users[id]);
  const lists = board.lists;
  const cell = {}; // userId|listId -> mins
  const userTotal = {}, listTotal = {};
  let grand = 0;
  cards.forEach((c) => (c.timeEntries || []).forEach((e) => {
    const k = e.userId + '|' + e.listId;
    cell[k] = (cell[k] || 0) + e.minutes;
    userTotal[e.userId] = (userTotal[e.userId] || 0) + e.minutes;
    listTotal[e.listId] = (listTotal[e.listId] || 0) + e.minutes;
    grand += e.minutes;
  }));
  const byCard = cards.map((c) => ({ c, mins: cardTrackedMins(c) })).filter((x) => x.mins > 0)
    .sort((a, b) => b.mins - a.mins);
  const maxCard = byCard.length ? byCard[0].mins : 1;

  const th = { fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
    color: 'var(--ink-3)', textAlign: 'right', padding: '8px 12px', whiteSpace: 'nowrap' };
  const td = { fontFamily: 'var(--font-mono)', fontSize: 12.5, textAlign: 'right', padding: '9px 12px',
    borderTop: '1px solid var(--line)', whiteSpace: 'nowrap' };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '30px 32px 60px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-.01em',
          margin: 0, color: 'var(--ink)' }}>Time report</h2>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '6px 0 22px' }}>
          {grand > 0 ? <>Total of <b>{fmtMins(grand)}</b> tracked on this board — by person and stage.</>
            : 'Nothing tracked yet. Timers and manual logs will land here.'}
        </p>

        {grand > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
            boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'left' }}>Member</th>
                    {lists.map((l) => <th key={l.id} style={th}>{l.name}</th>)}
                    <th style={{ ...th, color: 'var(--ink)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((u) => {
                    const role = wfRole(board, u.id);
                    return (
                      <tr key={u.id}>
                        <td style={{ ...td, fontFamily: 'var(--font-ui)', textAlign: 'left' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <Avatar user={u} size={26} />
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</span>
                            {role && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5,
                              fontWeight: 700, color: 'var(--ink-2)', background: 'rgba(26,24,20,.05)',
                              padding: '1px 7px', borderRadius: 99 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 99, background: role.color }} />{role.name}
                            </span>}
                          </span>
                        </td>
                        {lists.map((l) => {
                          const v = cell[u.id + '|' + l.id];
                          return <td key={l.id} style={{ ...td, color: v ? 'var(--ink)' : 'var(--line-2)' }}>{v ? fmtMins(v) : '·'}</td>;
                        })}
                        <td style={{ ...td, fontWeight: 700 }}>{userTotal[u.id] ? fmtMins(userTotal[u.id]) : '·'}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td style={{ ...td, fontFamily: 'var(--font-ui)', textAlign: 'left', fontWeight: 700, fontSize: 12 }}>All members</td>
                    {lists.map((l) => <td key={l.id} style={{ ...td, fontWeight: 700,
                      color: listTotal[l.id] ? 'var(--ink)' : 'var(--line-2)' }}>{listTotal[l.id] ? fmtMins(listTotal[l.id]) : '·'}</td>)}
                    <td style={{ ...td, fontWeight: 700, color: 'var(--brand)' }}>{fmtMins(grand)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {byCard.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase',
              color: 'var(--ink-3)', margin: '0 0 12px' }}>By card</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byCard.map(({ c, mins }) => {
                const l = lists.find((x) => x.id === c.listId);
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px',
                    borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)',
                    boxShadow: 'var(--shadow-card)' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', flex: '0 1 auto',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 140 }}>{c.title}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, flex: 'none' }}>{l ? l.name : ''}</span>
                    <span style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: Math.max(4, (mins / maxCard) * 100) + '%',
                        borderRadius: 99, background: board.accent }} />
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600,
                      color: 'var(--ink)', flex: 'none', width: 64, textAlign: 'right' }}>{fmtMins(mins)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { useNowTick, liveMins, TimeChip, TimerChip, TimeBody, TimeReport });
