// Cadence MCP server — the relay DioscHub's MCP client connects to.
//
// It exposes the BROAD tool surface (the union of what the user could do on any
// accessible board). It enforces NOTHING itself: every tool forwards to the
// Cadence machine API carrying the per-call BYOA artifact (from `_meta`), and
// Cadence resolves the live per-board role and allows / denies per call. Which of
// these tools actually LOAD for a given session is DioscHub's toolset/role
// config, not this server's concern. See design/PHASE-2-ASSISTANT-INTEGRATION.md.
//
// Tools are INTENT-shaped, not endpoint-shaped: `create_card` / `update_card`
// take a whole card (title + desc + due + labels + assignees + checklist) and
// fan out to the granular REST endpoints internally. Those internal hops are
// server-to-server and free; only the model↔MCP round-trip is metered against
// the user's quota — so collapsing "create then label then assign then check…"
// into one tool call is the whole point.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { artifactFor, call, enc, relay, toToolResult, type ApiResult, type ToolExtra } from './api.js';

// Minimal shapes the composite handlers read back from the machine API.
interface ChecklistItemShape { id: string; text: string; done: boolean }
interface CardShape { id: string; labels: string[]; members: string[]; checklist: ChecklistItemShape[] }

interface OpOutcome { op: string; ok: boolean; code?: string; message?: string }

/** Run one internal REST call and capture its outcome for the composite report. */
async function runOp(op: string, p: Promise<ApiResult>): Promise<OpOutcome> {
  const r = await p;
  return { op, ok: r.ok, code: r.code, message: r.message };
}

/**
 * Build a composite tool result: the final card state plus a per-step ledger of
 * what landed and what didn't. A partial failure is reported IN-BAND (not as
 * isError) so the model can say exactly what succeeded — only an all-steps-failed
 * outcome is surfaced as a hard error.
 */
function composite(cardId: string, final: ApiResult, outcomes: OpOutcome[]): CallToolResult {
  const failed = outcomes.filter((o) => !o.ok);
  const payload = {
    card: final.ok ? final.data : { id: cardId },
    applied: outcomes.filter((o) => o.ok).map((o) => o.op),
    ...(failed.length ? { partial: true, failed: failed.map(({ op, code, message }) => ({ op, code, message })) } : {}),
  };
  const allFailed = outcomes.length > 0 && failed.length === outcomes.length;
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], isError: allFailed || undefined };
}

export function createCadenceMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'cadence', version: '0.1.0' },
    { instructions: 'Task-management tools for Cadence. You act AS the signed-in user with their exact permissions; never more. Every action is logged under their name. On a denial, explain the specific reason and stop — do not try alternate stages or boards. On a multi-step request, report exactly what succeeded and what did not.' }
  );

  // ---- Read (always safe) --------------------------------------------------

  server.registerTool('whoami', { description: 'The signed-in identity and how many boards they can access. Use to state who you are operating as.' }, (x) => relay(x as ToolExtra, 'GET', '/me'));

  server.registerTool('list_boards', { description: 'List the boards the current user can access (their permission scope).' }, (x) => relay(x as ToolExtra, 'GET', '/boards'));

  server.registerTool('get_board', { description: 'Get one board with its lists, members, roles, labels and cards. Use it to learn the listId / labelId / userId values that create_card and update_card need. Not found if the user is not a member.', inputSchema: { boardId: z.string() } }, ({ boardId }, x) => relay(x as ToolExtra, 'GET', `/boards/${enc(boardId)}`));

  server.registerTool('get_card', { description: 'Get a single card (description, labels, members, checklist, comments, activity). Use it to read current labels/assignees/checklist before reconciling them with update_card. Not found if hidden.', inputSchema: { cardId: z.string() } }, ({ cardId }, x) => relay(x as ToolExtra, 'GET', `/cards/${enc(cardId)}`));

  server.registerTool('search_cards', { description: 'Search cards by title/description/label across every board the user can access. Use this to find a task by name before acting on it.', inputSchema: { q: z.string() } }, ({ q }, x) => relay(x as ToolExtra, 'GET', `/cards/search?q=${encodeURIComponent(q)}`));

  server.registerTool('my_cards', { description: 'Cards assigned to the current user across accessible boards.' }, (x) => relay(x as ToolExtra, 'GET', '/cards/mine'));

  server.registerTool('time_report', { description: 'Aggregated time report for a board (by user, role and stage).', inputSchema: { boardId: z.string() } }, ({ boardId }, x) => relay(x as ToolExtra, 'GET', `/boards/${enc(boardId)}/time-report`));

  // ---- Collaborate (card + time writes) ------------------------------------

  // create_card and update_card are intentionally "fat": one call builds or
  // edits a whole card. Do NOT follow a create_card with an update_card to set
  // fields you could have passed up front.

  server.registerTool(
    'create_card',
    {
      description:
        'Create a card and fully populate it in ONE call: title plus optional description, due date (ISO-8601), labelIds, assigneeIds, and checklist item texts. Always prefer this over creating then editing — never follow create_card with update_card just to fill in fields you could pass here. Get the listId / labelId / userId values from get_board first.',
      inputSchema: {
        boardId: z.string(),
        listId: z.string(),
        title: z.string(),
        desc: z.string().optional(),
        due: z.string().nullable().optional(),
        labelIds: z.array(z.string()).optional(),
        assigneeIds: z.array(z.string()).optional(),
        checklist: z.array(z.string()).optional(),
      },
    },
    async ({ boardId, listId, title, desc, due, labelIds, assigneeIds, checklist }, x) => {
      const artifact = artifactFor(x as ToolExtra);

      // The card must exist before anything else can be keyed to it.
      const created = await call('POST', '/cards', { boardId, listId, title }, artifact);
      if (!created.ok) return toToolResult(created);
      const cardId = (created.data as CardShape).id;

      // Everything optional fans out to the existing granular endpoints.
      const outcomes: OpOutcome[] = [];
      if (desc !== undefined || due !== undefined) {
        const patch: Record<string, unknown> = {};
        if (desc !== undefined) patch.desc = desc;
        if (due !== undefined) patch.due = due;
        outcomes.push(await runOp('details', call('PATCH', `/cards/${enc(cardId)}`, patch, artifact)));
      }
      for (const labelId of labelIds ?? []) outcomes.push(await runOp(`label:${labelId}`, call('POST', `/cards/${enc(cardId)}/labels`, { labelId }, artifact)));
      for (const userId of assigneeIds ?? []) outcomes.push(await runOp(`assignee:${userId}`, call('POST', `/cards/${enc(cardId)}/members`, { userId }, artifact)));
      for (const text of checklist ?? []) outcomes.push(await runOp(`checklist:${text}`, call('POST', `/cards/${enc(cardId)}/checklist`, { text }, artifact)));

      const final = await call('GET', `/cards/${enc(cardId)}`, undefined, artifact);
      return composite(cardId, final, outcomes);
    }
  );

  server.registerTool(
    'update_card',
    {
      description:
        'Update a card in ONE call. Send only the fields you want to change; omit a field to leave it untouched. Scalars (title, desc, due — pass due null to clear it) are overwritten. labelIds, assigneeIds and checklist are the COMPLETE desired set: the card is reconciled to match exactly, so anything you leave out of the array is removed. Pass [] to clear a collection. Read the current ids with get_card / get_board first.',
      inputSchema: {
        cardId: z.string(),
        title: z.string().optional(),
        desc: z.string().optional(),
        due: z.string().nullable().optional(),
        labelIds: z.array(z.string()).optional(),
        assigneeIds: z.array(z.string()).optional(),
        checklist: z.array(z.object({ text: z.string(), done: z.boolean().optional() })).optional(),
      },
    },
    async ({ cardId, title, desc, due, labelIds, assigneeIds, checklist }, x) => {
      const artifact = artifactFor(x as ToolExtra);
      const reconciling = labelIds !== undefined || assigneeIds !== undefined || checklist !== undefined;

      // Read current state only when a collection needs diffing.
      let current: CardShape | undefined;
      if (reconciling) {
        const got = await call('GET', `/cards/${enc(cardId)}`, undefined, artifact);
        if (!got.ok) return toToolResult(got);
        current = got.data as CardShape;
      }

      const outcomes: OpOutcome[] = [];

      // Scalars collapse into a single PATCH.
      if (title !== undefined || desc !== undefined || due !== undefined) {
        const patch: Record<string, unknown> = {};
        if (title !== undefined) patch.title = title;
        if (desc !== undefined) patch.desc = desc;
        if (due !== undefined) patch.due = due;
        outcomes.push(await runOp('details', call('PATCH', `/cards/${enc(cardId)}`, patch, artifact)));
      }

      // Labels — reconcile to the desired set.
      if (labelIds !== undefined && current) {
        const want = new Set(labelIds);
        const have = new Set(current.labels);
        for (const id of labelIds) if (!have.has(id)) outcomes.push(await runOp(`+label:${id}`, call('POST', `/cards/${enc(cardId)}/labels`, { labelId: id }, artifact)));
        for (const id of current.labels) if (!want.has(id)) outcomes.push(await runOp(`-label:${id}`, call('DELETE', `/cards/${enc(cardId)}/labels/${enc(id)}`, undefined, artifact)));
      }

      // Assignees — reconcile to the desired set.
      if (assigneeIds !== undefined && current) {
        const want = new Set(assigneeIds);
        const have = new Set(current.members);
        for (const id of assigneeIds) if (!have.has(id)) outcomes.push(await runOp(`+assignee:${id}`, call('POST', `/cards/${enc(cardId)}/members`, { userId: id }, artifact)));
        for (const id of current.members) if (!want.has(id)) outcomes.push(await runOp(`-assignee:${id}`, call('DELETE', `/cards/${enc(cardId)}/members/${enc(id)}`, undefined, artifact)));
      }

      // Checklist — reconcile to the desired set, matched by text so unchanged
      // items keep their id and done-state; a changed `done` toggles in place.
      if (checklist !== undefined && current) {
        const wantTexts = new Set(checklist.map((c) => c.text));
        for (const item of current.checklist) {
          if (!wantTexts.has(item.text)) outcomes.push(await runOp(`-check:${item.text}`, call('DELETE', `/cards/${enc(cardId)}/checklist/${enc(item.id)}`, undefined, artifact)));
        }
        for (const want of checklist) {
          const match = current.checklist.find((e) => e.text === want.text);
          const wantDone = want.done ?? false;
          if (!match) {
            const added = await call('POST', `/cards/${enc(cardId)}/checklist`, { text: want.text }, artifact);
            outcomes.push({ op: `+check:${want.text}`, ok: added.ok, code: added.code, message: added.message });
            if (added.ok && wantDone) {
              const newId = (added.data as ChecklistItemShape | undefined)?.id;
              if (newId) outcomes.push(await runOp(`check-done:${want.text}`, call('PATCH', `/cards/${enc(cardId)}/checklist/${enc(newId)}`, { done: true }, artifact)));
            }
          } else if (match.done !== wantDone) {
            outcomes.push(await runOp(`check-toggle:${want.text}`, call('PATCH', `/cards/${enc(cardId)}/checklist/${enc(match.id)}`, { done: wantDone }, artifact)));
          }
        }
      }

      const final = await call('GET', `/cards/${enc(cardId)}`, undefined, artifact);
      // Nothing was requested → just hand back the current card.
      if (outcomes.length === 0) return toToolResult(final);
      return composite(cardId, final, outcomes);
    }
  );

  server.registerTool('delete_card', { description: 'Delete a card. Destructive — may require approval.', inputSchema: { cardId: z.string() } }, ({ cardId }, x) => relay(x as ToolExtra, 'DELETE', `/cards/${enc(cardId)}`));

  server.registerTool('move_card', { description: 'Move or reorder a card to a list at an index. Subject to the board workflow: your role needs pick on the source stage and drop on the target stage.', inputSchema: { cardId: z.string(), toListId: z.string(), toIndex: z.number().int().min(0) } }, ({ cardId, toListId, toIndex }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/move`, { toListId, toIndex }));

  server.registerTool('add_comment', { description: 'Post a comment on a card (logged under the user). Comments are append-only — this is separate from update_card.', inputSchema: { cardId: z.string(), text: z.string() } }, ({ cardId, text }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/comments`, { text }));

  server.registerTool('log_time', { description: 'Log time (minutes) on a card. Your role must be allowed to track time on the card’s stage.', inputSchema: { cardId: z.string(), minutes: z.number().int().positive(), manual: z.boolean().optional(), listId: z.string().optional() } }, ({ cardId, ...input }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/time`, input));

  server.registerTool('start_timer', { description: 'Start a time-tracking timer on a card (auto-stops any other running timer first).', inputSchema: { cardId: z.string() } }, ({ cardId }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/timer`));

  server.registerTool('stop_timer', { description: 'Stop the running timer and log the elapsed minutes.' }, (x) => relay(x as ToolExtra, 'DELETE', '/timer'));

  server.registerTool('running_timer', { description: 'The current user’s running timer, if any.' }, (x) => relay(x as ToolExtra, 'GET', '/timer'));

  // ---- Manage: boards & membership (high-privilege; admin) -----------------

  server.registerTool('create_board', { description: 'Create a new board (the creator becomes its sole initial member).', inputSchema: { name: z.string(), accent: z.string(), visibility: z.enum(['private', 'workspace']) } }, ({ name, accent, visibility }, x) => relay(x as ToolExtra, 'POST', '/boards', { name, accent, visibility }));

  server.registerTool('add_board_member', { description: 'Add a member to a board (changes who can access it). May require approval.', inputSchema: { boardId: z.string(), userId: z.string() } }, ({ boardId, userId }, x) => relay(x as ToolExtra, 'POST', `/boards/${enc(boardId)}/members`, { userId }));

  server.registerTool('remove_board_member', { description: 'Remove a member from a board. May require approval.', inputSchema: { boardId: z.string(), userId: z.string() } }, ({ boardId, userId }, x) => relay(x as ToolExtra, 'DELETE', `/boards/${enc(boardId)}/members/${enc(userId)}`));

  server.registerTool('assign_board_role', { description: 'Assign a board member to one of the board’s project roles (Lead, Developer, QA, …), or pass roleId null to clear it. The user must already be a member. Get userId and the role ids from get_board.', inputSchema: { boardId: z.string(), userId: z.string(), roleId: z.string().nullable() } }, ({ boardId, userId, roleId }, x) => relay(x as ToolExtra, 'PUT', `/boards/${enc(boardId)}/members/${enc(userId)}/role`, { roleId }));

  // ---- Manage: workflow & stages (high-privilege; admin) -------------------
  //
  // Granular, single-purpose edits. Each changes exactly one thing, so a change
  // can't clobber unrelated stages/roles — preferred over a whole-graph replace.

  server.registerTool('add_list', { description: 'Add a new stage (list) to the end of a board. To place it elsewhere, follow with reorder_stage.', inputSchema: { boardId: z.string(), name: z.string() } }, ({ boardId, name }, x) => relay(x as ToolExtra, 'POST', `/boards/${enc(boardId)}/lists`, { name }));

  server.registerTool('rename_stage', { description: 'Rename a single stage on a board. Get listId from get_board.', inputSchema: { boardId: z.string(), listId: z.string(), name: z.string() } }, ({ boardId, listId, name }, x) => relay(x as ToolExtra, 'PATCH', `/boards/${enc(boardId)}/stages/${enc(listId)}`, { name }));

  server.registerTool('remove_stage', { description: 'Delete a stage from a board. Fails if any cards are still in it — move them out first.', inputSchema: { boardId: z.string(), listId: z.string() } }, ({ boardId, listId }, x) => relay(x as ToolExtra, 'DELETE', `/boards/${enc(boardId)}/stages/${enc(listId)}`));

  server.registerTool('reorder_stage', { description: 'Move a stage to a new position (0-based index) in the board’s left-to-right order. Use after add_list to place a new stage.', inputSchema: { boardId: z.string(), listId: z.string(), toIndex: z.number().int().min(0) } }, ({ boardId, listId, toIndex }, x) => relay(x as ToolExtra, 'POST', `/boards/${enc(boardId)}/stages/${enc(listId)}/reorder`, { toIndex }));

  server.registerTool('set_stage_permission', { description: 'Set ONE role’s permissions on ONE stage: pick (take cards out), drop (move cards in), work (act on / track here). Pass only the verbs you want to change; omitted verbs are left unchanged. Get listId and roleId from get_board.', inputSchema: { boardId: z.string(), listId: z.string(), roleId: z.string(), pick: z.boolean().optional(), drop: z.boolean().optional(), work: z.boolean().optional() } }, ({ boardId, listId, ...perm }, x) => relay(x as ToolExtra, 'PUT', `/boards/${enc(boardId)}/stages/${enc(listId)}/permissions`, perm));

  server.registerTool('set_stage_tracking', { description: 'Allow or disallow a role from tracking time on a stage.', inputSchema: { boardId: z.string(), listId: z.string(), roleId: z.string(), enabled: z.boolean() } }, ({ boardId, listId, roleId, enabled }, x) => relay(x as ToolExtra, 'PUT', `/boards/${enc(boardId)}/stages/${enc(listId)}/tracking`, { roleId, enabled }));

  return server;
}
