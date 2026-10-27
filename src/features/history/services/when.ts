export type Group = 'Today' | 'Yesterday' | 'This week' | 'Earlier';

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);

/** History section for a chat last updated at `t`, by the phone's local calendar day. */
export function groupOf(t: number, now = Date.now()): Group {
  const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This week';
  return 'Earlier';
}

/** "9:41" today, "Mon" this week, "Oct 3" before that. */
export function timeLabel(t: number, now = Date.now()) {
  const d = new Date(t);
  const group = groupOf(t, now);
  if (group === 'Today') return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (group === 'Earlier') return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { weekday: 'short' });
}
