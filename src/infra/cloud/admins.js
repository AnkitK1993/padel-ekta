// ── ADMINS + ADMIN ACTIVITY LOG (Firestore) ─────────────────
// One superadmin (SUPERADMIN_EMAIL) manages a list of admins kept in
// config/admins { emails: [...] }. Every admin's match adds, edits and deletes
// are appended to the adminLog collection, which only the superadmin can read.
// firestore.rules enforces all of this on the server — the checks here only
// decide what the UI shows.
import { db, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from "./firebase.js";
import { noteError } from "../log.js";

export const SUPERADMIN_EMAIL = "ankit.konchady@gmail.com";

export const normEmail = (e) => String(e || "").trim().toLowerCase();
export const isSuperAdminEmail = (e) => normEmail(e) === SUPERADMIN_EMAIL;

// Admin emails (lower-case). Falls back to the last list this device saw when
// the cloud can't be reached (offline), so an admin stays an admin offline.
const CACHE_KEY = "padel_admin_emails";
export async function loadAdminEmails() {
  try {
    const snap = await getDoc(doc(db, "config", "admins"));
    const list = snap.exists() ? snap.data().emails : [];
    const clean = Array.isArray(list) ? list.map(normEmail).filter(Boolean) : [];
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(clean));
    } catch (e) {
      noteError("admins:cache", e);
    }
    return clean;
  } catch (e) {
    noteError("admins:load", e);
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    } catch (e2) {
      return [];
    }
  }
}

export async function saveAdminEmails(emails) {
  const clean = [...new Set(emails.map(normEmail).filter(Boolean))].filter((e) => !isSuperAdminEmail(e));
  await setDoc(doc(db, "config", "admins"), { emails: clean });
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(clean));
  } catch (e) {
    noteError("admins:cache", e);
  }
  return clean;
}

// ── Activity log ─────────────────────────────────────────────
// Entries that couldn't be written (offline, rules not yet published) wait in
// localStorage and go out with the next entry / when back online.
const PENDING_KEY = "padel_adminlog_pending";
function _pending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch (e) {
    return [];
  }
}
function _setPending(list) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-200)));
  } catch (e) {
    noteError("admins:pending", e);
  }
}

export async function flushAdminLog() {
  const queue = _pending();
  if (!queue.length || !navigator.onLine) return;
  const left = [];
  for (const entry of queue) {
    try {
      await addDoc(collection(db, "adminLog"), entry);
    } catch (e) {
      left.push(entry);
    }
  }
  _setPending(left);
}

// entry: { id, at, by, action, detail, undo? }
export function appendAdminLog(entry) {
  // Firestore rejects `undefined` fields.
  const clean = JSON.parse(JSON.stringify(entry));
  _setPending([..._pending(), clean]);
  return flushAdminLog().catch((e) => noteError("admins:append", e));
}

export async function fetchAdminLog(n = 200) {
  const snap = await getDocs(query(collection(db, "adminLog"), orderBy("at", "desc"), limit(n)));
  return snap.docs.map((d) => ({ ...d.data(), _docId: d.id }));
}

// Marks an entry undone (superadmin only, by the rules).
export async function markAdminLogUndone(docId) {
  await setDoc(doc(db, "adminLog", docId), { undone: true }, { merge: true });
}
