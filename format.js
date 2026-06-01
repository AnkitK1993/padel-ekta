// ── FORMATTING / ESCAPING UTILITIES ────────────────────────
// Pure string & date helpers — no DOM, no app state. Shared across the app.

// HTML-escape a value for safe interpolation into innerHTML templates.
export function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escape a value for use as a JS string argument inside an inline handler
// attribute, e.g. onclick="openPlayerDetail(${jsArg(name)})".
export function jsArg(value) {
  return escHtml(JSON.stringify(String(value ?? "")));
}

// Local (not UTC) date → ISO "YYYY-MM-DD". Empty string for invalid input.
export function toLocalISODate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── DATE FORMATTER ────────────────────────────────────────────
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "YYYY-MM-DD" → "D MMM YYYY", "MM-DD" → "D MMM", else the input unchanged.
export function fmtDate(raw) {
  if (!raw) return "—";
  const s = String(raw);
  // Full date: YYYY-MM-DD → DD MMM YYYY
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m)
    return Number(m[3]) + " " + MONTHS_SHORT[Number(m[2]) - 1] + " " + m[1];
  // Short: MM-DD → DD MMM
  m = s.match(/^(\d{2})-(\d{2})$/);
  if (m) return Number(m[2]) + " " + MONTHS_SHORT[Number(m[1]) - 1];
  return s;
}

// ── PLAYER IDENTITY (deterministic colour + initials) ───────
const _AV_COLORS = [
  "#18d7ff",
  "#36d47e",
  "#f5c842",
  "#f04f4f",
  "#b06dff",
  "#ff7a3d",
  "#62b6ff",
  "#ff5fa0",
  "#4ec9b0",
  "#c8a96e",
];

// Stable colour for a player name (same name → same colour every render).
export function playerColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return _AV_COLORS[h % _AV_COLORS.length];
}

// 1–2 letter avatar initials from a player name.
export function playerInitials(name) {
  const p = name.trim().split(/\s+/);
  return (
    p.length >= 2 ? p[0][0] + p[p.length - 1][0] : name.slice(0, 2)
  ).toUpperCase();
}
