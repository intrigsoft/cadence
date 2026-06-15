import { error, fail } from '@sveltejs/kit';
import {
  addCard,
  addChecklistItem,
  addComment,
  addList,
  assignMember,
  addLabel,
  cardsForBoard,
  getBoard,
  logTime,
  moveCard,
  patchCard,
  removeChecklistItem,
  removeLabel,
  runningTimer,
  startTimer,
  stopTimer,
  toggleChecklistItem,
  unassignMember
} from '$lib/server/domain';
import { workflowRole } from '$lib/server/permissions';
import { ForbiddenError, NotFoundError, ValidationError } from '$lib/server/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  let board;
  try {
    board = getBoard(locals.state, locals.actor, params.boardId);
  } catch (e) {
    if (e instanceof NotFoundError) throw error(404, 'Board not found');
    throw e;
  }
  return {
    board,
    cards: cardsForBoard(locals.state, locals.actor, params.boardId),
    labels: locals.state.labels,
    users: locals.state.users,
    myRole: workflowRole(board, locals.user!.id),
    runningTimer: runningTimer(locals.state, locals.actor),
    today: locals.state.today
  };
};

function guard<T>(fn: () => T) {
  try {
    fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(403, { error: e.message });
    if (e instanceof NotFoundError) return fail(404, { error: e.message });
    if (e instanceof ValidationError) return fail(422, { error: e.message });
    throw e;
  }
  return { ok: true };
}

export const actions: Actions = {
  move: async ({ request, locals }) => {
    const f = await request.formData();
    return guard(() =>
      moveCard(locals.state, locals.actor, String(f.get('cardId')), String(f.get('toListId')), Number(f.get('toIndex') ?? 0))
    );
  },
  addCard: async ({ request, params, locals }) => {
    const f = await request.formData();
    return guard(() => addCard(locals.state, locals.actor, params.boardId, String(f.get('listId')), String(f.get('title') ?? '')));
  },
  addList: async ({ request, params, locals }) => {
    const f = await request.formData();
    return guard(() => addList(locals.state, locals.actor, params.boardId, String(f.get('name') ?? '')));
  },
  setDesc: async ({ request, locals }) => {
    const f = await request.formData();
    return guard(() => patchCard(locals.state, locals.actor, String(f.get('cardId')), { desc: String(f.get('desc') ?? '') }));
  },
  setTitle: async ({ request, locals }) => {
    const f = await request.formData();
    return guard(() => patchCard(locals.state, locals.actor, String(f.get('cardId')), { title: String(f.get('title') ?? '') }));
  },
  setDue: async ({ request, locals }) => {
    const f = await request.formData();
    const due = f.get('due');
    return guard(() =>
      patchCard(locals.state, locals.actor, String(f.get('cardId')), { due: due ? String(due) : null })
    );
  },
  comment: async ({ request, locals }) => {
    const f = await request.formData();
    return guard(() => addComment(locals.state, locals.actor, String(f.get('cardId')), String(f.get('text') ?? '')));
  },
  addCheck: async ({ request, locals }) => {
    const f = await request.formData();
    return guard(() => addChecklistItem(locals.state, locals.actor, String(f.get('cardId')), String(f.get('text') ?? '')));
  },
  removeCheck: async ({ request, locals }) => {
    const f = await request.formData();
    return guard(() => removeChecklistItem(locals.state, locals.actor, String(f.get('cardId')), String(f.get('itemId'))));
  },
  // Toggles read current state server-side so the client needn't track it.
  toggleCheck: async ({ request, locals }) => {
    const f = await request.formData();
    const cardId = String(f.get('cardId'));
    const itemId = String(f.get('itemId'));
    return guard(() => {
      const card = locals.state.cards.find((c) => c.id === cardId);
      const item = card?.checklist.find((i) => i.id === itemId);
      toggleChecklistItem(locals.state, locals.actor, cardId, itemId, !(item?.done ?? false));
    });
  },
  toggleMember: async ({ request, locals }) => {
    const f = await request.formData();
    const cardId = String(f.get('cardId'));
    const userId = String(f.get('userId'));
    return guard(() => {
      const card = locals.state.cards.find((c) => c.id === cardId);
      if (card?.members.includes(userId)) unassignMember(locals.state, locals.actor, cardId, userId);
      else assignMember(locals.state, locals.actor, cardId, userId);
    });
  },
  toggleLabel: async ({ request, locals }) => {
    const f = await request.formData();
    const cardId = String(f.get('cardId'));
    const labelId = String(f.get('labelId'));
    return guard(() => {
      const card = locals.state.cards.find((c) => c.id === cardId);
      if (card?.labels.includes(labelId)) removeLabel(locals.state, locals.actor, cardId, labelId);
      else addLabel(locals.state, locals.actor, cardId, labelId);
    });
  },
  logTime: async ({ request, locals }) => {
    const f = await request.formData();
    return guard(() =>
      logTime(locals.state, locals.actor, String(f.get('cardId')), { minutes: Number(f.get('minutes') ?? 0), manual: true })
    );
  },
  startTimer: async ({ request, locals }) => {
    const f = await request.formData();
    return guard(() => startTimer(locals.state, locals.actor, String(f.get('cardId'))));
  },
  stopTimer: async ({ locals }) => {
    return guard(() => stopTimer(locals.state, locals.actor));
  }
};
