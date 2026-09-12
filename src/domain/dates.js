// ── DATE / PERIOD HELPERS ──────────────────────────────────
// Pure local-date period boundaries (today / this-week / weekend / month /
// last-week), all expressed as YYYY-MM-DD via toLocalISODate. Extracted from
// app.js so feature modules (selectors, the analytics features) can import them
// directly instead of having them injected or reaching back into app.js.
import { toLocalISODate } from "../ui/format.js";

export function todayISO() {
  return toLocalISODate();
}

export function weekISO() {
  const d = new Date(),
    day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return toLocalISODate(d);
}

export function weekendRange() {
  const now = new Date(),
    day = now.getDay();
  const sat = new Date(now);
  sat.setDate(now.getDate() + (day === 0 ? -1 : 6 - day));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return {
    from: toLocalISODate(sat),
    to: toLocalISODate(sun),
  };
}

export function monthISO() {
  const d = new Date();
  d.setDate(1);
  return toLocalISODate(d);
}

export function lastWeekRange() {
  const d = new Date(),
    day = d.getDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(d);
  thisMonday.setDate(d.getDate() - daysToMonday);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  return {
    from: toLocalISODate(lastMonday),
    to: toLocalISODate(lastSunday),
  };
}
