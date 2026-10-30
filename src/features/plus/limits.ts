/** Quiz me and Practice together, per student per day, on the free plan. */
export const FREE_DAILY = 5;

/** Today's count for one student. `day` is the local date, so it resets at local midnight. */
export type Usage = { day: string; used: number };

export function dayKey(now: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function usedToday(usage: Usage | undefined, now: Date) {
  return usage?.day === dayKey(now) ? usage.used : 0;
}

/** Starts left today; Infinity on Plus. */
export function remaining(usage: Usage | undefined, now: Date, isPlus: boolean) {
  return isPlus ? Infinity : Math.max(0, FREE_DAILY - usedToday(usage, now));
}

/** Usage after one more start. Plus starts are counted too, so a lapsed Plus student sees an honest count. */
export function record(usage: Usage | undefined, now: Date): Usage {
  return { day: dayKey(now), used: usedToday(usage, now) + 1 };
}
