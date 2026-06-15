/* Cadence — sample dataset for the Dioschub task-management demo.
 * Plain JS. Exposed as window.CADENCE_DATA.
 * "Today" is anchored to 2026-06-10 for relative due dates.
 */
(function () {
  const TODAY = new Date('2026-06-10T09:00:00');
  const day = 24 * 60 * 60 * 1000;
  const rel = (n) => new Date(TODAY.getTime() + n * day).toISOString();

  // ---- People ---------------------------------------------------------------
  const users = {
    u_sarah: {
      id: 'u_sarah', name: 'Sarah Chen', email: 'sarah.chen@northwind.io',
      title: 'Engineering Lead', role: 'admin', initials: 'SC', color: '#4B3FE4',
    },
    u_marcus: {
      id: 'u_marcus', name: 'Marcus Reed', email: 'marcus.reed@northwind.io',
      title: 'Product Manager', role: 'member', initials: 'MR', color: '#0E8C7F',
    },
    u_priya: {
      id: 'u_priya', name: 'Priya Nair', email: 'priya.nair@northwind.io',
      title: 'Product Designer', role: 'member', initials: 'PN', color: '#C2410C',
    },
    u_dana: {
      id: 'u_dana', name: 'Dana Okafor', email: 'dana.okafor@northwind.io',
      title: 'Marketing Lead', role: 'member', initials: 'DO', color: '#9333A8',
    },
    u_tom: {
      id: 'u_tom', name: 'Tom Becker', email: 'tom.becker@lumen-contractors.com',
      title: 'iOS Contractor', role: 'guest', initials: 'TB', color: '#6B6760',
    },
  };

  // ---- Labels ---------------------------------------------------------------
  const labels = {
    bug:      { id: 'bug',      name: 'Bug',          color: '#E05A4F' },
    feature:  { id: 'feature',  name: 'Feature',      color: '#3E78D9' },
    design:   { id: 'design',   name: 'Design',       color: '#8A5BD6' },
    research: { id: 'research', name: 'Research',      color: '#E0A33E' },
    infra:    { id: 'infra',    name: 'Infra',        color: '#3FA66A' },
    ios:      { id: 'ios',      name: 'iOS',          color: '#0E8C7F' },
    api:      { id: 'api',      name: 'API',          color: '#4B3FE4' },
    urgent:   { id: 'urgent',   name: 'Urgent',       color: '#C0392B' },
    growth:   { id: 'growth',   name: 'Growth',       color: '#C2410C' },
  };

  // ---- Boards ---------------------------------------------------------------
  // visibility: 'workspace' (any member) | 'private' (members only)
  const boards = {
    b_sprint: {
      id: 'b_sprint', name: 'Sprint 24 · Engineering',
      subtitle: 'Two-week cycle · ends Jun 19',
      accent: '#4B3FE4', visibility: 'private',
      memberIds: ['u_sarah', 'u_priya', 'u_tom'],
      lists: [
        { id: 'l_s_backlog', name: 'Backlog' },
        { id: 'l_s_todo', name: 'To Do' },
        { id: 'l_s_doing', name: 'In Progress' },
        { id: 'l_s_review', name: 'In Review' },
        { id: 'l_s_done', name: 'Done' },
      ],
    },
    b_roadmap: {
      id: 'b_roadmap', name: 'Q3 Product Roadmap',
      subtitle: 'Where the whole company aligns',
      accent: '#0E8C7F', visibility: 'workspace',
      memberIds: ['u_sarah', 'u_marcus', 'u_priya', 'u_dana'],
      lists: [
        { id: 'l_r_ideas', name: 'Ideas' },
        { id: 'l_r_now', name: 'Now' },
        { id: 'l_r_next', name: 'Next' },
        { id: 'l_r_later', name: 'Later' },
        { id: 'l_r_shipped', name: 'Shipped' },
      ],
    },
    b_launch: {
      id: 'b_launch', name: 'Launch: Mobile App',
      subtitle: 'Go-to-market for the 2.0 release',
      accent: '#C2410C', visibility: 'private',
      memberIds: ['u_marcus', 'u_dana', 'u_priya'],
      lists: [
        { id: 'l_l_plan', name: 'Planning' },
        { id: 'l_l_progress', name: 'In Motion' },
        { id: 'l_l_review', name: 'Approval' },
        { id: 'l_l_live', name: 'Live' },
      ],
    },
    b_bugs: {
      id: 'b_bugs', name: 'Bug Triage',
      subtitle: 'Inbound from support & QA',
      accent: '#E05A4F', visibility: 'private',
      memberIds: ['u_sarah', 'u_tom'],
      lists: [
        { id: 'l_b_new', name: 'New' },
        { id: 'l_b_triaged', name: 'Triaged' },
        { id: 'l_b_fixing', name: 'Fixing' },
        { id: 'l_b_verify', name: 'Verify' },
      ],
    },
    b_leadership: {
      id: 'b_leadership', name: 'Leadership Planning',
      subtitle: 'Admins only · confidential',
      accent: '#1A1814', visibility: 'private',
      memberIds: ['u_sarah'],
      lists: [
        { id: 'l_x_topics', name: 'Topics' },
        { id: 'l_x_active', name: 'In Discussion' },
        { id: 'l_x_decided', name: 'Decided' },
      ],
    },
  };

  // ---- Cards ----------------------------------------------------------------
  let _p = 0;
  const C = (o) => Object.assign({ id: 'c_' + (++_p), pos: _p, labels: [], members: [], checklist: [], comments: [], activity: [] }, o);

  const cards = [
    // ===== Sprint 24 · Engineering ==========================================
    C({ boardId: 'b_sprint', listId: 'l_s_backlog', title: 'Offline mode for the activity feed',
      labels: ['feature', 'ios'], members: ['u_tom'],
      desc: 'Cache the last 50 activity events so the feed renders instantly on cold launch and survives flaky connectivity.' }),
    C({ boardId: 'b_sprint', listId: 'l_s_backlog', title: 'Audit log export (CSV + JSON)',
      labels: ['feature', 'api'], members: ['u_sarah'], due: rel(12),
      desc: 'Let admins export the per-user action log for compliance review.' }),
    C({ boardId: 'b_sprint', listId: 'l_s_backlog', title: 'Investigate slow board load on >200 cards',
      labels: ['research', 'infra'], members: ['u_sarah'] }),

    C({ boardId: 'b_sprint', listId: 'l_s_todo', title: 'Token-scoped API for card moves',
      labels: ['api', 'feature'], members: ['u_sarah'], due: rel(2),
      desc: 'Expose move/assign endpoints that accept a delegated, permission-bound token — never raw credentials.',
      checklist: [
        { id: 'k1', text: 'Define scopes: cards:move, cards:assign', done: true },
        { id: 'k2', text: 'Reject actions outside board membership', done: true },
        { id: 'k3', text: 'Attribute every action to the acting user', done: false },
        { id: 'k4', text: 'Rate-limit per session token', done: false },
      ] }),
    C({ boardId: 'b_sprint', listId: 'l_s_todo', title: 'Drag-and-drop on touch devices',
      labels: ['ios', 'bug'], members: ['u_tom'], due: rel(1) }),
    C({ boardId: 'b_sprint', listId: 'l_s_todo', title: 'Empty states for new boards',
      labels: ['design'], members: ['u_priya'] }),

    C({ boardId: 'b_sprint', listId: 'l_s_doing', title: 'Real-time presence on cards',
      labels: ['feature'], members: ['u_priya', 'u_tom'], due: rel(0),
      desc: 'Show who else is viewing a card right now, with live avatar stack.',
      checklist: [
        { id: 'k1', text: 'WebSocket channel per board', done: true },
        { id: 'k2', text: 'Avatar stack component', done: true },
        { id: 'k3', text: 'Idle timeout after 60s', done: false },
      ],
      comments: [
        { id: 'm1', userId: 'u_priya', at: rel(-0.4), text: 'Avatar stack is in — left a Figma link in the description. Caps at 4 + overflow count.' },
      ],
      activity: [
        { id: 'a1', kind: 'agent', actorUserId: 'u_sarah', at: rel(-0.1),
          text: 'moved this card from To Do to In Progress' },
        { id: 'a2', kind: 'move', actorUserId: 'u_priya', at: rel(-1.5), text: 'joined the card' },
      ] }),
    C({ boardId: 'b_sprint', listId: 'l_s_doing', title: 'Fix crash on rapid board switch',
      labels: ['bug', 'urgent', 'ios'], members: ['u_tom'], due: rel(-1),
      desc: 'Reported by 3 beta users. Stack trace points to a stale subscription not being torn down.' }),

    C({ boardId: 'b_sprint', listId: 'l_s_review', title: 'Permission-scoped search',
      labels: ['feature', 'api'], members: ['u_sarah'],
      desc: 'Search only returns cards on boards the requesting user can access.',
      activity: [
        { id: 'a1', kind: 'agent', actorUserId: 'u_sarah', at: rel(-0.2),
          text: 'moved this card from In Progress to In Review' },
      ] }),
    C({ boardId: 'b_sprint', listId: 'l_s_review', title: 'Keyboard shortcuts overlay',
      labels: ['design', 'feature'], members: ['u_priya'] }),

    C({ boardId: 'b_sprint', listId: 'l_s_done', title: 'Card detail redesign',
      labels: ['design'], members: ['u_priya'] }),
    C({ boardId: 'b_sprint', listId: 'l_s_done', title: 'Migrate sessions to short-lived tokens',
      labels: ['infra', 'api'], members: ['u_sarah'] }),
    C({ boardId: 'b_sprint', listId: 'l_s_done', title: 'Label color refresh',
      labels: ['design'], members: ['u_priya'] }),

    // ===== Q3 Product Roadmap ===============================================
    C({ boardId: 'b_roadmap', listId: 'l_r_ideas', title: 'Smart card templates',
      labels: ['feature'], members: ['u_marcus'] }),
    C({ boardId: 'b_roadmap', listId: 'l_r_ideas', title: 'Slack & Teams notifications',
      labels: ['growth'], members: ['u_dana'] }),
    C({ boardId: 'b_roadmap', listId: 'l_r_ideas', title: 'Public board sharing (read-only)',
      labels: ['feature', 'growth'], members: ['u_marcus'] }),

    C({ boardId: 'b_roadmap', listId: 'l_r_now', title: 'Embedded assistant (Dioschub) GA',
      labels: ['feature', 'api'], members: ['u_sarah', 'u_marcus'], due: rel(9),
      desc: 'Ship the permission-aware assistant to all workspaces. Operates as the logged-in user; every action audited.',
      checklist: [
        { id: 'k1', text: 'Credential-blind action layer', done: true },
        { id: 'k2', text: 'Per-user audit attribution', done: true },
        { id: 'k3', text: 'Admin permission mapping UI', done: false },
      ] }),
    C({ boardId: 'b_roadmap', listId: 'l_r_now', title: 'Mobile app 2.0',
      labels: ['ios'], members: ['u_priya', 'u_tom'], due: rel(9) }),

    C({ boardId: 'b_roadmap', listId: 'l_r_next', title: 'Saved views & filters',
      labels: ['feature'], members: ['u_marcus'] }),
    C({ boardId: 'b_roadmap', listId: 'l_r_next', title: 'Timeline / Gantt view',
      labels: ['feature', 'design'], members: ['u_priya'] }),

    C({ boardId: 'b_roadmap', listId: 'l_r_later', title: 'Automations builder',
      labels: ['feature'], members: ['u_marcus'] }),
    C({ boardId: 'b_roadmap', listId: 'l_r_later', title: 'Workload balancing',
      labels: ['research'], members: ['u_sarah'] }),

    C({ boardId: 'b_roadmap', listId: 'l_r_shipped', title: 'Role-based board permissions',
      labels: ['feature', 'api'], members: ['u_sarah'] }),
    C({ boardId: 'b_roadmap', listId: 'l_r_shipped', title: 'Tenant isolation',
      labels: ['infra'], members: ['u_sarah'] }),

    // ===== Launch: Mobile App ===============================================
    C({ boardId: 'b_launch', listId: 'l_l_plan', title: 'Launch narrative & messaging',
      labels: ['growth'], members: ['u_dana'], due: rel(4) }),
    C({ boardId: 'b_launch', listId: 'l_l_plan', title: 'App Store screenshots & copy',
      labels: ['design', 'ios'], members: ['u_priya', 'u_dana'] }),
    C({ boardId: 'b_launch', listId: 'l_l_plan', title: 'Beta tester recruitment',
      labels: ['growth'], members: ['u_dana'] }),

    C({ boardId: 'b_launch', listId: 'l_l_progress', title: 'Press kit & demo video',
      labels: ['growth', 'design'], members: ['u_dana', 'u_priya'], due: rel(6) }),
    C({ boardId: 'b_launch', listId: 'l_l_progress', title: 'Pricing page refresh',
      labels: ['design'], members: ['u_priya'] }),

    C({ boardId: 'b_launch', listId: 'l_l_review', title: 'Legal review of launch claims',
      labels: ['urgent'], members: ['u_marcus'], due: rel(3) }),

    C({ boardId: 'b_launch', listId: 'l_l_live', title: 'Teaser email to waitlist',
      labels: ['growth'], members: ['u_dana'] }),

    // ===== Bug Triage =======================================================
    C({ boardId: 'b_bugs', listId: 'l_b_new', title: 'Avatar images fail to load on Safari 17',
      labels: ['bug'], members: ['u_tom'] }),
    C({ boardId: 'b_bugs', listId: 'l_b_new', title: 'Due-date timezone off by one',
      labels: ['bug'], members: ['u_sarah'] }),
    C({ boardId: 'b_bugs', listId: 'l_b_new', title: 'Checklist count not updating live',
      labels: ['bug'], members: ['u_tom'] }),

    C({ boardId: 'b_bugs', listId: 'l_b_triaged', title: 'Long board names overflow sidebar',
      labels: ['bug', 'design'], members: ['u_tom'], due: rel(2) }),
    C({ boardId: 'b_bugs', listId: 'l_b_triaged', title: 'Search returns archived cards',
      labels: ['bug', 'api'], members: ['u_sarah'] }),

    C({ boardId: 'b_bugs', listId: 'l_b_fixing', title: 'Drag ghost stuck after drop',
      labels: ['bug', 'urgent'], members: ['u_tom'], due: rel(0) }),

    C({ boardId: 'b_bugs', listId: 'l_b_verify', title: 'Notifications double-fire on mention',
      labels: ['bug'], members: ['u_sarah'] }),

    // ===== Leadership Planning (admins only) ================================
    C({ boardId: 'b_leadership', listId: 'l_x_topics', title: 'Q4 headcount plan',
      labels: ['urgent'], members: ['u_sarah'] }),
    C({ boardId: 'b_leadership', listId: 'l_x_topics', title: 'Enterprise pricing tiers',
      labels: ['growth'], members: ['u_sarah'] }),
    C({ boardId: 'b_leadership', listId: 'l_x_active', title: 'SOC 2 Type II timeline',
      labels: ['infra'], members: ['u_sarah'], due: rel(20) }),
    C({ boardId: 'b_leadership', listId: 'l_x_decided', title: 'Adopt Dioschub for internal tools',
      labels: ['feature'], members: ['u_sarah'] }),
  ];

  window.CADENCE_DATA = {
    today: TODAY.toISOString(),
    workspace: { id: 'ws_northwind', name: 'Northwind', plan: 'Business' },
    users, labels, boards, cards,
    // demo order for the persona switcher
    personaOrder: ['u_sarah', 'u_marcus', 'u_priya', 'u_dana', 'u_tom'],
  };
})();
