/** Plain-text error from anything supabase / fetch / Error may throw. */
export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [o.message, o.details, o.hint].filter(Boolean);
    if (parts.length) return parts.join(' — ') + (o.code ? ` (code ${o.code})` : '');
  }
  return 'something unexpected happened';
}

export const pad = (n: number) => String(n).padStart(2, '0');

/** yyyy-mm-dd in the browser's local time. */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** yyyy-mm-dd → Date at local noon (avoids timezone day-shift). */
export function parseDateKey(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function longDate(d: Date | string): string {
  const dt = typeof d === 'string' ? (d.length === 10 ? parseDateKey(d) : new Date(d)) : d;
  return dt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function shortDate(d: Date | string): string {
  const dt = typeof d === 'string' ? (d.length === 10 ? parseDateKey(d) : new Date(d)) : d;
  return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeOf(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return 'not yet';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return shortDate(iso);
}

export function greetingFor(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export function clockIn(tz: string, now: Date): { time: string; day: string; hour: number } {
  try {
    const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(now);
    const day = new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: tz }).format(now);
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: tz }).format(now)) % 24;
    return { time, day, hour };
  } catch {
    return { time: timeOf(now), day: now.toLocaleDateString(undefined, { weekday: 'long' }), hour: now.getHours() };
  }
}

export function daysBetween(fromKey: string, to: Date = new Date()): number {
  const a = parseDateKey(fromKey);
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 12);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function countdownParts(targetKey: string, now: number): { days: number; hours: number; minutes: number; seconds: number; done: boolean } {
  // Opens at local midnight of the opening date.
  const t = parseDateKey(targetKey);
  t.setHours(0, 0, 0, 0);
  const ms = t.getTime() - now;
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    done: false,
  };
}

export const loveLabel = (v: number): string =>
  v >= 100 ? 'There is no measurement for this' : v >= 70 ? 'Completely yours' : v >= 50 ? 'More than yesterday' : v >= 30 ? 'Quite a lot' : 'A little love';

export const missLabel = (v: number): string =>
  v >= 100 ? 'Come home soon' : v >= 70 ? 'Missing you so much' : v >= 50 ? 'Thinking of you often' : v >= 30 ? 'Missing you a little' : 'A gentle thought';
