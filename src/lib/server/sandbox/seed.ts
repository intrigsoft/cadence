// Faithful port of design/prototype/data.js + workflow-data.js.
//
// buildSeed() constructs a BRAND-NEW object graph on every call, so each
// device sandbox is fully isolated — no shared array/object references.
// This is the in-memory replacement for a database seed.

import type {
  Board,
  Card,
  Label,
  Role,
  StagePerm,
  User,
  Workspace,
  WorkspaceState
} from '../types';

// "Today" is anchored so seeded relative due-dates stay stable (matches the
// prototype + screenshots). Do NOT use Date.now() here.
const TODAY_ISO = '2026-06-10T09:00:00.000Z';
const DAY = 24 * 60 * 60 * 1000;

export function buildSeed(): WorkspaceState {
  const today = new Date(TODAY_ISO);
  const rel = (n: number) => new Date(today.getTime() + n * DAY).toISOString();
  const P = (pick: number | boolean, drop: number | boolean, work: number | boolean): StagePerm => ({
    pick: !!pick,
    drop: !!drop,
    work: !!work
  });
  const ALL = P(1, 1, 1);

  // ---- People --------------------------------------------------------------
  const users: Record<string, User> = {
    u_sarah: { id: 'u_sarah', name: 'Sarah Chen', email: 'sarah.chen@northwind.io', title: 'Engineering Lead', role: 'admin', initials: 'SC', color: '#4B3FE4' },
    u_marcus: { id: 'u_marcus', name: 'Marcus Reed', email: 'marcus.reed@northwind.io', title: 'Product Manager', role: 'member', initials: 'MR', color: '#0E8C7F' },
    u_priya: { id: 'u_priya', name: 'Priya Nair', email: 'priya.nair@northwind.io', title: 'Product Designer', role: 'member', initials: 'PN', color: '#C2410C' },
    u_dana: { id: 'u_dana', name: 'Dana Okafor', email: 'dana.okafor@northwind.io', title: 'Marketing Lead', role: 'member', initials: 'DO', color: '#9333A8' },
    u_tom: { id: 'u_tom', name: 'Tom Becker', email: 'tom.becker@lumen-contractors.com', title: 'iOS Contractor', role: 'guest', initials: 'TB', color: '#6B6760' }
  };

  // ---- Labels --------------------------------------------------------------
  const labels: Record<string, Label> = {
    bug: { id: 'bug', name: 'Bug', color: '#E05A4F' },
    feature: { id: 'feature', name: 'Feature', color: '#3E78D9' },
    design: { id: 'design', name: 'Design', color: '#8A5BD6' },
    research: { id: 'research', name: 'Research', color: '#E0A33E' },
    infra: { id: 'infra', name: 'Infra', color: '#3FA66A' },
    ios: { id: 'ios', name: 'iOS', color: '#0E8C7F' },
    api: { id: 'api', name: 'API', color: '#4B3FE4' },
    urgent: { id: 'urgent', name: 'Urgent', color: '#C0392B' },
    growth: { id: 'growth', name: 'Growth', color: '#C2410C' }
  };

  // ---- Boards (base lists; workflow layer below overrides sprint) -----------
  const boards: Record<string, Board> = {
    b_sprint: blankBoard({
      id: 'b_sprint', name: 'Sprint 24 · Engineering', subtitle: 'Two-week cycle · ends Jun 19',
      accent: '#4B3FE4', visibility: 'private', memberIds: ['u_sarah', 'u_priya', 'u_tom'],
      lists: [
        { id: 'l_s_backlog', name: 'Backlog' }, { id: 'l_s_todo', name: 'To Do' },
        { id: 'l_s_doing', name: 'In Progress' }, { id: 'l_s_review', name: 'In Review' },
        { id: 'l_s_done', name: 'Done' }
      ]
    }),
    b_roadmap: blankBoard({
      id: 'b_roadmap', name: 'Q3 Product Roadmap', subtitle: 'Where the whole company aligns',
      accent: '#0E8C7F', visibility: 'workspace', memberIds: ['u_sarah', 'u_marcus', 'u_priya', 'u_dana'],
      lists: [
        { id: 'l_r_ideas', name: 'Ideas' }, { id: 'l_r_now', name: 'Now' }, { id: 'l_r_next', name: 'Next' },
        { id: 'l_r_later', name: 'Later' }, { id: 'l_r_shipped', name: 'Shipped' }
      ]
    }),
    b_launch: blankBoard({
      id: 'b_launch', name: 'Launch: Mobile App', subtitle: 'Go-to-market for the 2.0 release',
      accent: '#C2410C', visibility: 'private', memberIds: ['u_marcus', 'u_dana', 'u_priya'],
      lists: [
        { id: 'l_l_plan', name: 'Planning' }, { id: 'l_l_progress', name: 'In Motion' },
        { id: 'l_l_review', name: 'Approval' }, { id: 'l_l_live', name: 'Live' }
      ]
    }),
    b_bugs: blankBoard({
      id: 'b_bugs', name: 'Bug Triage', subtitle: 'Inbound from support & QA',
      accent: '#E05A4F', visibility: 'private', memberIds: ['u_sarah', 'u_tom'],
      lists: [
        { id: 'l_b_new', name: 'New' }, { id: 'l_b_triaged', name: 'Triaged' },
        { id: 'l_b_fixing', name: 'Fixing' }, { id: 'l_b_verify', name: 'Verify' }
      ]
    }),
    b_leadership: blankBoard({
      id: 'b_leadership', name: 'Leadership Planning', subtitle: 'Admins only · confidential',
      accent: '#1A1814', visibility: 'private', memberIds: ['u_sarah'],
      lists: [
        { id: 'l_x_topics', name: 'Topics' }, { id: 'l_x_active', name: 'In Discussion' },
        { id: 'l_x_decided', name: 'Decided' }
      ]
    })
  };

  // ---- Cards ---------------------------------------------------------------
  let _p = 0;
  const cards: Card[] = [];
  const C = (o: Partial<Card> & Pick<Card, 'boardId' | 'listId' | 'title'>): Card => {
    _p++;
    const card: Card = {
      id: 'c_' + _p, pos: _p, labels: [], members: [], checklist: [], comments: [], activity: [], timeEntries: [],
      ...o
    };
    cards.push(card);
    return card;
  };

  // Sprint 24 · Engineering
  C({ boardId: 'b_sprint', listId: 'l_s_backlog', title: 'Offline mode for the activity feed', labels: ['feature', 'ios'], members: ['u_tom'], desc: 'Cache the last 50 activity events so the feed renders instantly on cold launch and survives flaky connectivity.' });
  C({ boardId: 'b_sprint', listId: 'l_s_backlog', title: 'Audit log export (CSV + JSON)', labels: ['feature', 'api'], members: ['u_sarah'], due: rel(12), desc: 'Let admins export the per-user action log for compliance review.' });
  C({ boardId: 'b_sprint', listId: 'l_s_backlog', title: 'Investigate slow board load on >200 cards', labels: ['research', 'infra'], members: ['u_sarah'] });
  C({
    boardId: 'b_sprint', listId: 'l_s_todo', title: 'Token-scoped API for card moves', labels: ['api', 'feature'], members: ['u_sarah'], due: rel(2),
    desc: 'Expose move/assign endpoints that accept a delegated, permission-bound token — never raw credentials.',
    checklist: [
      { id: 'k1', text: 'Define scopes: cards:move, cards:assign', done: true },
      { id: 'k2', text: 'Reject actions outside board membership', done: true },
      { id: 'k3', text: 'Attribute every action to the acting user', done: false },
      { id: 'k4', text: 'Rate-limit per session token', done: false }
    ]
  });
  C({ boardId: 'b_sprint', listId: 'l_s_todo', title: 'Drag-and-drop on touch devices', labels: ['ios', 'bug'], members: ['u_tom'], due: rel(1) });
  C({ boardId: 'b_sprint', listId: 'l_s_todo', title: 'Empty states for new boards', labels: ['design'], members: ['u_priya'] });
  C({
    boardId: 'b_sprint', listId: 'l_s_doing', title: 'Real-time presence on cards', labels: ['feature'], members: ['u_priya', 'u_tom'], due: rel(0),
    desc: 'Show who else is viewing a card right now, with live avatar stack.',
    checklist: [
      { id: 'k1', text: 'WebSocket channel per board', done: true },
      { id: 'k2', text: 'Avatar stack component', done: true },
      { id: 'k3', text: 'Idle timeout after 60s', done: false }
    ],
    comments: [{ id: 'm1', userId: 'u_priya', at: rel(-0.4), text: 'Avatar stack is in — left a Figma link in the description. Caps at 4 + overflow count.' }],
    activity: [
      { id: 'a1', kind: 'agent', actorUserId: 'u_sarah', at: rel(-0.1), text: 'moved this card from To Do to In Progress' },
      { id: 'a2', kind: 'join', actorUserId: 'u_priya', at: rel(-1.5), text: 'joined the card' }
    ]
  });
  C({ boardId: 'b_sprint', listId: 'l_s_doing', title: 'Fix crash on rapid board switch', labels: ['bug', 'urgent', 'ios'], members: ['u_tom'], due: rel(-1), desc: 'Reported by 3 beta users. Stack trace points to a stale subscription not being torn down.' });
  C({
    boardId: 'b_sprint', listId: 'l_s_review', title: 'Permission-scoped search', labels: ['feature', 'api'], members: ['u_sarah'],
    desc: 'Search only returns cards on boards the requesting user can access.',
    activity: [{ id: 'a1', kind: 'agent', actorUserId: 'u_sarah', at: rel(-0.2), text: 'moved this card from In Progress to In Review' }]
  });
  C({ boardId: 'b_sprint', listId: 'l_s_review', title: 'Keyboard shortcuts overlay', labels: ['design', 'feature'], members: ['u_priya'] });
  C({ boardId: 'b_sprint', listId: 'l_s_done', title: 'Card detail redesign', labels: ['design'], members: ['u_priya'] });
  C({ boardId: 'b_sprint', listId: 'l_s_done', title: 'Migrate sessions to short-lived tokens', labels: ['infra', 'api'], members: ['u_sarah'] });
  C({ boardId: 'b_sprint', listId: 'l_s_done', title: 'Label color refresh', labels: ['design'], members: ['u_priya'] });

  // Q3 Product Roadmap
  C({ boardId: 'b_roadmap', listId: 'l_r_ideas', title: 'Smart card templates', labels: ['feature'], members: ['u_marcus'] });
  C({ boardId: 'b_roadmap', listId: 'l_r_ideas', title: 'Slack & Teams notifications', labels: ['growth'], members: ['u_dana'] });
  C({ boardId: 'b_roadmap', listId: 'l_r_ideas', title: 'Public board sharing (read-only)', labels: ['feature', 'growth'], members: ['u_marcus'] });
  C({
    boardId: 'b_roadmap', listId: 'l_r_now', title: 'Embedded assistant (Dioschub) GA', labels: ['feature', 'api'], members: ['u_sarah', 'u_marcus'], due: rel(9),
    desc: 'Ship the permission-aware assistant to all workspaces. Operates as the logged-in user; every action audited.',
    checklist: [
      { id: 'k1', text: 'Credential-blind action layer', done: true },
      { id: 'k2', text: 'Per-user audit attribution', done: true },
      { id: 'k3', text: 'Admin permission mapping UI', done: false }
    ]
  });
  C({ boardId: 'b_roadmap', listId: 'l_r_now', title: 'Mobile app 2.0', labels: ['ios'], members: ['u_priya', 'u_tom'], due: rel(9) });
  C({ boardId: 'b_roadmap', listId: 'l_r_next', title: 'Saved views & filters', labels: ['feature'], members: ['u_marcus'] });
  C({ boardId: 'b_roadmap', listId: 'l_r_next', title: 'Timeline / Gantt view', labels: ['feature', 'design'], members: ['u_priya'] });
  C({ boardId: 'b_roadmap', listId: 'l_r_later', title: 'Automations builder', labels: ['feature'], members: ['u_marcus'] });
  C({ boardId: 'b_roadmap', listId: 'l_r_later', title: 'Workload balancing', labels: ['research'], members: ['u_sarah'] });
  C({ boardId: 'b_roadmap', listId: 'l_r_shipped', title: 'Role-based board permissions', labels: ['feature', 'api'], members: ['u_sarah'] });
  C({ boardId: 'b_roadmap', listId: 'l_r_shipped', title: 'Tenant isolation', labels: ['infra'], members: ['u_sarah'] });

  // Launch: Mobile App
  C({ boardId: 'b_launch', listId: 'l_l_plan', title: 'Launch narrative & messaging', labels: ['growth'], members: ['u_dana'], due: rel(4) });
  C({ boardId: 'b_launch', listId: 'l_l_plan', title: 'App Store screenshots & copy', labels: ['design', 'ios'], members: ['u_priya', 'u_dana'] });
  C({ boardId: 'b_launch', listId: 'l_l_plan', title: 'Beta tester recruitment', labels: ['growth'], members: ['u_dana'] });
  C({ boardId: 'b_launch', listId: 'l_l_progress', title: 'Press kit & demo video', labels: ['growth', 'design'], members: ['u_dana', 'u_priya'], due: rel(6) });
  C({ boardId: 'b_launch', listId: 'l_l_progress', title: 'Pricing page refresh', labels: ['design'], members: ['u_priya'] });
  C({ boardId: 'b_launch', listId: 'l_l_review', title: 'Legal review of launch claims', labels: ['urgent'], members: ['u_marcus'], due: rel(3) });
  C({ boardId: 'b_launch', listId: 'l_l_live', title: 'Teaser email to waitlist', labels: ['growth'], members: ['u_dana'] });

  // Bug Triage
  C({ boardId: 'b_bugs', listId: 'l_b_new', title: 'Avatar images fail to load on Safari 17', labels: ['bug'], members: ['u_tom'] });
  C({ boardId: 'b_bugs', listId: 'l_b_new', title: 'Due-date timezone off by one', labels: ['bug'], members: ['u_sarah'] });
  C({ boardId: 'b_bugs', listId: 'l_b_new', title: 'Checklist count not updating live', labels: ['bug'], members: ['u_tom'] });
  C({ boardId: 'b_bugs', listId: 'l_b_triaged', title: 'Long board names overflow sidebar', labels: ['bug', 'design'], members: ['u_tom'], due: rel(2) });
  C({ boardId: 'b_bugs', listId: 'l_b_triaged', title: 'Search returns archived cards', labels: ['bug', 'api'], members: ['u_sarah'] });
  C({ boardId: 'b_bugs', listId: 'l_b_fixing', title: 'Drag ghost stuck after drop', labels: ['bug', 'urgent'], members: ['u_tom'], due: rel(0) });
  C({ boardId: 'b_bugs', listId: 'l_b_verify', title: 'Notifications double-fire on mention', labels: ['bug'], members: ['u_sarah'] });

  // Leadership Planning (admins only)
  C({ boardId: 'b_leadership', listId: 'l_x_topics', title: 'Q4 headcount plan', labels: ['urgent'], members: ['u_sarah'] });
  C({ boardId: 'b_leadership', listId: 'l_x_topics', title: 'Enterprise pricing tiers', labels: ['growth'], members: ['u_sarah'] });
  C({ boardId: 'b_leadership', listId: 'l_x_active', title: 'SOC 2 Type II timeline', labels: ['infra'], members: ['u_sarah'], due: rel(20) });
  C({ boardId: 'b_leadership', listId: 'l_x_decided', title: 'Adopt Dioschub for internal tools', labels: ['feature'], members: ['u_sarah'] });

  // ---- Workflow layer (port of workflow-data.js) ---------------------------

  // Sprint 24 — full delivery pipeline (overrides base lists).
  const sp = boards.b_sprint;
  sp.subtitle = 'Two-week cycle · ends Jun 19 · workflow-backed';
  sp.lists = [
    { id: 'l_s_backlog', name: 'Backlog' }, { id: 'l_s_todo', name: 'Pending Dev' },
    { id: 'l_s_doing', name: 'Development' }, { id: 'l_s_clar', name: 'Clarification' },
    { id: 'l_s_stage', name: 'Staging' }, { id: 'l_s_review', name: 'Testing' },
    { id: 'l_s_done', name: 'Done' }
  ];
  sp.roles = {
    r_lead: { id: 'r_lead', name: 'Lead', color: '#4B3FE4' },
    r_dev: { id: 'r_dev', name: 'Developer', color: '#3FA66A' },
    r_ba: { id: 'r_ba', name: 'Design / BA', color: '#8A5BD6' },
    r_qa: { id: 'r_qa', name: 'QA', color: '#E0A33E' }
  };
  sp.roleAssignments = { u_sarah: 'r_lead', u_tom: 'r_dev', u_priya: 'r_ba' };
  sp.workflow = {
    nodes: {
      l_s_backlog: { x: 40, y: 150 }, l_s_todo: { x: 280, y: 150 }, l_s_doing: { x: 520, y: 150 },
      l_s_clar: { x: 520, y: 340 }, l_s_stage: { x: 760, y: 150 }, l_s_review: { x: 1000, y: 150 },
      l_s_done: { x: 1240, y: 150 }
    },
    edges: [
      { from: 'l_s_backlog', to: 'l_s_todo' }, { from: 'l_s_todo', to: 'l_s_doing' },
      { from: 'l_s_doing', to: 'l_s_clar' }, { from: 'l_s_clar', to: 'l_s_doing' },
      { from: 'l_s_doing', to: 'l_s_stage' }, { from: 'l_s_stage', to: 'l_s_review' },
      { from: 'l_s_review', to: 'l_s_done' }, { from: 'l_s_review', to: 'l_s_todo' }
    ],
    permissions: {
      l_s_backlog: { r_lead: ALL, r_ba: P(1, 1, 1) },
      l_s_todo: { r_lead: ALL, r_ba: P(0, 1, 0), r_dev: P(1, 0, 0), r_qa: P(0, 1, 0) },
      l_s_doing: { r_lead: ALL, r_dev: P(1, 1, 1) },
      l_s_clar: { r_lead: ALL, r_dev: P(0, 1, 0), r_ba: P(1, 1, 1) },
      l_s_stage: { r_lead: ALL, r_dev: P(0, 1, 0), r_qa: P(1, 0, 0) },
      l_s_review: { r_lead: ALL, r_qa: P(1, 1, 1) },
      l_s_done: { r_lead: ALL, r_qa: P(0, 1, 0) }
    },
    tracking: {
      r_lead: ['l_s_backlog', 'l_s_todo', 'l_s_doing', 'l_s_clar', 'l_s_stage', 'l_s_review', 'l_s_done'],
      r_dev: ['l_s_doing'], r_ba: ['l_s_clar'], r_qa: ['l_s_review']
    }
  };

  // Bug Triage — lead/dev split.
  const bg = boards.b_bugs;
  bg.roles = {
    r_blead: { id: 'r_blead', name: 'Triage Lead', color: '#E05A4F' },
    r_bdev: { id: 'r_bdev', name: 'Developer', color: '#3FA66A' }
  };
  bg.roleAssignments = { u_sarah: 'r_blead', u_tom: 'r_bdev' };
  bg.workflow = {
    nodes: {
      l_b_new: { x: 40, y: 150 }, l_b_triaged: { x: 280, y: 150 },
      l_b_fixing: { x: 520, y: 150 }, l_b_verify: { x: 760, y: 150 }
    },
    edges: [
      { from: 'l_b_new', to: 'l_b_triaged' }, { from: 'l_b_triaged', to: 'l_b_fixing' },
      { from: 'l_b_fixing', to: 'l_b_verify' }, { from: 'l_b_verify', to: 'l_b_fixing' }
    ],
    permissions: {
      l_b_new: { r_blead: ALL },
      l_b_triaged: { r_blead: ALL, r_bdev: P(1, 0, 0) },
      l_b_fixing: { r_blead: ALL, r_bdev: P(1, 1, 1) },
      l_b_verify: { r_blead: ALL, r_bdev: P(0, 1, 0) }
    },
    tracking: { r_blead: ['l_b_new', 'l_b_triaged', 'l_b_fixing', 'l_b_verify'], r_bdev: ['l_b_fixing'] }
  };

  // Default workflow for every other board: one "Contributor" role, full perms.
  for (const board of Object.values(boards)) {
    if (board.workflow && Object.keys(board.workflow.permissions).length) continue;
    const rid = 'r_all';
    const role: Role = { id: rid, name: 'Contributor', color: board.accent };
    board.roles = { [rid]: role };
    board.roleAssignments = {};
    for (const uid of board.memberIds) board.roleAssignments[uid] = rid;
    const nodes: Record<string, { x: number; y: number }> = {};
    const edges: Array<{ from: string; to: string }> = [];
    const permissions: Record<string, Record<string, StagePerm>> = {};
    board.lists.forEach((l, i) => {
      nodes[l.id] = { x: 40 + i * 240, y: 150 };
      permissions[l.id] = { [rid]: P(1, 1, 1) };
      if (i > 0) edges.push({ from: board.lists[i - 1].id, to: l.id });
    });
    board.workflow = { nodes, edges, permissions, tracking: { [rid]: board.lists.map((l) => l.id) } };
  }

  // Redistribute a couple of sprint cards into the new stages.
  const byTitle = (t: string) => cards.find((c) => c.title === t);
  const moveTo = (t: string, lid: string) => { const c = byTitle(t); if (c) c.listId = lid; };
  moveTo('Keyboard shortcuts overlay', 'l_s_clar');
  moveTo('Drag-and-drop on touch devices', 'l_s_stage');

  // Seed time entries.
  let _te = 0;
  const logT = (title: string, userId: string, roleId: string, listId: string, minutes: number, atDays: number, manual = false) => {
    const c = byTitle(title);
    if (!c) return;
    c.timeEntries.push({ id: 'te_' + ++_te, userId, roleId, listId, minutes, at: rel(atDays), manual });
  };
  logT('Real-time presence on cards', 'u_tom', 'r_dev', 'l_s_doing', 190, -0.3);
  logT('Real-time presence on cards', 'u_priya', 'r_ba', 'l_s_clar', 85, -1.2, true);
  logT('Fix crash on rapid board switch', 'u_tom', 'r_dev', 'l_s_doing', 160, -0.6);
  logT('Permission-scoped search', 'u_tom', 'r_dev', 'l_s_doing', 245, -2.1);
  logT('Permission-scoped search', 'u_sarah', 'r_lead', 'l_s_review', 45, -0.4, true);
  logT('Keyboard shortcuts overlay', 'u_priya', 'r_ba', 'l_s_clar', 50, -0.8);
  logT('Drag-and-drop on touch devices', 'u_tom', 'r_dev', 'l_s_doing', 90, -1.4);
  logT('Drag ghost stuck after drop', 'u_tom', 'r_bdev', 'l_b_fixing', 75, -0.5);

  const workspace: Workspace = { id: 'ws_northwind', name: 'Northwind', plan: 'Business' };

  return {
    workspace,
    users,
    labels,
    boards,
    cards,
    // Sandbox auto-signs-in as Sarah until the login screen lands (phase 2).
    currentUserId: 'u_sarah',
    today: TODAY_ISO,
    personaOrder: ['u_sarah', 'u_marcus', 'u_priya', 'u_dana', 'u_tom'],
    createdAt: 0,
    lastSeen: 0
  };
}

function blankBoard(b: Omit<Board, 'roles' | 'roleAssignments' | 'workflow'>): Board {
  return { ...b, roles: {}, roleAssignments: {}, workflow: { nodes: {}, edges: [], permissions: {}, tracking: {} } };
}
