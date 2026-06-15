// Cadence MCP server — the relay DioscHub's MCP client connects to.
//
// It exposes the BROAD tool surface (the union of what the user could do on any
// accessible board). It enforces NOTHING itself: every tool forwards to the
// Cadence machine API carrying the per-call BYOA artifact (from `_meta`), and
// Cadence resolves the live per-board role and allows / denies per call. Which of
// these tools actually LOAD for a given session is DioscHub's toolset/role
// config, not this server's concern. See design/PHASE-2-ASSISTANT-INTEGRATION.md.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { enc, relay, type ToolExtra } from './api.js';

export function createCadenceMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'cadence', version: '0.1.0' },
    { instructions: 'Task-management tools for Cadence. You act AS the signed-in user with their exact permissions; never more. Every action is logged under their name. On a denial, explain the specific reason and stop — do not try alternate stages or boards. On a multi-step request, report exactly what succeeded and what did not.' }
  );

  // ---- Read (always safe) --------------------------------------------------

  server.registerTool('whoami', { description: 'The signed-in identity and how many boards they can access. Use to state who you are operating as.' }, (x) => relay(x as ToolExtra, 'GET', '/me'));

  server.registerTool('list_boards', { description: 'List the boards the current user can access (their permission scope).' }, (x) => relay(x as ToolExtra, 'GET', '/boards'));

  server.registerTool('get_board', { description: 'Get one board with its lists, members, roles and cards. Not found if the user is not a member.', inputSchema: { boardId: z.string() } }, ({ boardId }, x) => relay(x as ToolExtra, 'GET', `/boards/${enc(boardId)}`));

  server.registerTool('get_card', { description: 'Get a single card (description, checklist, comments, activity). Not found if hidden.', inputSchema: { cardId: z.string() } }, ({ cardId }, x) => relay(x as ToolExtra, 'GET', `/cards/${enc(cardId)}`));

  server.registerTool('search_cards', { description: 'Search cards by title/description/label across every board the user can access. Use this to find a task by name before acting on it.', inputSchema: { q: z.string() } }, ({ q }, x) => relay(x as ToolExtra, 'GET', `/cards/search?q=${encodeURIComponent(q)}`));

  server.registerTool('my_cards', { description: 'Cards assigned to the current user across accessible boards.' }, (x) => relay(x as ToolExtra, 'GET', '/cards/mine'));

  server.registerTool('time_report', { description: 'Aggregated time report for a board (by user, role and stage).', inputSchema: { boardId: z.string() } }, ({ boardId }, x) => relay(x as ToolExtra, 'GET', `/boards/${enc(boardId)}/time-report`));

  // ---- Collaborate (card + time writes) ------------------------------------

  server.registerTool('create_card', { description: 'Create a card at the end of a list.', inputSchema: { boardId: z.string(), listId: z.string(), title: z.string() } }, ({ boardId, listId, title }, x) => relay(x as ToolExtra, 'POST', '/cards', { boardId, listId, title }));

  server.registerTool('update_card', { description: 'Edit a card: title, description, and/or due date (ISO-8601, or null to clear).', inputSchema: { cardId: z.string(), title: z.string().optional(), desc: z.string().optional(), due: z.string().nullable().optional() } }, ({ cardId, ...patch }, x) => relay(x as ToolExtra, 'PATCH', `/cards/${enc(cardId)}`, patch));

  server.registerTool('delete_card', { description: 'Delete a card. Destructive — may require approval.', inputSchema: { cardId: z.string() } }, ({ cardId }, x) => relay(x as ToolExtra, 'DELETE', `/cards/${enc(cardId)}`));

  server.registerTool('move_card', { description: 'Move or reorder a card to a list at an index. Subject to the board workflow: your role needs pick on the source stage and drop on the target stage.', inputSchema: { cardId: z.string(), toListId: z.string(), toIndex: z.number().int().min(0) } }, ({ cardId, toListId, toIndex }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/move`, { toListId, toIndex }));

  server.registerTool('assign_member', { description: 'Assign a board member to a card.', inputSchema: { cardId: z.string(), userId: z.string() } }, ({ cardId, userId }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/members`, { userId }));

  server.registerTool('unassign_member', { description: 'Remove an assignee from a card.', inputSchema: { cardId: z.string(), userId: z.string() } }, ({ cardId, userId }, x) => relay(x as ToolExtra, 'DELETE', `/cards/${enc(cardId)}/members/${enc(userId)}`));

  server.registerTool('add_label', { description: 'Add a label to a card.', inputSchema: { cardId: z.string(), labelId: z.string() } }, ({ cardId, labelId }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/labels`, { labelId }));

  server.registerTool('remove_label', { description: 'Remove a label from a card.', inputSchema: { cardId: z.string(), labelId: z.string() } }, ({ cardId, labelId }, x) => relay(x as ToolExtra, 'DELETE', `/cards/${enc(cardId)}/labels/${enc(labelId)}`));

  server.registerTool('add_comment', { description: 'Post a comment on a card (logged under the user).', inputSchema: { cardId: z.string(), text: z.string() } }, ({ cardId, text }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/comments`, { text }));

  server.registerTool('add_checklist_item', { description: 'Add a checklist item to a card.', inputSchema: { cardId: z.string(), text: z.string() } }, ({ cardId, text }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/checklist`, { text }));

  server.registerTool('toggle_checklist_item', { description: 'Check or uncheck a checklist item.', inputSchema: { cardId: z.string(), itemId: z.string(), done: z.boolean() } }, ({ cardId, itemId, done }, x) => relay(x as ToolExtra, 'PATCH', `/cards/${enc(cardId)}/checklist/${enc(itemId)}`, { done }));

  server.registerTool('remove_checklist_item', { description: 'Remove a checklist item from a card.', inputSchema: { cardId: z.string(), itemId: z.string() } }, ({ cardId, itemId }, x) => relay(x as ToolExtra, 'DELETE', `/cards/${enc(cardId)}/checklist/${enc(itemId)}`));

  server.registerTool('log_time', { description: 'Log time (minutes) on a card. Your role must be allowed to track time on the card’s stage.', inputSchema: { cardId: z.string(), minutes: z.number().int().positive(), manual: z.boolean().optional(), listId: z.string().optional() } }, ({ cardId, ...input }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/time`, input));

  server.registerTool('start_timer', { description: 'Start a time-tracking timer on a card (auto-stops any other running timer first).', inputSchema: { cardId: z.string() } }, ({ cardId }, x) => relay(x as ToolExtra, 'POST', `/cards/${enc(cardId)}/timer`));

  server.registerTool('stop_timer', { description: 'Stop the running timer and log the elapsed minutes.' }, (x) => relay(x as ToolExtra, 'DELETE', '/timer'));

  server.registerTool('running_timer', { description: 'The current user’s running timer, if any.' }, (x) => relay(x as ToolExtra, 'GET', '/timer'));

  // ---- Manage (structure; high-privilege) ----------------------------------

  server.registerTool('create_board', { description: 'Create a new board (the creator becomes its sole initial member).', inputSchema: { name: z.string(), accent: z.string(), visibility: z.enum(['private', 'workspace']) } }, ({ name, accent, visibility }, x) => relay(x as ToolExtra, 'POST', '/boards', { name, accent, visibility }));

  server.registerTool('add_list', { description: 'Add a stage (list) to a board.', inputSchema: { boardId: z.string(), name: z.string() } }, ({ boardId, name }, x) => relay(x as ToolExtra, 'POST', `/boards/${enc(boardId)}/lists`, { name }));

  server.registerTool('add_board_member', { description: 'Add a member to a board (changes who can access it). May require approval.', inputSchema: { boardId: z.string(), userId: z.string() } }, ({ boardId, userId }, x) => relay(x as ToolExtra, 'POST', `/boards/${enc(boardId)}/members`, { userId }));

  server.registerTool('remove_board_member', { description: 'Remove a member from a board. May require approval.', inputSchema: { boardId: z.string(), userId: z.string() } }, ({ boardId, userId }, x) => relay(x as ToolExtra, 'DELETE', `/boards/${enc(boardId)}/members/${enc(userId)}`));

  server.registerTool('save_workflow', { description: 'Replace a board’s editable structure: lists, roles, role assignments, and the stage×role workflow. Admin-only.', inputSchema: { boardId: z.string(), lists: z.array(z.any()).optional(), roles: z.record(z.string(), z.any()).optional(), roleAssignments: z.record(z.string(), z.string()).optional(), workflow: z.any().optional() } }, ({ boardId, ...payload }, x) => relay(x as ToolExtra, 'PUT', `/boards/${enc(boardId)}/workflow`, payload));

  return server;
}
