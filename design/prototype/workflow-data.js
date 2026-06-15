/* Cadence — workflow layer. Decorates window.CADENCE_DATA in place (loaded after data.js).
 *
 * Adds per-board:
 *   board.roles            { roleId: { id, name, color } }      — project-scoped roles, designed by admins
 *   board.roleAssignments  { userId: roleId }
 *   board.workflow = {
 *     nodes:       { listId: { x, y } }                          — designer canvas positions
 *     edges:       [{ from: listId, to: listId }]                — documentation of the flow (not enforced)
 *     permissions: { listId: { roleId: { pick, drop, work } } }  — ENFORCED on the board
 *     tracking:    { roleId: [listId] }                          — where each role may track time
 *   }
 * Adds per-card: card.timeEntries [{ id, userId, roleId, listId, minutes, at, manual }]
 */
(function () {
  const D = window.CADENCE_DATA;
  const TODAY = new Date(D.today);
  const day = 86400000;
  const rel = (n) => new Date(TODAY.getTime() + n * day).toISOString();
  const P = (pick, drop, work) => ({ pick: !!pick, drop: !!drop, work: !!work });
  const ALL = P(1, 1, 1);

  // ===== Sprint 24 · Engineering — full delivery pipeline =====================
  const sp = D.boards.b_sprint;
  sp.subtitle = 'Two-week cycle · ends Jun 19 · workflow-backed';
  sp.lists = [
    { id: 'l_s_backlog', name: 'Backlog' },
    { id: 'l_s_todo', name: 'Pending Dev' },
    { id: 'l_s_doing', name: 'Development' },
    { id: 'l_s_clar', name: 'Clarification' },
    { id: 'l_s_stage', name: 'Staging' },
    { id: 'l_s_review', name: 'Testing' },
    { id: 'l_s_done', name: 'Done' },
  ];
  sp.roles = {
    r_lead: { id: 'r_lead', name: 'Lead', color: '#4B3FE4' },
    r_dev: { id: 'r_dev', name: 'Developer', color: '#3FA66A' },
    r_ba: { id: 'r_ba', name: 'Design / BA', color: '#8A5BD6' },
    r_qa: { id: 'r_qa', name: 'QA', color: '#E0A33E' },
  };
  sp.roleAssignments = { u_sarah: 'r_lead', u_tom: 'r_dev', u_priya: 'r_ba' };
  sp.workflow = {
    nodes: {
      l_s_backlog: { x: 40, y: 150 },
      l_s_todo: { x: 280, y: 150 },
      l_s_doing: { x: 520, y: 150 },
      l_s_clar: { x: 520, y: 340 },
      l_s_stage: { x: 760, y: 150 },
      l_s_review: { x: 1000, y: 150 },
      l_s_done: { x: 1240, y: 150 },
    },
    edges: [
      { from: 'l_s_backlog', to: 'l_s_todo' },
      { from: 'l_s_todo', to: 'l_s_doing' },
      { from: 'l_s_doing', to: 'l_s_clar' },
      { from: 'l_s_clar', to: 'l_s_doing' },
      { from: 'l_s_doing', to: 'l_s_stage' },
      { from: 'l_s_stage', to: 'l_s_review' },
      { from: 'l_s_review', to: 'l_s_done' },
      { from: 'l_s_review', to: 'l_s_todo' },
    ],
    permissions: {
      l_s_backlog: { r_lead: ALL, r_ba: P(1, 1, 1) },
      l_s_todo:    { r_lead: ALL, r_ba: P(0, 1, 0), r_dev: P(1, 0, 0), r_qa: P(0, 1, 0) },
      l_s_doing:   { r_lead: ALL, r_dev: P(1, 1, 1) },
      l_s_clar:    { r_lead: ALL, r_dev: P(0, 1, 0), r_ba: P(1, 1, 1) },
      l_s_stage:   { r_lead: ALL, r_dev: P(0, 1, 0), r_qa: P(1, 0, 0) },
      l_s_review:  { r_lead: ALL, r_qa: P(1, 1, 1) },
      l_s_done:    { r_lead: ALL, r_qa: P(0, 1, 0) },
    },
    tracking: {
      r_lead: ['l_s_backlog', 'l_s_todo', 'l_s_doing', 'l_s_clar', 'l_s_stage', 'l_s_review', 'l_s_done'],
      r_dev: ['l_s_doing'],
      r_ba: ['l_s_clar'],
      r_qa: ['l_s_review'],
    },
  };

  // ===== Bug Triage — lead/dev split ==========================================
  const bg = D.boards.b_bugs;
  bg.roles = {
    r_blead: { id: 'r_blead', name: 'Triage Lead', color: '#E05A4F' },
    r_bdev: { id: 'r_bdev', name: 'Developer', color: '#3FA66A' },
  };
  bg.roleAssignments = { u_sarah: 'r_blead', u_tom: 'r_bdev' };
  bg.workflow = {
    nodes: {
      l_b_new: { x: 40, y: 150 }, l_b_triaged: { x: 280, y: 150 },
      l_b_fixing: { x: 520, y: 150 }, l_b_verify: { x: 760, y: 150 },
    },
    edges: [
      { from: 'l_b_new', to: 'l_b_triaged' },
      { from: 'l_b_triaged', to: 'l_b_fixing' },
      { from: 'l_b_fixing', to: 'l_b_verify' },
      { from: 'l_b_verify', to: 'l_b_fixing' },
    ],
    permissions: {
      l_b_new:     { r_blead: ALL },
      l_b_triaged: { r_blead: ALL, r_bdev: P(1, 0, 0) },
      l_b_fixing:  { r_blead: ALL, r_bdev: P(1, 1, 1) },
      l_b_verify:  { r_blead: ALL, r_bdev: P(0, 1, 0) },
    },
    tracking: {
      r_blead: ['l_b_new', 'l_b_triaged', 'l_b_fixing', 'l_b_verify'],
      r_bdev: ['l_b_fixing'],
    },
  };

  // ===== Default workflow for every other board ===============================
  // Single "Contributor" role, full permissions, linear flow — the board behaves
  // exactly as before until an admin shapes it in the designer.
  function ensureWorkflow(board) {
    if (board.workflow) return board;
    const rid = 'r_all';
    board.roles = { [rid]: { id: rid, name: 'Contributor', color: board.accent } };
    board.roleAssignments = {};
    board.memberIds.forEach((uid) => { board.roleAssignments[uid] = rid; });
    const nodes = {}, edges = [], permissions = {};
    board.lists.forEach((l, i) => {
      nodes[l.id] = { x: 40 + i * 240, y: 150 };
      permissions[l.id] = { [rid]: P(1, 1, 1) };
      if (i > 0) edges.push({ from: board.lists[i - 1].id, to: l.id });
    });
    board.workflow = { nodes, edges, permissions, tracking: { [rid]: board.lists.map((l) => l.id) } };
    return board;
  }
  Object.values(D.boards).forEach(ensureWorkflow);

  // ===== Redistribute a few sprint cards into the new stages ==================
  const byTitle = (t) => D.cards.find((c) => c.title === t);
  const moveTo = (t, lid) => { const c = byTitle(t); if (c) c.listId = lid; };
  moveTo('Keyboard shortcuts overlay', 'l_s_clar');
  moveTo('Drag-and-drop on touch devices', 'l_s_stage');

  // ===== Seed time entries ====================================================
  D.cards.forEach((c) => { c.timeEntries = c.timeEntries || []; });
  let _te = 0;
  const logT = (title, userId, roleId, listId, minutes, atDays, manual) => {
    const c = byTitle(title); if (!c) return;
    c.timeEntries.push({ id: 'te_' + (++_te), userId, roleId, listId, minutes, at: rel(atDays), manual: !!manual });
  };
  logT('Real-time presence on cards', 'u_tom', 'r_dev', 'l_s_doing', 190, -0.3);
  logT('Real-time presence on cards', 'u_priya', 'r_ba', 'l_s_clar', 85, -1.2, true);
  logT('Fix crash on rapid board switch', 'u_tom', 'r_dev', 'l_s_doing', 160, -0.6);
  logT('Permission-scoped search', 'u_tom', 'r_dev', 'l_s_doing', 245, -2.1);
  logT('Permission-scoped search', 'u_sarah', 'r_lead', 'l_s_review', 45, -0.4, true);
  logT('Keyboard shortcuts overlay', 'u_priya', 'r_ba', 'l_s_clar', 50, -0.8);
  logT('Drag-and-drop on touch devices', 'u_tom', 'r_dev', 'l_s_doing', 90, -1.4);
  logT('Drag ghost stuck after drop', 'u_tom', 'r_bdev', 'l_b_fixing', 75, -0.5);

  // ===== Helpers (exported) ===================================================
  function wfRole(board, userId) {
    const rid = board.roleAssignments && board.roleAssignments[userId];
    return (rid && board.roles && board.roles[rid]) || null;
  }
  // verb: 'pick' (take cards out) | 'drop' (move cards in) | 'work' (act on cards here)
  function wfCan(board, user, listId, verb) {
    if (user.role === 'admin') return true; // workspace admins bypass stage gates
    const rid = board.roleAssignments && board.roleAssignments[user.id];
    const lp = rid && board.workflow.permissions[listId];
    const p = lp && lp[rid];
    return !!(p && p[verb]);
  }
  function wfCanTrack(board, user, listId) {
    const rid = board.roleAssignments && board.roleAssignments[user.id];
    if (!rid) return user.role === 'admin';
    return (board.workflow.tracking[rid] || []).includes(listId);
  }
  function wfListRelevant(board, user, listId) {
    return wfCan(board, user, listId, 'pick') || wfCan(board, user, listId, 'drop') ||
      wfCan(board, user, listId, 'work') || wfCanTrack(board, user, listId);
  }
  function fmtMins(m) {
    m = Math.round(m);
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60), r = m % 60;
    return r ? h + 'h ' + String(r).padStart(2, '0') + 'm' : h + 'h';
  }
  function parseDuration(s) {
    s = (s || '').trim().toLowerCase();
    if (!s) return null;
    let m = 0, ok = false;
    const h = s.match(/(\d+(?:\.\d+)?)\s*h/);
    if (h) { m += parseFloat(h[1]) * 60; ok = true; }
    const mm = s.match(/(\d+)\s*m/);
    if (mm) { m += parseInt(mm[1], 10); ok = true; }
    if (!ok && /^\d+(\.\d+)?$/.test(s)) { m = parseFloat(s); ok = true; } // bare number = minutes
    return ok ? Math.round(m) : null;
  }
  function cardTrackedMins(card) {
    return (card.timeEntries || []).reduce((s, e) => s + e.minutes, 0);
  }

  Object.assign(window, { wfRole, wfCan, wfCanTrack, wfListRelevant, ensureWorkflow, fmtMins, parseDuration, cardTrackedMins });
})();
