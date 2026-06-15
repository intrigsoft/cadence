import { invalidateAll } from '$app/navigation';
import { deserialize } from '$app/forms';
import type { ActionResult } from '@sveltejs/kit';
import { toast } from '$lib/stores';

/**
 * Post to a SvelteKit form action by name, then re-sync from the server (the
 * authoritative source). Used for the modal/popover mutations where a full
 * <form> per control would be noisy. Returns the action result so callers can
 * surface failures (e.g. a workflow-gated move rejected with 403).
 */
export async function postAction(
  routeId: string,
  action: string,
  fields: Record<string, string>
): Promise<ActionResult> {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  const res = await fetch(`${routeId}?/${action}`, {
    method: 'POST',
    headers: { 'x-sveltekit-action': 'true' },
    body
  });
  const result = deserialize(await res.text()) as ActionResult;
  if (result.type === 'failure') {
    const msg = (result.data?.error as string) ?? 'That action was not allowed.';
    toast(msg, 'deny');
  }
  if (result.type === 'success' || result.type === 'failure') await invalidateAll();
  return result;
}
