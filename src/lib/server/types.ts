// Domain model — mirrors design/SPEC.md §3 + the workflow/time-tracking layer.
// Field names match the prototype fixture so components port cleanly.

export type WorkspaceRole = 'admin' | 'member' | 'guest';
export type Visibility = 'workspace' | 'private';

export interface Workspace {
  id: string;
  name: string;
  plan: string;
}

export interface User {
  id: string;
  name: string;
  email: string; // identity used for audit attribution
  title: string;
  role: WorkspaceRole;
  initials: string;
  color: string; // avatar background hex
}

export interface Label {
  id: string;
  name: string;
  color: string; // hex
}

export interface List {
  id: string;
  name: string;
  // order = position within Board.lists
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  at: string; // ISO-8601
  text: string;
}

export type ActivityKind = 'agent' | 'move' | 'create' | 'assign' | 'comment' | 'checklist' | 'edit' | 'join';

export interface Activity {
  id: string;
  kind: ActivityKind;
  actorUserId: string; // WHO the action is attributed to
  at: string; // ISO-8601
  text: string;
  // kind:'agent' => performed by the DioscHub assistant on behalf of actorUserId.
}

export interface TimeEntry {
  id: string;
  userId: string;
  roleId: string;
  listId: string;
  minutes: number;
  at: string; // ISO-8601
  manual: boolean;
}

export interface Card {
  id: string;
  boardId: string;
  listId: string;
  pos: number; // sort order within its list (ascending)
  title: string;
  desc?: string;
  labels: string[]; // Label ids
  members: string[]; // User ids (assignees)
  due?: string; // ISO-8601
  checklist: ChecklistItem[];
  comments: Comment[];
  activity: Activity[];
  timeEntries: TimeEntry[];
}

// ---- workflow / time-tracking layer ----------------------------------------

export interface Role {
  id: string;
  name: string;
  color: string; // hex, project-scoped
}

export interface StagePerm {
  pick: boolean; // take cards out of this stage
  drop: boolean; // move cards into this stage
  work: boolean; // act on cards / track time here
}

export interface Workflow {
  nodes: Record<string, { x: number; y: number }>; // designer canvas positions, keyed by listId
  edges: Array<{ from: string; to: string }>; // documents flow (NOT enforced)
  permissions: Record<string, Record<string, StagePerm>>; // listId -> roleId -> perm (ENFORCED)
  tracking: Record<string, string[]>; // roleId -> listIds the role may time-track
}

export interface Board {
  id: string;
  name: string;
  subtitle: string;
  accent: string; // hex
  visibility: Visibility;
  memberIds: string[]; // THE permission boundary
  lists: List[]; // ordered
  roles: Record<string, Role>;
  roleAssignments: Record<string, string>; // userId -> roleId
  workflow: Workflow;
}

// A board projection for grids/sidebars (no lists), with a derived card count.
export interface BoardSummary {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  visibility: Visibility;
  memberIds: string[];
  cardCount: number;
}

// ---- per-device sandbox state (the in-memory "DB" for one browser) ----------

export interface WorkspaceState {
  workspace: Workspace;
  users: Record<string, User>;
  labels: Record<string, Label>;
  boards: Record<string, Board>;
  cards: Card[];
  /** Who this device is currently signed in as (sandbox identity). */
  currentUserId: string | null;
  /** ISO anchor for "today" so seeded relative due-dates stay stable. */
  today: string;
  /** Demo order for the identity picker / persona switcher. */
  personaOrder: string[];
  createdAt: number;
  lastSeen: number;
}

// ---- actor abstraction -----------------------------------------------------
// Every domain + permission check reads an Actor, never a raw session.
// Today it's always the human; phase 2 adds the agent-as-user branch.

export interface Actor {
  userId: string;
  isAgent: boolean;
}
