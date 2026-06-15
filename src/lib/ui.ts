// Shared client UI helpers — ported from design/prototype/helpers.jsx +
// workflow-data.js. Date helpers default to the seed's "today" anchor so
// relative due-dates match the prototype + screenshots.

export const SEED_TODAY = new Date('2026-06-10T09:00:00.000Z');

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export type DueTone = 'over' | 'today' | 'soon' | 'normal';
export interface DueMeta {
  tone: DueTone;
  text: string;
  days: number;
}

export function dueMeta(iso: string | undefined | null, today: Date = SEED_TODAY): DueMeta | null {
  if (!iso) return null;
  const d = new Date(iso);
  const days = Math.round((d.getTime() - today.getTime()) / (24 * 3600 * 1000));
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  let tone: DueTone = 'normal';
  let text = label;
  if (days < 0) tone = 'over';
  else if (days === 0) {
    tone = 'today';
    text = 'Today';
  } else if (days === 1) {
    tone = 'soon';
    text = 'Tomorrow';
  } else if (days <= 3) tone = 'soon';
  return { tone, text, days };
}

export function timeAgo(iso: string, today: Date = SEED_TODAY): string {
  const d = new Date(iso);
  const mins = Math.round((today.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtMins(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${String(r).padStart(2, '0')}m` : `${h}h`;
}

export function parseDuration(s: string): number | null {
  const str = (s || '').trim().toLowerCase();
  if (!str) return null;
  let m = 0;
  let ok = false;
  const h = str.match(/(\d+(?:\.\d+)?)\s*h/);
  if (h) {
    m += parseFloat(h[1]) * 60;
    ok = true;
  }
  const mm = str.match(/(\d+)\s*m/);
  if (mm) {
    m += parseInt(mm[1], 10);
    ok = true;
  }
  if (!ok && /^\d+(\.\d+)?$/.test(str)) {
    m = parseFloat(str);
    ok = true;
  }
  return ok ? Math.round(m) : null;
}

/** Darken a hex color toward ink for the board cover gradient. */
export function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = 0.62;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

/** Darken a label color for readable text on its tint. */
export function shadeText(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = 0.7;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', member: 'Member', guest: 'Guest' };
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}
