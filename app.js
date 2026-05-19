import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLXji1E8S_i2zLiYphHKjPLtpo9ODvOlI",
  authDomain: "padelekta-99316.firebaseapp.com",
  databaseURL:
    "https://padelekta-99316-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "padelekta-99316",
  storageBucket: "padelekta-99316.firebasestorage.app",
  messagingSenderId: "742104410143",
  appId: "1:742104410143:web:2d546ca8ab2f7ca16f4d2a",
  measurementId: "G-LN19GL652D",
};

const ADMIN_EMAIL = "ankit.konchady@gmail.com";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

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
function fmtDate(raw) {
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

// ── HAMBURGER MENU ─────────────────────────────────────────
function toggleHamburgerMenu() {
  const menu = document.getElementById("hamburger-menu");
  const btn = document.getElementById("hamburgerBtn");
  if (!menu) return;
  const open = menu.classList.toggle("open");
  btn.classList.toggle("active", open);
  if (open) {
    const close = (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove("open");
        btn.classList.remove("active");
        document.removeEventListener("click", close, true);
      }
    };
    setTimeout(() => document.addEventListener("click", close, true), 0);
  }
}

// ── TOAST ──────────────────────────────────────────────────
function showToast(msg, emoji = "🎉", duration = 4000) {
  const el = document.createElement("div");
  el.className = "milestone-toast";
  el.innerHTML = `<span class="toast-icon">${emoji}</span><span>${msg}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-show"));
  setTimeout(() => {
    el.classList.remove("toast-show");
    setTimeout(() => el.remove(), 400);
  }, duration);
}

const MILESTONE_LOG_KEY = "padel_milestone_log";
function getMilestoneLog() {
  try {
    return JSON.parse(localStorage.getItem(MILESTONE_LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveMilestoneEntry(msg, emoji) {
  const log = getMilestoneLog();
  log.unshift({ msg, emoji, date: todayISO() });
  if (log.length > 100) log.length = 100;
  try {
    localStorage.setItem(MILESTONE_LOG_KEY, JSON.stringify(log));
  } catch (e) {}
}

function checkMilestones(prevMatches, newMatches) {
  const milestones = [10, 25, 50, 100, 200];
  const allPlayers = new Set();
  newMatches.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => allPlayers.add(p)),
  );
  allPlayers.forEach((player) => {
    const prevCount = prevMatches.filter(
      (m) =>
        (m.teamA || []).includes(player) || (m.teamB || []).includes(player),
    ).length;
    const newCount = newMatches.filter(
      (m) =>
        (m.teamA || []).includes(player) || (m.teamB || []).includes(player),
    ).length;
    milestones.forEach((n) => {
      if (prevCount < n && newCount >= n) {
        showToast(`${player} hit ${n} matches!`, "🏅");
        saveMilestoneEntry(`${player} hit ${n} matches!`, "🏅");
      }
    });
  });
  // Check for win streaks hitting milestones
  const streakMilestones = [3, 5, 10];
  allPlayers.forEach((player) => {
    const prevStats = computeStats(prevMatches);
    const newStats = computeStats(newMatches);
    const prev = prevStats.find((s) => s.name === player);
    const cur = newStats.find((s) => s.name === player);
    if (!prev || !cur) return;
    streakMilestones.forEach((n) => {
      if (
        (prev.curStreak || 0) < n &&
        (cur.curStreak || 0) >= n &&
        cur.curType === "W"
      ) {
        showToast(`${player} is on a ${n}-match win streak!`, "🔥");
        saveMilestoneEntry(`${player} is on a ${n}-match win streak!`, "🔥");
      }
    });
    // Rank change (top 3)
    const prevRank = prevStats.findIndex((s) => s.name === player) + 1;
    const newRank = newStats.findIndex((s) => s.name === player) + 1;
    if (prevRank > 1 && newRank === 1) {
      showToast(`${player} is now #1!`, "👑");
      saveMilestoneEntry(`${player} is now #1!`, "👑");
    } else if (prevRank > 3 && newRank <= 3) {
      showToast(`${player} entered the Top 3!`, "🥉");
      saveMilestoneEntry(`${player} entered the Top 3!`, "🥉");
    }
  });
  // ELO threshold milestones
  const eloThresholds = [1050, 1100, 1150, 1200, 1250, 1300];
  if (prevMatches.length > 0) {
    const prevEloMap = computeElo(prevMatches);
    const newEloMap = computeElo(newMatches);
    allPlayers.forEach((player) => {
      const prev = prevEloMap[player] || 1000;
      const curr = newEloMap[player] || 1000;
      eloThresholds.forEach((t) => {
        if (prev < t && curr >= t) {
          const display = normPlayer(player);
          showToast(`${display} hit ELO ${t}!`, "⚡");
          saveMilestoneEntry(`${display} hit ELO ${t}!`, "⚡");
        }
      });
    });
  }
}

// ── STATE ──────────────────────────────────────────────────
let allMatches = [];
let nameMap = {};
let aliasMap = {};
let calYear = new Date().getFullYear(),
  calMonth = new Date().getMonth();
let matchTabFilter = "today",
  histPlayerFilter = "",
  histOutcomeFilter = "all",
  histMarginFilter = "all",
  histPairFilter = "",
  histScorelineFilter = "",
  histSeasonFilter = "",
  h2hFilterA = "",
  h2hFilterB = "",
  matchFrom = null,
  matchTo = null;
let homeFilter = "all",
  homeFrom = null,
  homeTo = null;
let cmpFilter = "today",
  cmpFrom = null,
  cmpTo = null;
let cmpSortKey = "sr";
let cmpSortAsc = false;
let cmpRecordSortMode = "wins";
let _cmpLeaderHtmls = [];
let _cmpFiltered = [];
let _eloTLPlayer = "";
let _eloTLFilter = "all";
let _eloTLPts = [];
let prevPage = "home";
let lastMatchSnapshot = null;
window.isAdmin = false;
let scheduledMatches = [];

// ── SPLASH HELPERS ─────────────────────────────────────────
function setSplashStatus(msg) {
  var el = document.getElementById("splash-status");
  if (el) el.textContent = msg;
}

// ── SAVE HELPER — writes to Firestore AND updates cache ─────
async function saveCloudData() {
  const payload = { matches: allMatches, aliasMap, nameMap };
  if (window.appCache) window.appCache.save(allMatches, aliasMap, nameMap);
  try {
    if (auth.currentUser && window.isAdmin) {
      await setDoc(doc(db, "padel", "main"), payload);
    }
  } catch (err) {
    console.error("Firestore save failed:", err);
  }
  try {
    localStorage.setItem("padel_matches", JSON.stringify(allMatches));
  } catch (e) {}
}

// ── SCHEDULED MATCHES ──────────────────────────────────────
async function saveScheduledMatches() {
  try {
    localStorage.setItem("padel_scheduled", JSON.stringify(scheduledMatches));
    if (auth.currentUser && window.isAdmin) {
      await setDoc(
        doc(db, "padel", "scheduled"),
        { items: scheduledMatches },
        { merge: false },
      );
    }
  } catch (e) {
    console.error("Schedule save failed:", e);
  }
}

function loadScheduledMatches() {
  try {
    const cached = JSON.parse(localStorage.getItem("padel_scheduled") || "[]");
    if (Array.isArray(cached)) scheduledMatches = cached;
  } catch (e) {}
  try {
    onSnapshot(doc(db, "padel", "scheduled"), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (Array.isArray(d.items)) {
        scheduledMatches = d.items;
        try {
          localStorage.setItem(
            "padel_scheduled",
            JSON.stringify(scheduledMatches),
          );
        } catch (e) {}
      }
      renderScheduledBanner();
      renderScheduledAdmin();
    });
  } catch (e) {}
  renderScheduledBanner();
}

function renderScheduledBanner() {
  const el = document.getElementById("scheduled-banner");
  if (!el) return;
  const today = todayISO();
  const upcoming = scheduledMatches
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!upcoming.length) {
    el.innerHTML = "";
    el.style.display = "none";
    return;
  }
  const next = upcoming[0];
  const isToday = next.date === today;
  const dateLabel = isToday ? "TODAY" : fmtDate(next.date).toUpperCase();
  const teamLabel =
    next.teamA && next.teamB
      ? `${next.teamA.join(" & ")} vs ${next.teamB.join(" & ")}`
      : next.note || "Session scheduled";
  el.style.display = "block";
  el.innerHTML = `
    <div class="sched-banner">
      <div class="sched-banner-left">
        <span class="sched-banner-icon">${isToday ? "🏓" : "📅"}</span>
        <div>
          <div class="sched-banner-date">${isToday ? "🔔 NEXT SESSION — TODAY" : `NEXT SESSION · ${dateLabel}`}</div>
          <div class="sched-banner-team">${teamLabel}</div>
          ${next.note && (next.teamA || next.teamB) ? `<div class="sched-banner-note">${next.note}</div>` : ""}
        </div>
      </div>
      ${upcoming.length > 1 ? `<div class="sched-banner-more">+${upcoming.length - 1} more</div>` : ""}
    </div>`;
}

function renderScheduledAdmin() {
  const el = document.getElementById("scheduled-admin-list");
  if (!el) return;
  const today = todayISO();
  const sorted = [...scheduledMatches].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  if (!sorted.length) {
    el.innerHTML =
      '<div style="color:var(--muted);font-size:13px;padding:8px 0">No upcoming sessions scheduled.</div>';
    return;
  }
  el.innerHTML = sorted
    .map((s, i) => {
      const isPast = s.date < today;
      const teamLabel =
        s.teamA && s.teamB
          ? `${s.teamA.join(" & ")} vs ${s.teamB.join(" & ")}`
          : "Open session";
      return `<div class="sched-item${isPast ? " sched-past" : ""}">
      <div class="sched-item-body">
        <div class="sched-item-date">${fmtDate(s.date)}${isPast ? " · past" : ""}</div>
        <div class="sched-item-team">${teamLabel}</div>
        ${s.note ? `<div class="sched-item-note">${s.note}</div>` : ""}
      </div>
      <button class="sched-del-btn" onclick="deleteScheduled(${i})">✕</button>
    </div>`;
    })
    .join("");
}

function closeScheduleModal() {
  const el = document.getElementById("schedule-inline");
  if (!el) return;
  el.classList.remove("open");
  setTimeout(() => el.remove(), 260);
}

function openScheduleModal() {
  if (document.getElementById("schedule-inline")) {
    closeScheduleModal();
    return;
  }
  const players = Object.keys(aliasMap).sort((a, b) => a.localeCompare(b));
  const opts = players
    .map((p) => `<option value="${p}">${p}</option>`)
    .join("");
  const el = document.createElement("div");
  el.id = "schedule-inline";
  el.className = "match-edit-inline";
  el.innerHTML = `
    <div class="mei-header">
      <span class="mei-title">📅 SCHEDULE SESSION</span>
      <button class="mei-close" onclick="closeScheduleModal()">✕</button>
    </div>
    <div class="mei-section-lbl">DATE</div>
    <input id="sched-date" type="date" class="mei-input" style="width:100%;margin-bottom:10px" value="${todayISO()}">
    <div class="mei-section-lbl" style="color:var(--green)">TEAM A <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>
    <div class="mei-row">
      <select id="sched-a1" class="mei-sel"><option value="">P1</option>${opts}</select>
      <select id="sched-a2" class="mei-sel"><option value="">P2</option>${opts}</select>
    </div>
    <div class="mei-section-lbl" style="color:var(--red)">TEAM B <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>
    <div class="mei-row">
      <select id="sched-b1" class="mei-sel"><option value="">P1</option>${opts}</select>
      <select id="sched-b2" class="mei-sel"><option value="">P2</option>${opts}</select>
    </div>
    <div class="mei-section-lbl">NOTE <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>
    <input id="sched-note" type="text" class="mei-input" style="width:100%;margin-bottom:10px" placeholder="e.g. court 3, bring balls…">
    <div class="mei-actions">
      <button class="mei-cancel" onclick="closeScheduleModal()">Cancel</button>
      <button class="mei-save" onclick="saveScheduled()">Schedule</button>
    </div>`;
  const btn = document.getElementById("schedule-session-btn");
  if (btn) btn.insertAdjacentElement("afterend", el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add("open"));
  });
  setTimeout(
    () => el.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    60,
  );
}

function saveScheduled() {
  const date = document.getElementById("sched-date")?.value;
  if (!date) return;
  const a1 = document.getElementById("sched-a1")?.value;
  const a2 = document.getElementById("sched-a2")?.value;
  const b1 = document.getElementById("sched-b1")?.value;
  const b2 = document.getElementById("sched-b2")?.value;
  const note = document.getElementById("sched-note")?.value.trim();
  const entry = { date, id: Date.now() };
  const teamA = [a1, a2].filter(Boolean);
  const teamB = [b1, b2].filter(Boolean);
  if (teamA.length) entry.teamA = teamA;
  if (teamB.length) entry.teamB = teamB;
  if (note) entry.note = note;
  scheduledMatches.push(entry);
  saveScheduledMatches();
  closeScheduleModal();
  renderScheduledBanner();
  renderScheduledAdmin();
  showToast("Session scheduled!", "📅");
}

function deleteScheduled(i) {
  scheduledMatches.splice(i, 1);
  saveScheduledMatches();
  renderScheduledBanner();
  renderScheduledAdmin();
}

// ── DATA LOADER ────────────────────────────────────────────
function loadCloudData() {
  let fired = false;
  let lastDataFingerprint = null;

  function dataFingerprint(matches) {
    if (!matches || !matches.length) return "empty";
    try {
      const last = matches[matches.length - 1];
      return (
        matches.length +
        "|" +
        (last && last.date ? last.date : "") +
        "|" +
        (last && last.scoreA !== undefined ? last.scoreA : "")
      );
    } catch (e) {
      return String(matches.length);
    }
  }

  function onData(matches, aMap, nMap) {
    const fp = dataFingerprint(matches);
    const isFirstLoad = !fired;

    // If this is a Firestore update that matches the cache we already rendered, skip re-render
    if (!isFirstLoad && fp === lastDataFingerprint) {
      return;
    }
    lastDataFingerprint = fp;

    allMatches = matches;
    aliasMap = aMap;
    nameMap = nMap;
    if (window.appCache) window.appCache.save(allMatches, aliasMap, nameMap);

    if (isFirstLoad) {
      // First render: paint data, then dismiss splash so user sees cards animate in cleanly once
      renderHome();
      renderCompact();
      refreshManage();
      fired = true;
      window.dismissSplash("Ready ✓");
    } else {
      // Genuine new data from Firestore: fade board out, re-render, fade back in — no blur flash
      const board = document.getElementById("board");
      if (board) {
        board.style.transition = "opacity 0.15s ease";
        board.style.opacity = "0";
      }
      setTimeout(function () {
        renderHome();
        renderCompact();
        refreshManage();
        if (board) {
          // Suppress the per-card keyframe animation for live updates
          board.querySelectorAll(".pc").forEach(function (c) {
            c.style.animation = "none";
            c.style.opacity = "1";
            c.style.transform = "none";
          });
          board.style.opacity = "1";
        }
      }, 160);
    }
  }

  // Step 1 — try cache instantly
  try {
    const cached = window.appCache && window.appCache.load();
    if (cached && Array.isArray(cached.matches) && cached.matches.length) {
      onData(cached.matches, cached.aliasMap || {}, cached.nameMap || {});
    }
  } catch (e) {}

  // Step 2 — Firestore live subscription
  try {
    onSnapshot(
      doc(db, "padel", "main"),
      function (snap) {
        if (!snap.exists()) {
          window.dismissSplash("Ready");
          return;
        }
        const d = snap.data();
        onData(d.matches || [], d.aliasMap || {}, d.nameMap || {});
      },
      function (err) {
        console.error("Firestore error:", err);
        window.dismissSplash("Offline");
      },
    );
  } catch (e) {
    console.error("onSnapshot failed:", e);
    window.dismissSplash("Offline");
  }
}

function animateGauges() {
  const gauges = document.querySelectorAll(".sr-ring");

  gauges.forEach((g, i) => {
    const target = getComputedStyle(g).getPropertyValue("--target-angle");

    // delay each row slightly for stagger effect
    setTimeout(() => {
      g.style.setProperty("--speed-angle", target);
    }, i * 80); // 80ms stagger
  });
}

// ── AUTH ───────────────────────────────────────────────────
document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    if (auth.currentUser) {
      await signOut(auth);
      return;
    }
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === "auth/popup-blocked")
      await signInWithRedirect(auth, provider);
    else alert(err.message);
  }
});

getRedirectResult(auth)
  .then((r) => {
    if (r?.user) console.log("Logged in:", r.user.email);
  })
  .catch(console.error);

let _authInitialFired = false;
onAuthStateChanged(auth, (user) => {
  const wasAdmin = window.isAdmin;
  window.isAdmin = !!user && user.email === ADMIN_EMAIL;
  updateAdminUI(user);
  // Skip re-render on the initial auth state resolution at startup —
  // loadCloudData() already handles the first render. Only re-render
  // when auth genuinely changes (user logs in or out mid-session).
  if (!_authInitialFired) {
    _authInitialFired = true;
    return;
  }
  if (allMatches.length) {
    renderHome();
    renderCompact();
  }
});

function updateAdminUI(user) {
  const absInp = document.getElementById("absenceThresholdInput");
  if (absInp) absInp.value = localStorage.getItem("absence_threshold") || "7";
  const fab = document.getElementById("fab");
  // Show/hide admin tabs in all tabbars
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.style.display = window.isAdmin ? "flex" : "none";
  });
  // FAB only shows when on the add page and admin
  const currentPage = document.querySelector(".page.active")?.id;
  fab.style.display =
    window.isAdmin && currentPage === "pg-add" ? "flex" : "none";
  document.getElementById("loginBtn").textContent = user ? "Logout" : "Login";
  // Hide edit/add tabs for non-admins
  document.querySelectorAll(".itab").forEach((tab) => {
    const txt = tab.textContent.trim();
    if (
      !window.isAdmin &&
      (txt.includes("Add") || txt.includes("Names") || txt.includes("Manage"))
    ) {
      tab.style.display = "none";
    } else {
      tab.style.display = "";
    }
  });
  // Prefill date for admin whenever auth state resolves
  if (window.isAdmin) {
    prefillMatchTADate();
  }
}

// ── NAVIGATION ─────────────────────────────────────────────
function goTo(id) {
  if (id === "add" && !window.isAdmin) {
    alert("Only admin can add data");
    return;
  }
  prevPage = document.querySelector(".page.active").id.replace("pg-", "");
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("pg-" + id).classList.add("active");
  document.getElementById("fab").style.display =
    id === "add" && window.isAdmin ? "flex" : "none";
  if (id === "home") renderHome();
  if (id === "compact") renderCompact();
  if (id === "history") {
    renderModernMatches();
  }
  if (id === "add") {
    refreshManage();
    renderAddMatches();
  }
}
function goBack() {
  goTo(prevPage === "add" ? "home" : prevPage);
}

function switchMainTab(id) {
  if (id === "add" && !window.isAdmin) {
    alert("Only admin can access this");
    return;
  }

  // ── Sync date filter between Detailed (home) and Summary (compact) ──
  const homeSelEl = document.getElementById("homeFilterSel");
  const cmpSelEl = document.getElementById("cmpSel");
  if (homeSelEl && cmpSelEl) {
    if (id === "compact" && homeFilter !== "all") {
      // Going to Summary: carry Detailed filter over
      cmpFilter = homeFilter;
      cmpSelEl.value = cmpFilter;
    }
  }

  // Update all tabbars
  document
    .querySelectorAll(".tabbar .tbb")
    .forEach((b) => b.classList.remove("on"));
  document.querySelectorAll(`.tabbar .tbb`).forEach((b) => {
    if (b.dataset.tab === id) b.classList.add("on");
  });
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("pg-" + id).classList.add("active");
  // FAB only visible on admin/add page
  document.getElementById("fab").style.display =
    id === "add" && window.isAdmin ? "flex" : "none";
  if (id === "home") renderHome();
  if (id === "compact") renderCompact();
  if (id === "history") {
    renderModernMatches();
    populateHistoryPlayerChips();
    const hdf = document.getElementById("histDateFilter");
    if (hdf) hdf.value = matchTabFilter;
    const hof = document.getElementById("histOutcomeFilter");
    if (hof) hof.value = histOutcomeFilter;
    const hmf = document.getElementById("histMarginFilter");
    if (hmf) hmf.value = histMarginFilter;
    const hsf = document.getElementById("histScorelineFilter");
    if (hsf) hsf.value = histScorelineFilter;
  }
  if (id === "analytics") renderAnalyticsPage();
  setTimeout(applyAnalyticsAnimations, 0);
  if (id === "add") {
    refreshManage();
    renderAddMatches();
    prefillMatchTADate();
  }
}

let touchStartX = 0,
  touchStartY = 0,
  touchStartTarget = null,
  swipeInProgress = false;
const mainTabOrder = ["home", "compact", "history", "analytics"];

function isScrollable(el) {
  // Walk up DOM to see if the touch started inside a horizontally/vertically scrollable element
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const overflow = style.overflow + style.overflowX + style.overflowY;
    if (/auto|scroll/.test(overflow)) {
      if (
        el.scrollWidth > el.clientWidth ||
        el.scrollHeight > el.clientHeight
      ) {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

function onTouchStart(e) {
  if (!e.touches || e.touches.length !== 1) {
    touchStartTarget = null;
    return;
  }
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchStartTarget = e.target;
}

function onTouchEnd(e) {
  if (swipeInProgress || !touchStartTarget) return;
  if (!e.changedTouches || e.changedTouches.length === 0) return;

  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  // Require clearly horizontal gesture and not too vertical
  if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;

  // Don't swipe tabs if the touch started inside a scrollable child
  if (isScrollable(touchStartTarget)) return;

  const activePage = document.querySelector(".page.active");
  if (!activePage) return;
  const current = activePage.id.replace("pg-", "");
  const index = mainTabOrder.indexOf(current);
  if (index === -1) return; // current tab not in swipe order (e.g. "add")

  const nextTab =
    dx > 0 && index > 0
      ? mainTabOrder[index - 1]
      : dx < 0 && index < mainTabOrder.length - 1
        ? mainTabOrder[index + 1]
        : null;

  if (!nextTab) return;

  swipeInProgress = true;
  try {
    switchMainTab(nextTab);
  } catch (err) {
    console.error("swipe tab switch error:", err);
  }
  // Debounce: prevent another swipe for 350 ms
  setTimeout(() => {
    swipeInProgress = false;
  }, 350);
}

document.addEventListener("touchstart", onTouchStart, { passive: true });
document.addEventListener("touchend", onTouchEnd, { passive: true });

// ── SWIPE-TO-DELETE ────────────────────────────────────────
let _swipeTouchStartX = 0,
  _swipeTouchStartY = 0,
  _swipeCard = null,
  _swipeActive = false;
document.addEventListener(
  "touchstart",
  (e) => {
    if (!window.isAdmin || e.touches.length !== 1) return;
    const card = e.target.closest(".match-card");
    if (!card) return;
    _swipeTouchStartX = e.touches[0].clientX;
    _swipeTouchStartY = e.touches[0].clientY;
    _swipeCard = card;
    _swipeActive = false;
  },
  { passive: true },
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!_swipeCard) return;
    const dx = e.touches[0].clientX - _swipeTouchStartX;
    const dy = e.touches[0].clientY - _swipeTouchStartY;
    if (!_swipeActive && Math.abs(dy) > Math.abs(dx)) {
      _swipeCard = null;
      return;
    }
    if (!_swipeActive && Math.abs(dx) > 8) _swipeActive = true;
    if (!_swipeActive) return;
    if (dx < 0) {
      const reveal = Math.min(72, Math.abs(dx));
      const inner = _swipeCard.querySelector(".match-card-inner");
      if (inner) {
        inner.style.transform = `translateX(${-reveal}px)`;
        _swipeCard.classList.add("swiping");
      }
      if (reveal >= 52) _swipeCard.classList.add("swipe-revealed");
      else _swipeCard.classList.remove("swipe-revealed");
    } else {
      const inner = _swipeCard.querySelector(".match-card-inner");
      if (inner) inner.style.transform = "";
      _swipeCard.classList.remove("swipe-revealed", "swiping");
    }
  },
  { passive: true },
);

document.addEventListener(
  "touchend",
  (e) => {
    if (!_swipeCard) return;
    const card = _swipeCard;
    _swipeCard = null;
    _swipeActive = false;
    const inner = card.querySelector(".match-card-inner");
    if (card.classList.contains("swipe-revealed")) {
      if (inner) {
        inner.style.transition = "transform 0.25s ease";
        inner.style.transform = "translateX(-72px)";
      }
    } else {
      card.classList.remove("swipe-revealed", "swiping");
      if (inner) {
        inner.style.transition = "transform 0.25s ease";
        inner.style.transform = "";
        setTimeout(() => {
          inner.style.transition = "";
        }, 260);
      }
    }
  },
  { passive: true },
);

// Format today as D/M/YY (the expected date header format)
function todayDMYY() {
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const yy = String(now.getFullYear()).slice(-2);
  return `${d}/${m}/${yy}`;
}

function prefillMatchTADate() {
  const ta = document.getElementById("matchTA");
  if (!ta) return;
  // Only prefill if the textarea is completely empty
  if (ta.value.trim() === "") {
    ta.value = todayDMYY() + "\n";
    // Place cursor at end so admin can type right away
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    previewMatchImport();
  }
}

function switchITab(id) {
  const keys = ["matches", "names", "manage"];
  document
    .querySelectorAll(".itab")
    .forEach((t, i) => t.classList.toggle("on", keys[i] === id));
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("show"));
  document.getElementById("ip-" + id).classList.add("show");
  // FAB hidden only on Manage sub-tab
  document.getElementById("fab").style.display =
    id !== "manage" && window.isAdmin ? "flex" : "none";
  if (id === "manage") {
    refreshManage();
    document
      .querySelectorAll("#ip-manage .mng-card, #ip-manage .mng-danger-card")
      .forEach((el, i) => {
        el.style.setProperty("--analytics-index", i);
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      });
  }
  if (id === "names") renderNamesTable();
  if (id === "matches") prefillMatchTADate();
}

function refreshManage() {
  const days = new Set(allMatches.map((m) => m.date)).size;
  document.getElementById("manageInfo").innerHTML =
    `Matches: <strong>${allMatches.length}</strong><br>Days: <strong>${days}</strong><br>Players mapped: <strong>${Object.keys(aliasMap).length}</strong>`;
  renderEmailStatus();
}

// ── DATE HELPERS ───────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function weekISO() {
  const d = new Date(),
    day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function weekEndISO() {
  const s = new Date(weekISO());
  s.setDate(s.getDate() + 6);
  return s.toISOString().slice(0, 10);
}
function weekendRange() {
  const now = new Date(),
    day = now.getDay();
  const sat = new Date(now);
  sat.setDate(now.getDate() + (day === 0 ? -1 : 6 - day));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return {
    from: sat.toISOString().slice(0, 10),
    to: sun.toISOString().slice(0, 10),
  };
}
function monthISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function lastWeekRange() {
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
    from: lastMonday.toISOString().slice(0, 10),
    to: lastSunday.toISOString().slice(0, 10),
  };
}

function parseDateHdr(s) {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
const resolve = (a) => nameMap[a] || a;

// Resolve a 2-char initial like "Ni" → full name from aliasMap or nameMap
function resolveInitial(init) {
  const key = init.toLowerCase();
  // Check aliasMap first (exact alias match)
  if (aliasMap[key]) return aliasMap[key];
  if (aliasMap[init]) return aliasMap[init];
  // Check nameMap keys
  const nm = Object.entries(nameMap).find(([k]) => k.toLowerCase() === key);
  if (nm) return nm[1];
  // Fallback: match any known player whose name starts with these 2 chars
  const allNames = [
    ...new Set([
      ...Object.values(nameMap),
      ...Object.keys(aliasMap).map((k) => aliasMap[k]),
    ]),
  ];
  const hit = allNames.find((n) => n.toLowerCase().startsWith(key));
  return hit || null;
}

function parseMatchLine(line) {
  line = line.trim().replace(/\s+/g, " ");

  // Shorthand format: NiGo v PaPu 6-1  (2-char initials, no spaces)
  const sh = line.match(
    /^([A-Za-z]{2})([A-Za-z]{2})\s+(?:vs?)\s+([A-Za-z]{2})([A-Za-z]{2})\s+(\d+)\s*[-–]\s*(\d+)$/i,
  );
  if (sh) {
    const r1 = resolveInitial(sh[1]),
      r2 = resolveInitial(sh[2]);
    const r3 = resolveInitial(sh[3]),
      r4 = resolveInitial(sh[4]);
    const sA = +sh[5],
      sB = +sh[6];
    if (r1 && r2 && r3 && r4 && !isNaN(sA) && !isNaN(sB) && sA !== sB) {
      return { teamA: [r1, r2], teamB: [r3, r4], scoreA: sA, scoreB: sB };
    }
  }

  // Standard format: Player1 Player2 vs Player3 Player4 6-1
  const m = line.match(/^(.+?)\s+(?:vs|v)\s+(.+?)\s+(\d+)\s*[-–]\s*(\d+)$/i);
  if (!m) return null;
  const tA = m[1].trim().split(" ").filter(Boolean),
    tB = m[2].trim().split(" ").filter(Boolean);
  const sA = +m[3],
    sB = +m[4];
  if (tA.length < 1 || tA.length > 2 || tB.length < 1 || tB.length > 2)
    return null;
  if (tA.length !== tB.length) return null;
  if (isNaN(sA) || isNaN(sB) || sA === sB) return null;
  return {
    teamA: tA.map(resolve),
    teamB: tB.map(resolve),
    scoreA: sA,
    scoreB: sB,
  };
}

function parseBlock(raw) {
  const parsed = [],
    errors = [],
    cur = { d: todayISO() };
  raw.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const dt = parseDateHdr(t);
    if (dt) {
      cur.d = dt;
      return;
    }
    const m = parseMatchLine(t);
    if (m) parsed.push({ date: cur.d, ...m });
    else errors.push({ ln: i + 1, text: t });
  });
  return { parsed, errors };
}

// ── PLAYER AVATARS ─────────────────────────────────────────
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

function playerColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return _AV_COLORS[h % _AV_COLORS.length];
}
function playerInitials(name) {
  const p = name.trim().split(/\s+/);
  return (
    p.length >= 2 ? p[0][0] + p[p.length - 1][0] : name.slice(0, 2)
  ).toUpperCase();
}
function playerAvatar(name, size = 26) {
  const col = playerColor(name);
  const fs = Math.round(size * 0.38);
  return `<span class="p-av" style="width:${size}px;height:${size}px;min-width:${size}px;font-size:${fs}px;background:${col}22;border:1.5px solid ${col};color:${col}">${playerInitials(name)}</span>`;
}

// ── FILTER ─────────────────────────────────────────────────
function filterMatches(f, from, to) {
  const t = todayISO(),
    sw = weekISO(),
    swe = t,
    sm = monthISO(),
    wr = weekendRange(),
    lwr = lastWeekRange();
  return allMatches.filter((m) => {
    if (f === "all") return true;
    if (f === "today") return m.date === t;
    if (f === "week") return m.date >= sw && m.date <= swe;
    if (f === "weekend") return m.date >= wr.from && m.date <= wr.to;
    if (f === "month") return m.date >= sm && m.date <= t;
    if (f === "lastweek") return m.date >= lwr.from && m.date <= lwr.to;
    if (f === "range") {
      const d = m.date || "";
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true;
  });
}

// ── COMPUTE STATS ──────────────────────────────────────────
function eloToSr(elo) {
  return parseFloat(Math.min(10, Math.max(0, (elo - 700) / 60)).toFixed(2));
}

function computeStats(matches, eloMap = {}) {
  const P = {};
  const g = (n) => {
    if (!P[n])
      P[n] = {
        name: n,
        mp: 0,
        mw: 0,
        gw: 0,
        gl: 0,
        results: [],
        partnerPlayed: {},
        partnerWins: {},
        oppPlayed: {},
        oppWins: {},
      };
    return P[n];
  };
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    m.teamA.forEach((p) => {
      const pl = g(p);
      pl.mp++;
      pl.gw += m.scoreA;
      pl.gl += m.scoreB;
      if (aWon) pl.mw++;
      pl.results.push({ won: aWon, margin: m.scoreA - m.scoreB });
      m.teamA.forEach((partner) => {
        if (partner !== p) {
          pl.partnerPlayed[partner] = (pl.partnerPlayed[partner] || 0) + 1;
          if (aWon)
            pl.partnerWins[partner] = (pl.partnerWins[partner] || 0) + 1;
        }
      });
      m.teamB.forEach((opp) => {
        pl.oppPlayed[opp] = (pl.oppPlayed[opp] || 0) + 1;
        if (aWon) pl.oppWins[opp] = (pl.oppWins[opp] || 0) + 1;
      });
    });
    m.teamB.forEach((p) => {
      const pl = g(p);
      pl.mp++;
      pl.gw += m.scoreB;
      pl.gl += m.scoreA;
      if (!aWon) pl.mw++;
      pl.results.push({ won: !aWon, margin: m.scoreB - m.scoreA });
      m.teamB.forEach((partner) => {
        if (partner !== p) {
          pl.partnerPlayed[partner] = (pl.partnerPlayed[partner] || 0) + 1;
          if (!aWon)
            pl.partnerWins[partner] = (pl.partnerWins[partner] || 0) + 1;
        }
      });
      m.teamA.forEach((opp) => {
        pl.oppPlayed[opp] = (pl.oppPlayed[opp] || 0) + 1;
        if (!aWon) pl.oppWins[opp] = (pl.oppWins[opp] || 0) + 1;
      });
    });
  });
  const rows = Object.values(P);
  const maxMP = Math.max(1, ...rows.map((p) => p.mp));
  return rows
    .map((p) => {
      const ml = p.mp - p.mw,
        total = p.gw + p.gl;
      const mwr = p.mp > 0 ? p.mw / p.mp : 0,
        gwr = total > 0 ? p.gw / total : 0,
        act = p.mp / maxMP;
      const sr =
        p.name in eloMap
          ? eloToSr(eloMap[p.name])
          : mwr * 5 + gwr * 3 + act * 2;

      // Feature 1: win streak
      let curStreak = 0,
        curType = "",
        bestWinStreak = 0,
        runW = 0;
      if (p.results.length > 0) {
        curType = p.results[p.results.length - 1].won ? "W" : "L";
        for (let i = p.results.length - 1; i >= 0; i--) {
          const r = p.results[i];
          if ((r.won && curType === "W") || (!r.won && curType === "L"))
            curStreak++;
          else break;
        }
      }
      p.results.forEach((r) => {
        if (r.won) {
          runW++;
          bestWinStreak = Math.max(bestWinStreak, runW);
        } else runW = 0;
      });

      // Feature 2: partnership stats (min 2 games together)
      const MIN_G = 2;
      let bestPartner = null,
        worstPartner = null,
        bestPPct = -1,
        worstPPct = 101;
      Object.keys(p.partnerPlayed).forEach((partner) => {
        const played = p.partnerPlayed[partner];
        if (played < MIN_G) return;
        const pct = ((p.partnerWins[partner] || 0) / played) * 100;
        if (
          pct > bestPPct ||
          (pct === bestPPct && played > (bestPartner?.played ?? 0))
        ) {
          bestPPct = pct;
          bestPartner = { name: partner, pct, played };
        }
        if (
          pct < worstPPct ||
          (pct === worstPPct && played > (worstPartner?.played ?? 0))
        ) {
          worstPPct = pct;
          worstPartner = { name: partner, pct, played };
        }
      });

      // Feature 3: nemesis / favourite opponent (min 2 games)
      let favOpp = null,
        nemesis = null,
        favOPct = -1,
        nemOPct = 101;
      Object.keys(p.oppPlayed).forEach((opp) => {
        const played = p.oppPlayed[opp];
        if (played < MIN_G) return;
        const pct = ((p.oppWins[opp] || 0) / played) * 100;
        if (pct > favOPct) {
          favOPct = pct;
          favOpp = { name: opp, pct, played };
        }
        if (pct < nemOPct) {
          nemOPct = pct;
          nemesis = { name: opp, pct, played };
        }
      });

      // Feature 4: form — last 5 W/L
      const form = p.results.slice(-5).map((r) => (r.won ? "W" : "L"));

      // Feature 5: avg score margin
      const avgMargin =
        p.results.length > 0
          ? p.results.reduce((s, r) => s + r.margin, 0) / p.results.length
          : 0;

      // Consistency: lower std dev = more consistent
      const consistency =
        p.results.length >= 3
          ? parseFloat(
              Math.sqrt(
                p.results.reduce(
                  (s, r) => s + Math.pow(r.margin - avgMargin, 2),
                  0,
                ) / p.results.length,
              ).toFixed(1),
            )
          : null;

      return {
        ...p,
        ml,
        diff: p.gw - p.gl,
        sr,
        mwr,
        gwr,
        act,
        winPct: mwr * 100,
        gamePct: gwr * 100,
        curStreak,
        curType,
        bestWinStreak,
        bestPartner,
        worstPartner,
        favOpp,
        nemesis,
        form,
        avgMargin,
        consistency,
      };
    })
    .sort((a, b) => b.sr - a.sr);
}

// ── MOMENTUM BADGE ─────────────────────────────────────────
function getMomentumBadge(playerName) {
  // Get last 3 matches for this player, in chronological order
  const playerMatches = allMatches
    .filter((m) => m.teamA.includes(playerName) || m.teamB.includes(playerName))
    .slice(-3);
  if (playerMatches.length < 2) return "";
  let wins = 0,
    losses = 0;
  playerMatches.forEach((m) => {
    const onA = m.teamA.includes(playerName);
    const won = onA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (won) wins++;
    else losses++;
  });
  if (wins >= 2) return "🔥";
  if (losses >= 2) return "❄️";
  return "";
}

function normPlayer(name) {
  return (nameMap[name] || name || "").trim();
}

function normalizedScoreline(m) {
  const hi = Math.max(Number(m.scoreA), Number(m.scoreB));
  const lo = Math.min(Number(m.scoreA), Number(m.scoreB));
  return `${hi}-${lo}`;
}

function sameMatch(a, b) {
  if (!a || !b) return false;
  const ta = [...(a.teamA || [])].sort().join("|");
  const tb = [...(a.teamB || [])].sort().join("|");
  const oa = [...(b.teamA || [])].sort().join("|");
  const ob = [...(b.teamB || [])].sort().join("|");
  return (
    a.date === b.date &&
    a.scoreA === b.scoreA &&
    a.scoreB === b.scoreB &&
    ta === oa &&
    tb === ob
  );
}

function getAllPlayerNamesFromMatches() {
  const names = new Set(Object.keys(aliasMap));
  allMatches.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
      names.add(normPlayer(p)),
    );
  });
  return [...names]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function getPairKey(team) {
  return [...team].map(normPlayer).sort().join(" & ");
}

function getPairStats(matches = allMatches) {
  const pairs = {};
  matches.forEach((m) => {
    const aWon = Number(m.scoreA) > Number(m.scoreB);
    [
      {
        team: m.teamA || [],
        gf: Number(m.scoreA),
        ga: Number(m.scoreB),
        won: aWon,
      },
      {
        team: m.teamB || [],
        gf: Number(m.scoreB),
        ga: Number(m.scoreA),
        won: !aWon,
      },
    ].forEach((row) => {
      if (row.team.length < 2) return;
      const key = getPairKey(row.team);
      if (!pairs[key])
        pairs[key] = {
          key,
          players: key.split(" & "),
          played: 0,
          wins: 0,
          gf: 0,
          ga: 0,
        };
      pairs[key].played++;
      pairs[key].wins += row.won ? 1 : 0;
      pairs[key].gf += row.gf;
      pairs[key].ga += row.ga;
    });
  });
  return Object.values(pairs)
    .map((p) => ({
      ...p,
      losses: p.played - p.wins,
      winPct: p.played ? Math.round((p.wins / p.played) * 100) : 0,
      diff: p.gf - p.ga,
    }))
    .sort(
      (a, b) => b.winPct - a.winPct || b.played - a.played || b.diff - a.diff,
    );
}

function pairInMatch(m, pairKey) {
  if (!pairKey) return true;
  return (
    getPairKey(m.teamA || []) === pairKey ||
    getPairKey(m.teamB || []) === pairKey
  );
}

function playersOpposed(m, a, b) {
  if (!a || !b) return true;
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  const inA1 = (m.teamA || []).some((p) => normPlayer(p).toLowerCase() === na);
  const inA2 = (m.teamA || []).some((p) => normPlayer(p).toLowerCase() === nb);
  const inB1 = (m.teamB || []).some((p) => normPlayer(p).toLowerCase() === na);
  const inB2 = (m.teamB || []).some((p) => normPlayer(p).toLowerCase() === nb);
  return (inA1 && inB2) || (inB1 && inA2);
}

function getHeadToHeadStats(a, b, matches = allMatches) {
  const rows = matches.filter((m) => playersOpposed(m, a, b));
  let aWins = 0,
    bWins = 0,
    diff = 0;
  rows.forEach((m) => {
    const aInTeamA = (m.teamA || []).some((p) => normPlayer(p) === a);
    const aWon = aInTeamA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (aWon) aWins++;
    else bWins++;
    diff += aInTeamA ? m.scoreA - m.scoreB : m.scoreB - m.scoreA;
  });
  return { matches: rows, aWins, bWins, diff };
}

function getPlayerDetail(name) {
  const matches = allMatches.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].some(
      (p) => normPlayer(p) === name,
    ),
  );
  const stats = computeStats(allMatches, computeElo(allMatches)).find(
    (p) => p.name === name,
  );
  const teammateCounts = {};
  const opponentCounts = {};
  const sortedMatches = [...matches].sort((a, b) => {
    const da = new Date(a.date || "1970-01-01");
    const db = new Date(b.date || "1970-01-01");
    return da - db;
  });
  let currentStreak = 0;
  let currentType = null;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let shutoutWins = 0;
  let shutoutLosses = 0;
  sortedMatches.forEach((m) => {
    const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
    const own = inA ? Number(m.scoreA) : Number(m.scoreB);
    const opp = inA ? Number(m.scoreB) : Number(m.scoreA);
    const won = own > opp;
    if (won) {
      if (currentType === "win") currentStreak += 1;
      else {
        currentType = "win";
        currentStreak = 1;
      }
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      if (currentType === "loss") currentStreak += 1;
      else {
        currentType = "loss";
        currentStreak = 1;
      }
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    }
    if (won && opp === 0) shutoutWins += 1;
    if (!won && own === 0) shutoutLosses += 1;
    const teammates = (inA ? m.teamA : m.teamB)
      .map(normPlayer)
      .filter((p) => p !== name);
    const opponents = (inA ? m.teamB : m.teamA).map(normPlayer);
    teammates.forEach(
      (p) => (teammateCounts[p] = (teammateCounts[p] || 0) + 1),
    );
    opponents.forEach(
      (p) => (opponentCounts[p] = (opponentCounts[p] || 0) + 1),
    );
  });
  const recent = sortedMatches.slice(-8).map((m) => {
    const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
    const own = inA ? Number(m.scoreA) : Number(m.scoreB);
    const opp = inA ? Number(m.scoreB) : Number(m.scoreA);
    const won = own > opp;
    const opponents = (inA ? m.teamB : m.teamA).map(normPlayer);
    return {
      date: m.date,
      won,
      score: `${own}-${opp}`,
      opponents: opponents.join(" & "),
    };
  });
  const topMate = Object.entries(teammateCounts).sort((a, b) => b[1] - a[1])[0];
  const toughOpp = Object.entries(opponentCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return {
    stats,
    matches,
    recent,
    topMate,
    toughOpp,
    maxWinStreak,
    maxLossStreak,
    shutoutWins,
    shutoutLosses,
  };
}

function getAchievements() {
  const stats = computeStats(allMatches);
  const achievements = [];
  stats.forEach((p) => {
    const detail = getPlayerDetail(p.name);
    const last = detail.recent.slice(-5);
    const wins = last.filter((m) => m.won).length;
    const losses = last.length - wins;
    if (last.length >= 3 && wins === last.length)
      achievements.push({
        title: "Hot Streak",
        name: p.name,
        sub: `${wins} wins in recent form`,
      });
    if (last.length >= 3 && losses === last.length)
      achievements.push({
        title: "Cold Run",
        name: p.name,
        sub: `${losses} recent losses`,
      });
  });
  // Game Diff Boss — single player with highest positive differential
  const diffBoss = stats
    .filter((p) => p.diff > 0)
    .sort((a, b) => b.diff - a.diff)[0];
  if (diffBoss)
    achievements.push({
      title: "Game Diff Boss",
      name: diffBoss.name,
      sub: `+${diffBoss.diff} game differential`,
    });
  getPairStats()
    .slice(0, 3)
    .forEach((p) =>
      achievements.push({
        title: "Pair Power",
        name: p.key,
        sub: `${p.winPct}% across ${p.played} matches`,
      }),
    );
  return achievements.slice(0, 10);
}

// ── ADD MATCHES ────────────────────────────────────────────
function previewMatchImport() {
  const raw = document.getElementById("matchTA").value;
  const box = document.getElementById("matchPreview");
  if (!raw.trim()) {
    box.classList.remove("show");
    box.innerHTML = "";
    return;
  }
  const { parsed, errors } = parseBlock(raw);
  const duplicates = parsed.filter((m) =>
    allMatches.some((old) => sameMatch(old, m)),
  );
  const rows = parsed.slice(0, 5).map((m) => {
    const dup = allMatches.some((old) => sameMatch(old, m));
    return `<div class="preview-row"><span>${m.date} · ${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")}</span><strong class="${dup ? "preview-warn" : ""}">${m.scoreA}-${m.scoreB}${dup ? " · duplicate?" : ""}</strong></div>`;
  });
  box.innerHTML = `
              <div><strong style="color:var(--text)">${parsed.length}</strong> parsed · <strong class="${errors.length ? "preview-warn" : ""}">${errors.length}</strong> skipped · <strong class="${duplicates.length ? "preview-warn" : ""}">${duplicates.length}</strong> duplicate warning(s)</div>
              ${rows.join("")}
              ${parsed.length > 5 ? `<div class="preview-row"><span>+ ${parsed.length - 5} more</span><span></span></div>` : ""}
            `;
  box.classList.add("show");
}

function addMatches() {
  const raw = document.getElementById("matchTA").value;
  const eEl = document.getElementById("mErr"),
    oEl = document.getElementById("mOk");
  eEl.classList.remove("show");
  oEl.classList.remove("show");
  const { parsed, errors } = parseBlock(raw);
  if (errors.length) {
    eEl.innerHTML =
      `Skipped ${errors.length} line(s):<br>` +
      errors
        .slice(0, 4)
        .map((e) => `Line ${e.ln}: ${e.text}`)
        .join("<br>") +
      (errors.length > 4 ? "<br>…and more" : "");
    eEl.classList.add("show");
  }
  if (parsed.length) {
    const prevSnapshot = [...allMatches];
    lastMatchSnapshot = prevSnapshot;
    allMatches.push(...parsed);
    checkMilestones(prevSnapshot, allMatches);
    saveCloudData();
    document.getElementById("matchTA").value = "";
    prefillMatchTADate();
    oEl.textContent = `Added ${parsed.length} match${parsed.length > 1 ? "es" : ""}.`;
    oEl.classList.add("show");
    document.getElementById("undoAddBtn").style.display = "block";
    setTimeout(() => oEl.classList.remove("show"), 2500);
    renderHome();
    renderCompact();
    renderModernMatches();
    renderAddMatches();
  }
}

function undoLastAdd() {
  if (!lastMatchSnapshot) return;
  allMatches = lastMatchSnapshot;
  lastMatchSnapshot = null;
  saveCloudData();
  renderHome();
  renderCompact();
  renderModernMatches();
  renderAddMatches();
  refreshManage();
  document.getElementById("undoAddBtn").style.display = "none";
  const oEl = document.getElementById("mOk");
  oEl.textContent = "Last match import undone.";
  oEl.classList.add("show");
  setTimeout(() => oEl.classList.remove("show"), 2500);
}

// ── NAMES ──────────────────────────────────────────────────
function saveNames() {
  const raw = document.getElementById("namesTA").value;
  const eEl = document.getElementById("nErr"),
    oEl = document.getElementById("nOk");
  eEl.classList.remove("show");
  oEl.classList.remove("show");
  const nm = {},
    am = {},
    errs = [];
  raw.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const idx = t.indexOf("-");
    if (idx < 1) {
      errs.push(`Line ${i + 1}`);
      return;
    }
    const display = t.slice(0, idx).trim();
    const aliases = t
      .slice(idx + 1)
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (!display || !aliases.length) {
      errs.push(`Line ${i + 1}`);
      return;
    }
    aliases.forEach((a) => (nm[a] = display));
    am[display] = aliases;
  });
  if (errs.length) {
    eEl.innerHTML = `${errs.length} line(s) skipped`;
    eEl.classList.add("show");
  }
  nameMap = nm;
  aliasMap = am;
  saveCloudData(); // now includes nameMap + aliasMap
  oEl.textContent = `Saved ${Object.keys(am).length} player mappings.`;
  oEl.classList.add("show");
  setTimeout(() => oEl.classList.remove("show"), 2500);
  renderNamesTable();
}
function loadNames() {
  document.getElementById("namesTA").value = Object.entries(aliasMap)
    .map(([n, a]) => `${n} - ${a.join(", ")}`)
    .join("\n");
}

function editNameEntry(displayName) {
  const aliases = aliasMap[displayName] || [];
  const newDisplay = prompt("Display name", displayName);
  if (newDisplay === null) return;
  const cleanedDisplay = newDisplay.trim();
  if (!cleanedDisplay) {
    alert("Display name cannot be empty.");
    return;
  }
  const newAliases = prompt("Aliases (comma-separated)", aliases.join(", "));
  if (newAliases === null) return;
  const parsed = newAliases
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  if (!parsed.length) {
    alert("At least one alias is required.");
    return;
  }

  // Remove old mappings for this display name
  delete aliasMap[displayName];
  Object.keys(nameMap).forEach((alias) => {
    if (nameMap[alias] === displayName) delete nameMap[alias];
  });

  // Add new mapping
  aliasMap[cleanedDisplay] = parsed;
  parsed.forEach((alias) => {
    nameMap[alias] = cleanedDisplay;
  });

  saveCloudData();
  renderNamesTable();
  if (document.querySelector(".itab.on")?.textContent.includes("Names")) {
    loadNames();
  }
}

function renderNamesTable() {
  const table = document.getElementById("names-table");
  if (!Object.keys(aliasMap).length) {
    table.innerHTML =
      '<p style="color: var(--muted); font-size: 14px;">No names saved yet.</p>';
    return;
  }
  const sortedEntries = Object.entries(aliasMap).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const html = `
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background: var(--surface2);">
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border); color: var(--text);">Display Name</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border); color: var(--text);">Aliases</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 1px solid var(--border); color: var(--text); width: 88px;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedEntries
                    .map(
                      ([name, aliases]) => `
                    <tr style="border-bottom: 1px solid var(--border);">
                      <td style="padding: 8px; color: var(--accent); font-weight: 500; text-transform: uppercase;">${name}</td>
                      <td style="padding: 8px; color: var(--muted); text-transform: uppercase;">${aliases.join(", ")}</td>
                      <td style="padding: 8px; text-align: right;">
                        <button
                          class="action-btn edit-btn"
                          style="padding: 6px 10px; font-size: 11px;"
                          onclick="editNameEntry('${name.replace(/'/g, "\\'")}')"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            `;
  table.innerHTML = html;
}

function setAbsenceThreshold(val) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 1) return;
  localStorage.setItem("absence_threshold", n);
  renderHome();
}

function clearMatches() {
  if (!confirm("Clear all match data?")) return;
  allMatches = [];
  lastMatchSnapshot = null;
  document.getElementById("undoAddBtn").style.display = "none";
  saveCloudData();
  renderHome();
  renderCompact();
  refreshManage();
}
function clearNames() {
  if (!confirm("Clear name aliases?")) return;
  nameMap = {};
  aliasMap = {};
  saveCloudData();
  refreshManage();
}
function exportData() {
  navigator.clipboard
    .writeText(JSON.stringify({ allMatches, aliasMap, nameMap }, null, 2))
    .then(() => {
      const el = document.getElementById("expOk");
      el.textContent = "Copied!";
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2500);
    })
    .catch(() => alert("Copy failed"));
}
function exportCSV() {
  const rows = [
    [
      "Date",
      "Team A P1",
      "Team A P2",
      "Score A",
      "Score B",
      "Team B P1",
      "Team B P2",
      "Note",
    ],
  ];
  allMatches.forEach((m) => {
    rows.push([
      m.date || "",
      m.teamA[0] || "",
      m.teamA[1] || "",
      m.scoreA,
      m.scoreB,
      m.teamB[0] || "",
      m.teamB[1] || "",
      m.note || "",
    ]);
  });
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "padel_matches.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const raw = prompt(
    "Paste JSON export data to import (matches + names + aliases):",
  );
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    alert("Invalid JSON data");
    return;
  }
  if (!Array.isArray(data.allMatches) || typeof data.aliasMap !== "object") {
    alert("JSON must include allMatches array and aliasMap object.");
    return;
  }
  allMatches = data.allMatches || [];
  aliasMap = data.aliasMap || {};
  nameMap = data.nameMap || {};
  lastMatchSnapshot = null;
  document.getElementById("undoAddBtn").style.display = "none";
  saveCloudData();
  renderHome();
  renderCompact();
  renderModernMatches();
  renderAddMatches();
  refreshManage();
  renderNamesTable();
  alert("Data imported successfully.");
}

// ── RENDER HOME ────────────────────────────────────────────
function applyRange(page) {
  if (page === "home") {
    homeFrom = document.getElementById("drFrom").value || null;
    homeTo = document.getElementById("drTo").value || null;
    if (homeFrom && homeTo) renderHome();
  } else {
    cmpFrom = document.getElementById("cmpFrom").value || null;
    cmpTo = document.getElementById("cmpTo").value || null;
    renderCompact();
  }
}
function onHomeFilterChange(val) {
  homeFilter = val;
  const dr = document.getElementById("homeDrRow");
  if (val === "range") {
    dr.classList.add("show");
  } else {
    dr.classList.remove("show");
    homeFrom = null;
    homeTo = null;
    renderHome();
  }
}

function onCmpFilter() {
  cmpFilter = document.getElementById("cmpSel").value;
  const dr = document.getElementById("cmpDr");
  if (cmpFilter === "range") dr.classList.add("show");
  else {
    dr.classList.remove("show");
    renderCompact();
  }
}

// home filter handled by onHomeFilterChange dropdown

// ── ABSENCE TRACKER ────────────────────────────────────────
function renderAbsenceBanner() {
  const banner = document.getElementById("absence-banner");
  if (!banner) return;
  if (!allMatches.length) {
    banner.innerHTML = "";
    return;
  }

  // Get today's date as ISO string
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // Find each player's last match date
  const lastSeen = {};
  allMatches.forEach((m) => {
    [...m.teamA, ...m.teamB].forEach((p) => {
      if (!lastSeen[p] || m.date > lastSeen[p]) lastSeen[p] = m.date;
    });
  });

  // Only flag players who have played at least 3 matches (regulars)
  const matchCounts = {};
  allMatches.forEach((m) => {
    [...m.teamA, ...m.teamB].forEach((p) => {
      matchCounts[p] = (matchCounts[p] || 0) + 1;
    });
  });

  const THRESHOLD = parseInt(
    localStorage.getItem("absence_threshold") || "7",
    10,
  );
  const absent = Object.entries(lastSeen)
    .filter(([p]) => matchCounts[p] >= 3)
    .map(([p, lastDate]) => {
      const last = new Date(lastDate + "T00:00:00");
      const days = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      return { name: p, days, lastDate };
    })
    .filter((a) => a.days >= THRESHOLD)
    .sort((a, b) => b.days - a.days);

  if (!absent.length) {
    banner.innerHTML = "";
    return;
  }

  const chips = absent
    .map((a) => {
      const weeks = Math.floor(a.days / 7);
      const label = weeks >= 2 ? `${weeks}w` : `${a.days}d`;
      return `<div class="absence-chip" title="Last played ${a.lastDate}">
                <span class="absence-name">${a.name}</span>
                <span class="absence-days">${label} away</span>
              </div>`;
    })
    .join("");

  banner.innerHTML = `<div class="absence-banner">
              <div class="absence-header">
                <span class="absence-title">👻 Missing in Action</span>
                <span class="absence-sub">${absent.length} player${absent.length > 1 ? "s" : ""} MIA 7+ days</span>
              </div>
              <div class="absence-chips">${chips}</div>
            </div>`;
}

// ── FORM SPARKLINE ─────────────────────────────────────────
function getFormSparkline(playerName, width = 80, height = 28) {
  // Get all matches involving player, sorted by date
  const pMatches = allMatches
    .filter((m) => m.teamA.includes(playerName) || m.teamB.includes(playerName))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (pMatches.length < 2) return "";

  const last10 = pMatches.slice(-10);

  // Compute cumulative SR after each match using running window
  const srPoints = last10.map((_, i) => {
    const window = pMatches.slice(0, pMatches.indexOf(last10[i]) + 1);
    const s = computeStats(window, computeElo(window)).find(
      (p) => p.name === playerName,
    );
    return s ? s.sr : 0;
  });

  const min = Math.min(...srPoints);
  const max = Math.max(...srPoints);
  const range = max - min || 0.1;
  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pts = srPoints.map((v, i) => {
    const x = pad + (i / (srPoints.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Trend: compare first half avg vs second half avg
  const mid = Math.floor(srPoints.length / 2);
  const firstAvg = srPoints.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const lastAvg =
    srPoints.slice(mid).reduce((a, b) => a + b, 0) / (srPoints.length - mid);
  const trending =
    lastAvg > firstAvg + 0.05
      ? "up"
      : lastAvg < firstAvg - 0.05
        ? "down"
        : "flat";
  const lineColor =
    trending === "up" ? "#36d47e" : trending === "down" ? "#f04f4f" : "#f5c842";

  // Build area fill path
  const firstPt = pts[0].split(",");
  const lastPt = pts[pts.length - 1].split(",");
  const areaPath = `M${firstPt[0]},${pad + h} L${pts.join(" L")} L${lastPt[0]},${pad + h} Z`;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
              <defs>
                <linearGradient id="sg_${playerName.replace(/\s/g, "_")}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
                </linearGradient>
              </defs>
              <path d="${areaPath}" fill="url(#sg_${playerName.replace(/\s/g, "_")})" />
              <polyline points="${pts.join(" ")}" fill="none" stroke="${lineColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="2.5" fill="${lineColor}"/>
            </svg>`;
}

function getSRRatingClass(normalizedSR) {
  let c =
    normalizedSR >= 7 ? "sr-high" : normalizedSR >= 4 ? "sr-mid" : "sr-low";
  if (normalizedSR > 7) c += " rev-limit";
  return c;
}

function renderHome() {
  renderAbsenceBanner();
  const filtered = filterMatches(homeFilter, homeFrom, homeTo);
  const homeEloMapFull = computeElo(filtered);
  const stats = computeStats(filtered, homeEloMapFull);
  const totalG = filtered.reduce((s, m) => s + m.scoreA + m.scoreB, 0);
  const uniqD = new Set(filtered.map((m) => m.date)).size;
  const board = document.getElementById("board");
  if (!stats.length) {
    board.innerHTML = `<div class="empty"><div class="ico">🏓</div><p>No matches yet.<br>Tap <strong style="color:var(--accent)">+ Add</strong> to get started.</p><button class="add-cta" onclick="goTo('add')">Add Matches</button></div>`;
    return;
  }
  const maxSR = stats[0].sr || 1;
  const homeEloMap = homeEloMapFull;
  const cardHtmls = stats.map((p, i) => {
    const rc = i === 0 ? "r1" : i === 1 ? "r2" : i === 2 ? "r3" : "";
    const ri =
      i === 0
        ? `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block"><defs><radialGradient id="mgG" cx="36%" cy="28%" r="72%"><stop offset="0%" stop-color="#fffce0"/><stop offset="28%" stop-color="#FFD700"/><stop offset="65%" stop-color="#C8920A"/><stop offset="100%" stop-color="#8B6307"/></radialGradient><radialGradient id="mgGHL" cx="30%" cy="22%" r="44%"><stop offset="0%" stop-color="rgba(255,255,255,0.6)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="20" cy="20" r="19.5" fill="#5c3700"/><circle cx="20" cy="20" r="18" fill="url(#mgG)"/><circle cx="20" cy="20" r="18" fill="url(#mgGHL)"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="rgba(255,240,120,0.55)" stroke-width="1.2"/><text x="20" y="27.5" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="19" font-weight="900" fill="#3d2000">1</text></svg>`
        : i === 1
          ? `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block"><defs><radialGradient id="mgS" cx="36%" cy="28%" r="72%"><stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#d4d8e8"/><stop offset="65%" stop-color="#8a92b0"/><stop offset="100%" stop-color="#5a618a"/></radialGradient><radialGradient id="mgSHL" cx="30%" cy="22%" r="44%"><stop offset="0%" stop-color="rgba(255,255,255,0.65)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="20" cy="20" r="19.5" fill="#2a2f4a"/><circle cx="20" cy="20" r="18" fill="url(#mgS)"/><circle cx="20" cy="20" r="18" fill="url(#mgSHL)"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="rgba(200,210,240,0.5)" stroke-width="1.2"/><text x="20" y="27.5" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="19" font-weight="900" fill="#1a1f3a">2</text></svg>`
          : i === 2
            ? `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block"><defs><radialGradient id="mgB" cx="36%" cy="28%" r="72%"><stop offset="0%" stop-color="#ffe8cc"/><stop offset="28%" stop-color="#CD853F"/><stop offset="65%" stop-color="#8B5A2B"/><stop offset="100%" stop-color="#5d3a1a"/></radialGradient><radialGradient id="mgBHL" cx="30%" cy="22%" r="44%"><stop offset="0%" stop-color="rgba(255,255,255,0.55)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="20" cy="20" r="19.5" fill="#3d1f08"/><circle cx="20" cy="20" r="18" fill="url(#mgB)"/><circle cx="20" cy="20" r="18" fill="url(#mgBHL)"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="rgba(255,180,100,0.5)" stroke-width="1.2"/><text x="20" y="27.5" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="19" font-weight="900" fill="#2d1000">3</text></svg>`
            : i + 1;
    const bw = ((p.sr / maxSR) * 100).toFixed(1);
    const normalizedSR = Math.max(0, Math.min(10, p.sr));
    const cardAngle = Math.round((normalizedSR / 10) * 180);
    const cardRatingClass = getSRRatingClass(normalizedSR);
    const ds = p.diff > 0 ? `+${p.diff}` : `${p.diff}`;
    const dc = p.diff > 0 ? "p" : p.diff < 0 ? "n" : "m";
    const mc = p.mw > p.ml ? "p" : p.mw < p.ml ? "n" : "m";
    const gc = p.gamePct >= 50 ? "tp" : "tn";
    const momentumBadge = getMomentumBadge(p.name);
    const sparklineSvg = getFormSparkline(p.name, 64, 20);
    const sparklineHtml = sparklineSvg
      ? `<div class="spark-row"><span class="spark-lbl">Form</span>${sparklineSvg}<span class="spark-full">Full stats →</span></div>`
      : "";
    const playerBadges = computeBadges(p.name, p, homeEloMap, filtered);
    const badgePillsHtml = playerBadges.length
      ? `<div class="card-badge-row">${playerBadges.map((b) => `<span class="card-badge-pill" title="${b.desc}">${b.icon} ${b.label}</span>`).join("")}</div>`
      : "";

    return `<div class="pc ${rc}" style="--card-index:${i}" onclick="openPlayerDetail('${p.name.replace(/'/g, "\\'")}')"><div class="glow"></div><div class="ct"><div class="rb">${ri}</div><div class="pname">${p.name}${momentumBadge ? `<span style="font-size:16px;margin-left:6px;vertical-align:middle">${momentumBadge}</span>` : ""}</div><div class="skill-block"><div class="mini-gauge-wrap"><div class="sr-ring ${cardRatingClass}" style="--speed-angle:${cardAngle}deg;--target-angle:${cardAngle}deg;"><div class="gauge"><div class="needle"></div></div><div class="sr-val">${p.sr.toFixed(2)}</div></div></div></div></div><div class="bar-track"><div class="bar-fill" style="width:${bw}%"></div></div><div class="row3"><div class="cs"><div class="cv">${p.mp}</div><div class="cl">Played</div></div><div class="cs"><div class="cv ${mc}">${p.mw}W–${p.ml}L</div><div class="cl">Record</div></div><div class="cs"><div class="cv">${p.winPct.toFixed(0)}%</div><div class="cl">Win %</div></div><div class="cs"><div class="cv">${p.gw}W–${p.gl}L</div><div class="cl">Games</div></div><div class="cs"><div class="cv ${gc}">${p.gamePct.toFixed(0)}%</div><div class="cl">G%</div></div></div>${sparklineHtml}</div>`;
  });

  if (document.body.classList.contains("splash-done")) {
    board.innerHTML = "";
    cardHtmls.forEach((html, i) => {
      setTimeout(() => {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        board.appendChild(tmp.firstChild);
        if (i === cardHtmls.length - 1) {
          runSpeedometerSweep();
          setTimeout(animateGauges, 50);
        }
      }, i * 100);
    });
  } else {
    board.innerHTML = cardHtmls.join("");
    runSpeedometerSweep();
    setTimeout(animateGauges, 50);
  }
}

// ── RENDER COMPACT ─────────────────────────────────────────
function runSpeedometerSweep() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".needle").forEach((needle) => {
      const ring = needle.closest(".sr-ring");
      if (!ring) return;
      const targetAngle = getComputedStyle(ring)
        .getPropertyValue("--speed-angle")
        .trim();
      const sweepAnim = needle.animate(
        [
          { transform: "translateX(-50%) rotate(-90deg)" },
          { transform: "translateX(-50%) rotate(90deg)", offset: 0.62 },
          {
            transform: `translateX(-50%) rotate(calc(-90deg + ${targetAngle}))`,
          },
        ],
        {
          duration: 2200,
          easing: "cubic-bezier(0.22,1.15,0.36,1)",
          fill: "forwards",
        },
      );
      if (ring.classList.contains("rev-limit")) {
        sweepAnim.onfinish = () => sweepAnim.cancel();
      }
    });
  });
}

function renderCompact() {
  const filtered = filterMatches(cmpFilter, cmpFrom, cmpTo);
  const stats = computeStats(filtered, computeElo(filtered));
  const sortFns = {
    name: (a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    mp: (a, b) => a.mp - b.mp,
    record: (a, b) => {
      if (cmpRecordSortMode === "wins") {
        if (a.mw !== b.mw) return a.mw - b.mw;
        if (a.ml !== b.ml) return a.ml - b.ml;
      } else {
        if (a.ml !== b.ml) return a.ml - b.ml;
        if (a.mw !== b.mw) return a.mw - b.mw;
      }
      return 0;
    },
    winPct: (a, b) => a.winPct - b.winPct,
    gw: (a, b) => a.gw - b.gw,
    gl: (a, b) => a.gl - b.gl,
    gamePct: (a, b) => a.gamePct - b.gamePct,
    sr: (a, b) => a.sr - b.sr,
  };
  const sorted = [...stats].sort((a, b) => {
    const cmp = sortFns[cmpSortKey](a, b);
    if (cmp !== 0) return cmpSortAsc ? cmp : -cmp;
    return a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
  });
  const maxSR = sorted.length ? sorted[0].sr || 1 : 1;
  const fname = {
    all: "All Time",
    today: "Today",
    week: "This Week",
    weekend: "Weekend",
    month: "This Month",
    range: "Custom Range",
  };
  document.getElementById("cmpMeta").innerHTML =
    `<strong>${stats.length}</strong> players &nbsp;·&nbsp; <strong>${filtered.length}</strong> matches &nbsp;·&nbsp; ${fname[cmpFilter]}`;
  const tbody = document.getElementById("cmpBody");
  if (!sorted.length) {
    _cmpLeaderHtmls = [];
    _cmpFiltered = filtered;
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--muted);font-size:12px">No data for this period</td></tr>`;
    document.getElementById("cmpMatches").innerHTML =
      buildCompactMatchRows(filtered);
    updateSortArrows(sorted);
    return;
  }
  updateSortArrows();

  const splashDone = document.body.classList.contains("splash-done");

  const leaderRowHtmls = sorted.map((p, i) => {
    const rc = i === 0 ? "rg" : i === 1 ? "rs" : i === 2 ? "rb2" : "";
    const ri =
      i === 0
        ? "🥇"
        : i === 1
          ? "🥈"
          : i === 2
            ? "🥉"
            : `<span class="rn">${i + 1}</span>`;
    const mc = p.mw > p.ml ? "p" : p.mw < p.ml ? "n" : "m";
    const gc = p.gamePct >= 50 ? "tp" : "tn";
    const normalizedSR = Math.max(0, Math.min(10, p.sr));
    const ratingClass = getSRRatingClass(normalizedSR);
    const momentumBadge = getMomentumBadge(p.name);
    const pillW = Math.round((normalizedSR / 10) * 100);
    const animClass = splashDone ? " row-reveal-anim" : "";
    return `<tr class="${rc}${animClass}" style="cursor:pointer" onclick="openPlayerDetail('${p.name.replace(/'/g, "\\'")}')"><td>${ri}</td><td>${p.name.toUpperCase()}${momentumBadge ? `<span style="margin-left:5px">${momentumBadge}</span>` : ""}</td><td>${p.mp}</td><td><span class="rec-cell ${mc}">${p.mw}–${p.ml}</span></td><td>${p.winPct.toFixed(0)}%</td><td class="tp">${p.gw}</td><td class="tn">${p.gl}</td><td class="${gc}">${p.gamePct.toFixed(0)}%</td><td><div class="sr-pill ${ratingClass}"><div class="sr-pill-bar"><div class="sr-pill-fill" style="width:${pillW}%"></div></div><span class="sr-pill-val">${p.sr.toFixed(2)}</span></div></td></tr>`;
  });

  _cmpLeaderHtmls = leaderRowHtmls;
  _cmpFiltered = filtered;

  const reversedMatches = [...filtered].reverse();
  const matchRowHtmls = reversedMatches.map((m) => buildMatchRowHtml(m));

  const cmpMatchesEl = document.getElementById("cmpMatches");
  const matchesHeader = cmpMatchesEl.previousElementSibling;

  if (splashDone) {
    tbody.innerHTML = "";
    cmpMatchesEl.innerHTML = "";
    matchesHeader.style.opacity = "0";
    matchesHeader.style.transform = "translateY(14px)";
    matchesHeader.style.transition =
      "opacity 0.38s cubic-bezier(0.22,1,0.36,1), transform 0.38s cubic-bezier(0.22,1,0.36,1)";

    leaderRowHtmls.forEach((html, i) => {
      setTimeout(() => {
        tbody.insertAdjacentHTML("beforeend", html);
      }, i * 100);
    });

    const matchStartDelay = leaderRowHtmls.length * 100;
    setTimeout(() => {
      matchesHeader.style.opacity = "1";
      matchesHeader.style.transform = "translateY(0)";
    }, matchStartDelay);

    if (matchRowHtmls.length) {
      const table = document.createElement("table");
      table.className = "cmp-match-rows";
      const matchTbody = document.createElement("tbody");
      table.appendChild(matchTbody);
      setTimeout(() => cmpMatchesEl.appendChild(table), matchStartDelay);
      const animCount = Math.min(10, reversedMatches.length);
      const animRows = reversedMatches
        .slice(0, animCount)
        .map((m) => buildMatchRowHtml(m, " row-reveal-anim"));
      const restRows = reversedMatches
        .slice(animCount)
        .map((m) => buildMatchRowHtml(m));
      animRows.forEach((html, i) => {
        setTimeout(
          () => {
            matchTbody.insertAdjacentHTML("beforeend", html);
          },
          matchStartDelay + i * 100,
        );
      });
      if (restRows.length) {
        setTimeout(
          () => {
            matchTbody.insertAdjacentHTML("beforeend", restRows.join(""));
          },
          matchStartDelay + animCount * 100,
        );
      }
      const summaryHtml = buildHistorySummary(filtered, cmpFilter);
      if (summaryHtml) {
        setTimeout(
          () => {
            cmpMatchesEl.insertAdjacentHTML("beforeend", summaryHtml);
          },
          matchStartDelay + animCount * 100 + 100,
        );
      }
    } else {
      setTimeout(() => {
        cmpMatchesEl.innerHTML = `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
      }, matchStartDelay);
    }
  } else {
    matchesHeader.style.cssText = "";
    tbody.innerHTML = leaderRowHtmls.join("");
    const reversedFiltered = [...filtered].reverse();
    const initRows = reversedFiltered.map((m, i) =>
      i < 10
        ? buildMatchRowHtml(m, " row-reveal-anim", i * 100)
        : buildMatchRowHtml(m),
    );
    if (initRows.length) {
      cmpMatchesEl.innerHTML =
        `<table class="cmp-match-rows"><tbody>${initRows.join("")}</tbody></table>` +
        buildHistorySummary(filtered, cmpFilter);
    } else {
      cmpMatchesEl.innerHTML = `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
    }
  }
}

function updateSortArrows() {
  const keyMap = {
    name: ["sort-name"],
    mp: ["sort-mp"],
    record: ["sort-record"],
    winPct: ["sort-winPct"],
    gw: ["sort-gw"],
    gl: ["sort-gl"],
    gamePct: ["sort-gamePct"],
    sr: ["sort-sr", "sort-rank"],
  };
  Object.entries(keyMap).forEach(([key, ids]) => {
    ids.forEach((id) => {
      const arrow = document.getElementById(id);
      if (!arrow) return;
      arrow.textContent = cmpSortKey === key ? (cmpSortAsc ? "▲" : "▼") : "";
      arrow.classList.toggle("active", cmpSortKey === key);
    });
  });
}

function setCmpSort(key) {
  if (cmpSortKey === key) {
    if (key === "record") {
      cmpRecordSortMode = cmpRecordSortMode === "wins" ? "losses" : "wins";
      cmpSortAsc = false;
    } else {
      cmpSortAsc = !cmpSortAsc;
    }
  } else {
    cmpSortKey = key;
    cmpSortAsc = key === "name";
    if (key === "record") cmpRecordSortMode = "wins";
  }
  renderCompact();
}

// ── MATCH HISTORY HELPERS ──────────────────────────────────
function getMatchTag(m) {
  return null; // tag moved to event strip below score
}

function isFireMatch(m) {
  return Math.abs(m.scoreA - m.scoreB) <= 1;
}

function isDominatingMatch(m) {
  const winnerScore = Math.max(Number(m.scoreA), Number(m.scoreB));
  const loserScore = Math.min(Number(m.scoreA), Number(m.scoreB));
  return (
    (winnerScore === 4 && loserScore === 1) ||
    (winnerScore === 6 && (loserScore === 1 || loserScore === 2))
  );
}

function isZeroMatch(m) {
  return Number(m.scoreA) === 0 || Number(m.scoreB) === 0;
}

function buildMatchRowHtml(m, extraClass = "", delay = null) {
  const aWon = m.scoreA > m.scoreB;
  const winA = aWon ? "cmr-win" : "cmr-loss";
  const winB = !aWon ? "cmr-win" : "cmr-loss";
  const teamA = (m.teamA || []).join(" & ");
  const teamB = (m.teamB || []).join(" & ");
  const diff = Math.abs(m.scoreA - m.scoreB);
  const badge = isFireMatch(m)
    ? `<span class="cmr-badge cmr-fire">🔥</span>`
    : isDominatingMatch(m)
      ? `<span class="cmr-badge cmr-dom">💀</span>`
      : isZeroMatch(m)
        ? `<span class="cmr-badge cmr-zero">😂</span>`
        : "";
  const delayStyle =
    delay !== null ? ` style="animation-delay:${delay}ms"` : "";
  return `<tr class="cmr-row${extraClass}"${delayStyle}>
          <td class="cmr-date">${fmtDate(m.date)
            .replace(/\s+\d{4}$/, "")
            .toUpperCase()}</td>
          <td class="cmr-team ${winA}">${teamA}</td>
          <td class="cmr-sc"><span class="cmr-sv ${winA}">${m.scoreA}</span><span class="cmr-dash">–</span><span class="cmr-sv ${winB}">${m.scoreB}</span></td>
          <td class="cmr-team cmr-team-r ${winB}">${teamB}</td>
          <td class="cmr-meta">${badge}</td>
        </tr>`;
}

function buildCompactMatchRows(matches) {
  if (!matches.length)
    return `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
  return `<table class="cmp-match-rows"><tbody>${[...matches]
    .reverse()
    .map((m) => buildMatchRowHtml(m))
    .join("")}</tbody></table>`;
}

function buildMatchCards(matches, showAdmin) {
  if (!matches.length)
    return `<div class="empty"><div class="ico">🏓</div><p>No matches found</p></div>`;
  // Single chronological walk: compute per-match ELO deltas AND pre-match pair ranks
  const eloMatchMap = new Map();
  const matchPairRankMap = new Map(); // match → Map(pairKey → pre-match rank)
  const _finalElo = {};
  const _allPairsList = getPairStats(); // all pairs ever formed
  {
    const elo = _finalElo;
    [...allMatches]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .forEach((m) => {
        [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => { if (!(p in elo)) elo[p] = 1000; });
        // Rank all pairs by their avg ELO right now (before this match)
        matchPairRankMap.set(m, new Map(
          _allPairsList
            .map((p) => ({ key: p.key, avgElo: p.players.reduce((s, n) => s + (elo[n] || 1000), 0) / p.players.length }))
            .sort((a, b) => b.avgElo - a.avgElo)
            .map(({ key }, i) => [key, i + 1])
        ));
        const aWon = m.scoreA > m.scoreB;
        const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
        const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
        const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
        const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
        const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
        const mData = {};
        (m.teamA || []).forEach((p) => { const after = (elo[p] || 1000) + dA; mData[p] = { delta: dA, after }; elo[p] = after; });
        (m.teamB || []).forEach((p) => { const after = (elo[p] || 1000) + dB; mData[p] = { delta: dB, after }; elo[p] = after; });
        eloMatchMap.set(m, mData);
      });
  }
  const mkEloPill = (p, eloData) => {
    const d = eloData[p];
    if (!d) return "";
    const display = normPlayer(p);
    const short = Object.keys(nameMap).find(k => nameMap[k] === display && k.length === 3) || display.slice(0, 3).toUpperCase();
    const cls = d.delta >= 0 ? "elo-gain" : "elo-loss";
    const arrow = d.delta >= 0 ? "↑" : "↓";
    return `<span class="elo-delta-pill ${cls}"><span class="elo-pname">${short}</span><span class="elo-pval">${d.after}</span><span class="elo-parrow">${arrow}${Math.abs(d.delta)}</span></span>`;
  };

  const mkTeamBlock = (players, won, score, hasZeroEmoji, preMatchRankMap) => {
    const winCls = won ? "winner" : "";
    const scoreCls = won ? "win" : "";
    const crown = won ? "👑 " : "";
    const rank = preMatchRankMap?.get(getPairKey(players));
    const rankHtml = rank ? `<div class="team-pair-rank">ELO #${rank}</div>` : "";
    if (players.length >= 2) {
      const p2Suffix = hasZeroEmoji ? " 😭" : "";
      return `<div class="team-block team-block-split">
        <span class="team-p1 ${winCls}">${crown}${players[0]}</span>
        <span class="team-amp">&</span>
        <span class="team-p2 ${winCls}">${players[1]}${p2Suffix}</span>
        <div class="team-score ${scoreCls}" data-final="${score}">0</div>
        ${rankHtml}
      </div>`;
    }
    const label = (players[0] || "") + (hasZeroEmoji ? " 😭" : "");
    return `<div class="team-block">
      <div class="team-name ${winCls}">${crown}${label}</div>
      <div class="team-score ${scoreCls}" data-final="${score}">0</div>
      ${rankHtml}
    </div>`;
  };

  return [...matches]
    .reverse()
    .map((m, index) => {
      const aWon = m.scoreA > m.scoreB;
      const diff = Math.abs(m.scoreA - m.scoreB);
      const isFire = isFireMatch(m);
      const isDominating = isDominatingMatch(m);
      const aZero = m.scoreA === 0,
        bZero = m.scoreB === 0;
      const isZero = isZeroMatch(m);

      const bWon = !aWon;
      const realIdx = allMatches.indexOf(m);

      // Event badges
      const badges = [];
      if (isFire)
        badges.push(`<span class="event-badge fire">🔥 FIRE MATCH</span>`);
      if (isDominating)
        badges.push(`<span class="event-badge dominate">💀 DOMINATING</span>`);
      if (isZero)
        badges.push(
          `<span class="event-badge zero">😂 ZERO SE HAAR GAYE!</span>`,
        );

      const delay = Math.min(index * 0.1, 1); // Staggered delay up to 1s

      const noteHtml = m.note
        ? `<div class="match-note">📝 ${m.note}</div>`
        : "";
      return `
              <div class="match-card${isFire ? " fire-card" : ""}${isDominating ? " dominate-card" : ""}${isZero ? " zero-card" : ""}" style="animation-delay: ${delay}s;" data-match-idx="${realIdx}" data-margin="${diff}">
                <div class="match-card-inner">
                <div class="match-top">
                  <span class="match-date">📅 ${fmtDate(m.date)}</span>
                  <span class="match-tag">${diff} game${diff === 1 ? "" : "s"} gap</span>
                </div>
                <div class="match-score-row" style="margin-top:10px">
                  ${mkTeamBlock(m.teamA || [], aWon, m.scoreA, aZero && bWon, matchPairRankMap.get(m))}
                  <div class="vs-text">VS</div>
                  ${mkTeamBlock(m.teamB || [], bWon, m.scoreB, bZero && aWon, matchPairRankMap.get(m))}
                </div>
                ${(() => {
                  const ed = eloMatchMap.get(m) || {};
                  const aP = (m.teamA || []).map(p => mkEloPill(p, ed)).join("");
                  const bP = (m.teamB || []).map(p => mkEloPill(p, ed)).join("");
                  return `<div class="match-elo-row"><div class="match-elo-team">${aP}</div><div class="match-elo-vs-gap"></div><div class="match-elo-team">${bP}</div></div>`;
                })()}
                ${badges.length ? `<div class="match-event-strip">${badges.join("")}</div>` : ""}
                ${noteHtml}
                <div class="match-footer" style="margin-top:10px">
                  ${
                    showAdmin && window.isAdmin
                      ? `<div class="match-actions">
                    <button class="action-btn edit-btn" onclick="editMatchByIndex(${realIdx})">✏ Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteMatchByIndex(${realIdx})">🗑 Del</button>
                    <button class="action-btn rematch-btn" onclick="quickRematch(${realIdx})">⚡ Rematch</button>
                  </div>`
                      : `<div></div>`
                  }
                </div>
                </div>
                ${window.isAdmin ? `<div class="swipe-delete-reveal" onclick="deleteMatchByIndex(${realIdx})">🗑<br><span>Delete</span></div>` : ""}
              </div>`;
    })
    .join("");
}

function filterMatchTab(f) {
  matchTabFilter = f;
  document
    .querySelectorAll("[data-mf]")
    .forEach((b) => b.classList.remove("on"));
  const active = document.querySelector(`[data-mf="${f}"]`);
  if (active) active.classList.add("on");
  const dr = document.getElementById("matchDr");
  if (dr) {
    dr.style.display = ""; // always clear inline override first
    if (f === "range") {
      dr.classList.add("show");
    } else {
      dr.classList.remove("show");
      const mf = document.getElementById("matchFrom");
      const mt = document.getElementById("matchTo");
      if (mf) mf.value = "";
      if (mt) mt.value = "";
    }
  }
  renderModernMatches();
}

// ── MATCH OF THE DAY + BIGGEST UPSET ──────────────────────
function getPlayerRankAtDate(playerName, beforeDate) {
  // Rank based on SR from all matches strictly before this date
  const prior = allMatches.filter((m) => m.date < beforeDate);
  if (!prior.length) return null;
  const stats = computeStats(prior);
  const idx = stats.findIndex((p) => p.name === playerName);
  return idx === -1 ? null : idx + 1; // 1-based rank
}

function buildMatchOfTheDay() {
  if (!allMatches.length) return "";
  const latestDate = allMatches.reduce(
    (max, m) => (m.date > max ? m.date : max),
    "",
  );
  const sessionMatches = allMatches.filter((m) => m.date === latestDate);
  if (!sessionMatches.length) return "";

  // ── MATCH OF THE DAY: closest scoreline, then highest total ──
  const scored = sessionMatches.map((m) => ({
    m,
    diff: Math.abs(m.scoreA - m.scoreB),
    total: m.scoreA + m.scoreB,
  }));
  scored.sort((a, b) => a.diff - b.diff || b.total - a.total);
  const { m: motd } = scored[0];

  const aWon = motd.scoreA > motd.scoreB;
  const teamA = motd.teamA.join(" & ");
  const teamB = motd.teamB.join(" & ");
  const winner = aWon ? teamA : teamB;
  const loser = aWon ? teamB : teamA;
  const wScore = aWon ? motd.scoreA : motd.scoreB;
  const lScore = aWon ? motd.scoreB : motd.scoreA;
  const isThriller = Math.abs(motd.scoreA - motd.scoreB) <= 1;
  const motdLabel = isThriller ? "🎭 THRILLER" : "⚡ MATCH OF THE DAY";
  const motdSub = isThriller
    ? `Closest game of the session — decided by just ${Math.abs(motd.scoreA - motd.scoreB)} game${Math.abs(motd.scoreA - motd.scoreB) === 1 ? "" : "s"}!`
    : `Most dramatic result of the session`;

  const motdHtml = `<div class="motd-card">
              <div class="motd-header">
                <span class="motd-label">${motdLabel}</span>
                <span class="motd-date">📅 ${fmtDate(latestDate)}</span>
              </div>
              <div class="motd-teams">
                <div class="motd-team winner">
                  <div class="motd-name">👑 ${winner}</div>
                  <div class="motd-score win" data-final="${wScore}">0</div>
                </div>
                <div class="motd-vs">VS</div>
                <div class="motd-team">
                  <div class="motd-name">${loser}</div>
                  <div class="motd-score" data-final="${lScore}">0</div>
                </div>
              </div>
              <div class="motd-sub">${motdSub}</div>
            </div>`;

  // ── BIGGEST UPSET: lower-ELO pair beats higher-ELO pair ──
  let upsetHtml = "";
  // Chronological ELO walk — capture pre-match pair rank for each session match
  const _allPairsForUpset = getPairStats();
  const upsetMatchRankMap = new Map(); // match → Map(pairKey → pre-match rank)
  {
    const elo = {};
    [...allMatches]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .forEach((m) => {
        [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => { if (!(p in elo)) elo[p] = 1000; });
        if (sessionMatches.includes(m)) {
          upsetMatchRankMap.set(m, new Map(
            _allPairsForUpset
              .map((p) => ({ key: p.key, avgElo: p.players.reduce((s, n) => s + (elo[n] || 1000), 0) / p.players.length }))
              .sort((a, b) => b.avgElo - a.avgElo)
              .map(({ key }, i) => [key, i + 1])
          ));
        }
        const aWon = m.scoreA > m.scoreB;
        const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
        const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
        const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
        const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
        const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
        m.teamA.forEach((p) => { elo[p] = (elo[p] || 1000) + dA; });
        m.teamB.forEach((p) => { elo[p] = (elo[p] || 1000) + dB; });
      });
  }
  const getPairEloRank = (m, team) =>
    upsetMatchRankMap.get(m)?.get([...team].sort().join(" & ")) || "?";

  let bestUpset = null, bestGap = 0;
  sessionMatches.forEach((m) => {
    const winTeam = m.scoreA > m.scoreB ? m.teamA : m.teamB;
    const loseTeam = m.scoreA > m.scoreB ? m.teamB : m.teamA;
    const mRankMap = upsetMatchRankMap.get(m);
    if (!mRankMap) return;
    const winRank = mRankMap.get([...winTeam].sort().join(" & ")) || 999;
    const loseRank = mRankMap.get([...loseTeam].sort().join(" & ")) || 999;
    // Upset = winner had a worse (higher number) rank than loser
    const gap = winRank - loseRank;
    if (gap > 0 && gap > bestGap) {
      bestGap = gap;
      bestUpset = { m, winTeam, loseTeam };
    }
  });

  if (bestUpset) {
    const { m: um, winTeam, loseTeam } = bestUpset;
    const uWin = um.scoreA > um.scoreB ? um.scoreA : um.scoreB;
    const uLose = um.scoreA > um.scoreB ? um.scoreB : um.scoreA;
    const winEloRank = getPairEloRank(um, winTeam);
    const loseEloRank = getPairEloRank(um, loseTeam);
    upsetHtml = `<div class="motd-card upset-card">
                <div class="motd-header">
                  <span class="motd-label upset-label">🚨 BIGGEST UPSET</span>
                  <span class="motd-date">📅 ${fmtDate(latestDate)}</span>
                </div>
                <div class="motd-teams">
                  <div class="motd-team winner">
                    <div class="motd-name">👑 ${winTeam.join(" & ")}</div>
                    <div class="motd-score win" data-final="${uWin}">0</div>
                    <div class="upset-rank">ELO #${winEloRank}</div>
                  </div>
                  <div class="motd-vs">VS</div>
                  <div class="motd-team">
                    <div class="motd-name">${loseTeam.join(" & ")}</div>
                    <div class="motd-score" data-final="${uLose}">0</div>
                    <div class="upset-rank">ELO #${loseEloRank} favored</div>
                  </div>
                </div>
                <div class="motd-sub">Lower-ELO pair pulled off a shock win 😤</div>
              </div>`;
  }

  return motdHtml + upsetHtml;
}

function buildHistorySummary(matches, filter = "all") {
  if (matches.length < 3) return "";
  const stats = computeStats(matches, computeElo(matches));
  const playerSet = new Set();
  let totalGames = 0,
    totalMargin = 0;
  const scoreDist = {};
  matches.forEach((m) => {
    [...m.teamA, ...m.teamB].forEach((p) => playerSet.add(normPlayer(p)));
    totalGames += m.scoreA + m.scoreB;
    totalMargin += Math.abs(m.scoreA - m.scoreB);
    const hi = Math.max(m.scoreA, m.scoreB),
      lo = Math.min(m.scoreA, m.scoreB);
    const k = `${hi}-${lo}`;
    scoreDist[k] = (scoreDist[k] || 0) + 1;
  });
  const avgMargin = (totalMargin / matches.length).toFixed(1);
  const top3 = stats.slice(0, Math.min(3, stats.length));
  const medals = ["🥇", "🥈", "🥉"];
  const medalColors = ["var(--gold)", "var(--silver)", "var(--bronze)"];
  let delay = 60;
  const d = () => {
    const v = delay;
    delay += 65;
    return v;
  };
  const podiumHtml = top3
    .map(
      (p, i) =>
        `<div class="hsum-row hsum-cascade" style="animation-delay:${d()}ms">
            <span class="hsum-medal">${medals[i]}</span>
            <span class="hsum-pname">${p.name}</span>
            <span class="hsum-rec">${p.mw}W–${p.ml}L</span>
            <span class="hsum-pct" style="color:${medalColors[i]}">${p.winPct.toFixed(0)}%</span>
            <span class="hsum-sr">${p.sr.toFixed(2)} SR</span>
          </div>`,
    )
    .join("");
  const highlights = [];
  const pairs = getPairStats(matches).filter((p) => p.played >= 2);
  if (pairs.length) {
    const b = pairs[0];
    highlights.push(
      `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">🤝</span><span class="hsum-hl-label">Best Pair</span><span class="hsum-hl-val">${b.key} &nbsp;<span style="color:var(--green)">${b.winPct}% · ${b.played}g</span></span></div>`,
    );
  }
  const bigWin = [...matches].sort(
    (a, b) => Math.abs(b.scoreA - b.scoreB) - Math.abs(a.scoreA - a.scoreB),
  )[0];
  if (bigWin) {
    const w = bigWin.scoreA > bigWin.scoreB ? bigWin.teamA : bigWin.teamB;
    highlights.push(
      `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">💀</span><span class="hsum-hl-label">Biggest Win</span><span class="hsum-hl-val">${bigWin.scoreA}–${bigWin.scoreB} &nbsp;${w.join(" & ")}</span></div>`,
    );
  }
  const hottest = stats
    .filter((p) => p.curStreak > 0 && p.curType === "W")
    .sort((a, b) => b.curStreak - a.curStreak)[0];
  if (hottest) {
    highlights.push(
      `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">🔥</span><span class="hsum-hl-label">On Fire</span><span class="hsum-hl-val">${hottest.name} &nbsp;<span style="color:var(--green)">${hottest.curStreak} win streak</span></span></div>`,
    );
  }
  const topScore = Object.entries(scoreDist).sort((a, b) => b[1] - a[1])[0];
  if (topScore && topScore[1] > 1) {
    highlights.push(
      `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">🎯</span><span class="hsum-hl-label">Top Scoreline</span><span class="hsum-hl-val">${topScore[0]} &nbsp;<span style="color:var(--muted)">${topScore[1]}× played</span></span></div>`,
    );
  }
  // Hot / Cold board
  const hotPlayers = stats
    .filter((p) => p.curType === "W" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)
    .slice(0, 2);
  const coldPlayers = stats
    .filter((p) => p.curType === "L" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)
    .slice(0, 2);
  let hotColdHtml = "";
  if (hotPlayers.length || coldPlayers.length) {
    const rows = [
      ...hotPlayers.map(
        (p) =>
          `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">🔥</span><span class="hsum-hl-label" style="color:var(--green)">${p.name}</span><span class="hsum-hl-val" style="color:var(--green)">${p.curStreak}W streak</span></div>`,
      ),
      ...coldPlayers.map(
        (p) =>
          `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">❄️</span><span class="hsum-hl-label" style="color:var(--red)">${p.name}</span><span class="hsum-hl-val" style="color:var(--red)">${p.curStreak}L streak</span></div>`,
      ),
    ];
    hotColdHtml = `<div class="hsum-section-lbl">HOT &amp; COLD</div><div class="hsum-highlights">${rows.join("")}</div>`;
  }

  // Top ELO gainer within the filtered period
  const potwLabels = {
    today:    { title: "PLAYER OF THE DAY",          sub: "matches today" },
    week:     { title: "PLAYER OF THE WEEK",          sub: "matches this week" },
    weekend:  { title: "PLAYER OF THE WEEKEND",       sub: "matches this weekend" },
    month:    { title: "PLAYER OF THE MONTH",         sub: "matches this month" },
    lastweek: { title: "BEST PLAYER OF LAST WEEK",    sub: "matches last week" },
    all:      { title: "ALL TIME BEST PLAYER",          sub: "matches played" },
    range:    { title: "TOP PLAYER",                  sub: "matches in range" },
  };
  const potwLabel = potwLabels[filter] || potwLabels.all;
  let potwHtml = "";
  if (matches.length >= 2) {
    const periodDates = matches.map((m) => m.date || "").filter(Boolean);
    const firstDate = periodDates.reduce((a, b) => (a < b ? a : b));
    const preElo  = computeElo(allMatches.filter((m) => (m.date || "") < firstDate));
    const fullElo = computeElo(allMatches);
    const periodPlayers = new Set();
    matches.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => periodPlayers.add(p)),
    );
    const potwDeltas = [...periodPlayers]
      .map((p) => ({
        name: normPlayer(p),
        delta: Math.round((fullElo[p] || 1000) - (preElo[p] || 1000)),
        mp: matches.filter((m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p),
        ).length,
      }))
      .filter((p) => p.delta > 0 && p.mp >= 2)
      .sort((a, b) => b.delta - a.delta);
    const potw = potwDeltas[0];
    if (potw) {
      potwHtml = `<div class="potw-card hsum-cascade" style="animation-delay:${d()}ms">
        <div class="potw-crown">⭐</div>
        <div class="potw-body">
          <div class="potw-label">${potwLabel.title}</div>
          <div class="potw-name">${potw.name}</div>
          <div class="potw-meta"><span style="color:var(--green);font-weight:800">+${potw.delta} ELO</span> · ${potw.mp} ${potwLabel.sub}</div>
        </div>
      </div>`;
    }
  }

  // ELO changes across the entire filtered period
  let sessionRecapHtml = "";
  if (matches.length) {
    const periodDates = matches.map((m) => m.date || "1970-01-01");
    const firstDate = periodDates.reduce((a, b) => (a < b ? a : b));
    const eloAfter  = computeElo(allMatches);
    const eloBefore = computeElo(allMatches.filter((m) => (m.date || "1970-01-01") < firstDate));
    const periodPlayers = new Set();
    matches.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => periodPlayers.add(p)),
    );
    const deltas = [...periodPlayers]
      .map((p) => ({
        name: normPlayer(p),
        delta: Math.round((eloAfter[p] || 1000) - (eloBefore[p] || 1000)),
      }))
      .sort((a, b) => b.delta - a.delta);
    const deltaRows = deltas.map((p) => {
      const sign   = p.delta > 0 ? "+" : "";
      const chipCls = p.delta > 0 ? "sr-chip-g" : p.delta < 0 ? "sr-chip-l" : "sr-chip-z";
      const arrow  = p.delta > 0 ? "▲" : p.delta < 0 ? "▼" : "·";
      return `<div class="elo-delta-row hsum-cascade" style="animation-delay:${d()}ms">
        <span class="elo-delta-name">${p.name}</span>
        <span class="sr-chip ${chipCls}">${arrow} ${sign}${p.delta}</span>
      </div>`;
    }).join("");
    sessionRecapHtml = `
      <div class="hsum-section-lbl">ELO CHANGES</div>
      <div class="elo-delta-list">${deltaRows}</div>`;
  }

  return `<div class="hist-summary-card hsum-card-anim">
          <div class="hsum-header">
            <span class="hsum-title">📊 HIGHLIGHTS</span>
            <span class="hsum-count">${matches.length} match${matches.length > 1 ? "es" : ""}</span>
          </div>
          <div class="hsum-stats">
            <div class="hsum-stat hsum-cascade" style="animation-delay:0ms"><div class="hsum-val">${matches.length}</div><div class="hsum-lbl">Matches</div></div>
            <div class="hsum-stat hsum-cascade" style="animation-delay:65ms"><div class="hsum-val">${playerSet.size}</div><div class="hsum-lbl">Players</div></div>
            <div class="hsum-stat hsum-cascade" style="animation-delay:130ms"><div class="hsum-val">${totalGames}</div><div class="hsum-lbl">Games</div></div>
            <div class="hsum-stat hsum-cascade" style="animation-delay:195ms"><div class="hsum-val">±${avgMargin}</div><div class="hsum-lbl">Avg Margin</div></div>
          </div>
          ${potwHtml}
          ${top3.length ? `<div class="hsum-section-lbl">Top Performers</div><div class="hsum-podium">${podiumHtml}</div>` : ""}
          ${highlights.length ? `<div class="hsum-section-lbl">AWARDS</div><div class="hsum-highlights">${highlights.join("")}</div>` : ""}
          ${hotColdHtml}
          ${sessionRecapHtml}
        </div>`;
}

function toggleMatchesSection() {
  const table = document.querySelector("#cmpMatches .cmp-match-rows");
  const chevron = document.getElementById("cmpMatchesChevron");
  if (!table) return;
  table.classList.toggle("collapsed");
  chevron?.classList.toggle("collapsed");
}

function toggleMatchCalendar() {
  const cal = document.getElementById("match-calendar");
  const btn = document.getElementById("calToggleBtn");
  if (!cal) return;
  const open = cal.style.display === "none";
  cal.style.display = open ? "block" : "none";
  if (btn) btn.classList.toggle("cal-toggle-active", open);
  if (open) renderMatchCalendar();
}

function renderMatchCalendar() {
  const cal = document.getElementById("match-calendar");
  if (!cal) return;

  const matchDates = new Set(allMatches.map((m) => m.date).filter(Boolean));
  const matchCountByDate = {};
  allMatches.forEach((m) => {
    if (m.date) matchCountByDate[m.date] = (matchCountByDate[m.date] || 0) + 1;
  });

  const todayStr = todayISO();
  const year = calYear,
    month = calMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const totalDays = lastDay.getDate();
  const monthName = firstDay.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  let cells = "";
  // Empty cells before first day
  for (let i = 0; i < startDow; i++)
    cells += `<div class="cal-cell cal-empty"></div>`;
  for (let d = 1; d <= totalDays; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const count = matchCountByDate[iso] || 0;
    const isToday = iso === todayStr;
    const hasMatch = count > 0;
    cells += `<div class="cal-cell${isToday ? " cal-today" : ""}${hasMatch ? " cal-has-match" : ""}" onclick="calDayClick('${iso}')">
      <span class="cal-day-num">${d}</span>
      ${hasMatch ? `<span class="cal-dot" title="${count} match${count > 1 ? "es" : ""}"></span>` : ""}
    </div>`;
  }

  cal.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav" onclick="calNav(-1)">‹</button>
      <span class="cal-month-lbl">${monthName}</span>
      <button class="cal-nav" onclick="calNav(1)">›</button>
    </div>
    <div class="cal-dow-row">
      ${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="cal-dow">${d}</div>`).join("")}
    </div>
    <div class="cal-grid">${cells}</div>`;
}

function calNav(dir) {
  calMonth += dir;
  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }
  renderMatchCalendar();
}

function calDayClick(iso) {
  // Highlight selected day
  document
    .querySelectorAll(".cal-cell.cal-selected")
    .forEach((el) => el.classList.remove("cal-selected"));
  document.querySelectorAll(".cal-cell").forEach((el) => {
    const d = parseInt(iso.slice(8));
    const y = parseInt(iso.slice(0, 4));
    const mo = parseInt(iso.slice(5, 7)) - 1;
    if (
      y === calYear &&
      mo === calMonth &&
      el.querySelector(".cal-day-num")?.textContent === String(d)
    )
      el.classList.add("cal-selected");
  });
  // Set state before navigating so switchMainTab picks it up
  matchTabFilter = "range";
  const mf = document.getElementById("matchFrom");
  const mt = document.getElementById("matchTo");
  if (mf) mf.value = iso;
  if (mt) mt.value = iso;
  const dr = document.getElementById("matchDr");
  if (dr) {
    dr.style.display = "";
    dr.classList.add("show");
  }
  // Navigate — switchMainTab calls renderModernMatches() which reads the state above
  switchMainTab("history");
}

function renderModernMatches() {
  const query = (
    document.getElementById("modern-match-search")?.value || ""
  ).toLowerCase();
  const mfrom =
    matchTabFilter === "range"
      ? document.getElementById("matchFrom")?.value || null
      : null;
  const mto =
    matchTabFilter === "range"
      ? document.getElementById("matchTo")?.value || null
      : null;
  let matches = filterMatches(matchTabFilter, mfrom, mto);
  if (query)
    matches = matches.filter((m) =>
      JSON.stringify(m).toLowerCase().includes(query),
    );
  if (histSeasonFilter) {
    matches = matches.filter((m) =>
      (m.date || "").startsWith(histSeasonFilter),
    );
  }
  // Player filter
  if (histPlayerFilter) {
    matches = matches.filter((m) =>
      [...m.teamA, ...m.teamB].some(
        (p) =>
          (nameMap[p] || p).toLowerCase() === histPlayerFilter.toLowerCase(),
      ),
    );
  }
  // Outcome filter (requires a player to be selected)
  if (histOutcomeFilter !== "all" && histPlayerFilter) {
    matches = matches.filter((m) => {
      const inA = m.teamA.some(
        (p) =>
          (nameMap[p] || p).toLowerCase() === histPlayerFilter.toLowerCase(),
      );
      const aWon = m.scoreA > m.scoreB;
      const playerWon = inA ? aWon : !aWon;
      return histOutcomeFilter === "win" ? playerWon : !playerWon;
    });
  }
  if (histPairFilter) {
    matches = matches.filter((m) => pairInMatch(m, histPairFilter));
  }
  if (h2hFilterA && h2hFilterB) {
    matches = matches.filter((m) => playersOpposed(m, h2hFilterA, h2hFilterB));
  }
  if (histScorelineFilter) {
    matches = matches.filter((m) => {
      if (histScorelineFilter === "zero") return isZeroMatch(m);
      return normalizedScoreline(m) === histScorelineFilter;
    });
  }
  // Margin filter
  if (histMarginFilter !== "all") {
    matches = matches.filter((m) => {
      if (histMarginFilter === "close") return isFireMatch(m);
      if (histMarginFilter === "dominating") return isDominatingMatch(m);
      if (histMarginFilter === "zero") return isZeroMatch(m);
      return true;
    });
  }
  let summary = "";
  if (h2hFilterA && h2hFilterB) {
    const h2h = getHeadToHeadStats(h2hFilterA, h2hFilterB, allMatches);
    const total = h2h.aWins + h2h.bWins || 1;
    const aWinPct = Math.round((h2h.aWins / total) * 100);
    const bWinPct = 100 - aWinPct;
    const aCol =
      aWinPct > bWinPct
        ? "var(--green)"
        : aWinPct < bWinPct
          ? "var(--red)"
          : "var(--text)";
    const bCol =
      bWinPct > aWinPct
        ? "var(--green)"
        : bWinPct < aWinPct
          ? "var(--red)"
          : "var(--text)";
    const diffStr = h2h.diff >= 0 ? `+${h2h.diff}` : `${h2h.diff}`;
    const escA = h2hFilterA.replace(/'/g, "\\'");
    const escB = h2hFilterB.replace(/'/g, "\\'");
    const h2hEloHist = computeEloHistory(allMatches);
    const h2hP1Pts = (h2hEloHist[h2hFilterA] || []).filter((pt) => pt.opponent.split(" & ").includes(h2hFilterB));
    const h2hP2Pts = (h2hEloHist[h2hFilterB] || []).filter((pt) => pt.opponent.split(" & ").includes(h2hFilterA));
    const h2hP1Impact = h2hP1Pts.reduce((s, pt) => s + pt.delta, 0);
    const h2hP2Impact = h2hP2Pts.reduce((s, pt) => s + pt.delta, 0);
    const fmtEloImpact = (n) => n > 0 ? `<span style="color:var(--green)">+${n}</span>` : n < 0 ? `<span style="color:var(--red)">${n}</span>` : `<span style="color:var(--muted)">0</span>`;
    summary = `<div class="pair-stats-card" style="margin-bottom:10px" onclick="openH2HDetail('${escA}','${escB}')">
            <div class="psc-header"><span class="psc-badge">⚔️ Head-to-Head</span><span class="psc-tap">Full stats →</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-size:15px;font-weight:900;color:var(--text);text-transform:uppercase">${h2hFilterA}</div>
              <div style="font-size:11px;font-weight:800;color:var(--muted)">VS</div>
              <div style="font-size:15px;font-weight:900;color:var(--text);text-align:right;text-transform:uppercase">${h2hFilterB}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
              <div style="font-size:26px;font-weight:900;color:${aCol};min-width:32px">${h2h.aWins}</div>
              <div style="flex:1;height:6px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;display:flex">
                <div style="width:${aWinPct}%;background:${aCol};transition:width 0.5s"></div>
              </div>
              <div style="font-size:26px;font-weight:900;color:${bCol};min-width:32px;text-align:right">${h2h.bWins}</div>
            </div>
            <div class="psc-stats">
              <div class="psc-stat"><div class="psc-sv">${total}</div><div class="psc-sl">Played</div></div>
              <div class="psc-divider"></div>
              <div class="psc-stat"><div class="psc-sv" style="color:${aCol}">${aWinPct}%</div><div class="psc-sl">${h2hFilterA.split(" ")[0]} Win%</div></div>
              <div class="psc-divider"></div>
              <div class="psc-stat"><div class="psc-sv ${h2h.diff >= 0 ? "p" : "n"}">${diffStr}</div><div class="psc-sl">Game Diff</div></div>
              <div class="psc-divider"></div>
              <div class="psc-stat"><div class="psc-sv" style="color:${bCol}">${bWinPct}%</div><div class="psc-sl">${h2hFilterB.split(" ")[0]} Win%</div></div>
            </div>
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)" onclick="event.stopPropagation()">
              <div style="font-size:9px;font-weight:800;letter-spacing:0.1em;color:var(--muted);margin-bottom:6px">ELO IMPACT FROM THIS RIVALRY</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-size:16px;font-weight:900">${fmtEloImpact(h2hP1Impact)}</div>
                  <div style="font-size:9px;color:var(--muted)">${h2hFilterA.toUpperCase()}</div>
                </div>
                <div style="font-size:9px;color:var(--muted)">ELO GAINED / LOST</div>
                <div style="text-align:right">
                  <div style="font-size:16px;font-weight:900">${fmtEloImpact(h2hP2Impact)}</div>
                  <div style="font-size:9px;color:var(--muted)">${h2hFilterB.toUpperCase()}</div>
                </div>
              </div>
            </div>
          </div>`;
  }
  if (histPairFilter) {
    const pairMatches = allMatches.filter((m) =>
      pairInMatch(m, histPairFilter),
    );
    if (pairMatches.length) {
      let pw = 0,
        pgw = 0,
        pgl = 0;
      pairMatches.forEach((m) => {
        const isPair = getPairKey(m.teamA) === histPairFilter;
        const ps = isPair ? m.scoreA : m.scoreB;
        const os = isPair ? m.scoreB : m.scoreA;
        pgw += ps;
        pgl += os;
        if (ps > os) pw++;
      });
      const pp = pairMatches.length,
        pl = pp - pw;
      const wpct = Math.round((pw / pp) * 100);
      const diff = pgw - pgl;
      const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
      const col =
        wpct >= 60 ? "var(--green)" : wpct <= 40 ? "var(--red)" : "var(--text)";
      const escKey = histPairFilter.replace(/'/g, "\\'");
      const gpct = Math.round((pgw / (pgw + pgl || 1)) * 100);
      summary =
        `<div class="pair-stats-card" onclick="openPairDetail('${escKey}')">
              <div class="psc-header">
                <span class="psc-badge">🤝 Pair Stats</span>
                <span class="psc-tap">Full stats →</span>
              </div>
              <div class="psc-hero">
                <div class="psc-name">${histPairFilter}</div>
                <div class="psc-winrate" style="color:${col}">${wpct}%</div>
              </div>
              <div class="psc-bar-wrap"><div class="psc-bar" style="width:${wpct}%;background:${col}"></div></div>
              <div class="psc-stats">
                <div class="psc-stat"><div class="psc-sv">${pp}</div><div class="psc-sl">Played</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv p">${pw}</div><div class="psc-sl">Wins</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv n">${pl}</div><div class="psc-sl">Losses</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv ${diff >= 0 ? "p" : "n"}">${diffStr}</div><div class="psc-sl">Diff</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv">${pgw}–${pgl}</div><div class="psc-sl">Games</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv">${gpct}%</div><div class="psc-sl">Game %</div></div>
              </div>
            </div>` + summary;
    }
  }
  const isFiltered =
    matchTabFilter !== "today" ||
    histPlayerFilter ||
    histPairFilter ||
    histOutcomeFilter !== "all" ||
    histMarginFilter !== "all" ||
    histScorelineFilter ||
    histSeasonFilter ||
    h2hFilterA ||
    h2hFilterB;
  const motdHtml = isFiltered ? "" : buildMatchOfTheDay();
  const histList = document.getElementById("modern-match-list");
  histList.innerHTML = "";

  // Parse all content into a temp container
  const tmpAll = document.createElement("div");
  tmpAll.innerHTML = motdHtml + summary + buildMatchCards(matches, true);

  // Collect feature cards first, then match cards
  const featureCards = Array.from(
    tmpAll.querySelectorAll(
      ".motd-card, .upset-card, .thriller-card, .pair-stats-card",
    ),
  );
  const matchCards = Array.from(tmpAll.querySelectorAll(".match-card"));
  const emptyEl = tmpAll.querySelector(".empty");

  // Build a flat cascade: feature cards + first 10 match cards animated, rest instant
  const allAnimated = [...featureCards, ...matchCards.slice(0, 10)];
  const instant = matchCards.slice(10);

  allAnimated.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.animation = "none";
    setTimeout(() => {
      el.style.animation = "";
      el.style.opacity = "";
      el.classList.add("card-anim");
      histList.appendChild(el);
      el.querySelectorAll(".team-score[data-final], .motd-score[data-final]").forEach((scoreEl) => {
        const final = parseInt(scoreEl.dataset.final, 10);
        if (!isNaN(final) && final > 0) {
          let cur = 0;
          scoreEl.textContent = "0";
          const tick = () => {
            cur = Math.min(cur + 1, final);
            scoreEl.textContent = cur;
            if (cur < final) setTimeout(tick, 140);
          };
          setTimeout(tick, 80);
        } else {
          scoreEl.textContent = scoreEl.dataset.final || "0";
        }
      });
    }, i * 100);
  });

  if (instant.length) {
    setTimeout(() => {
      instant.forEach((el) => {
        el.querySelectorAll(".team-score[data-final], .motd-score[data-final]").forEach((scoreEl) => {
          scoreEl.textContent = scoreEl.dataset.final || "0";
        });
        el.style.animation = "none";
        el.style.opacity = "1";
        el.style.transform = "none";
        histList.appendChild(el);
      });
    }, allAnimated.length * 100);
  }

  if (!allAnimated.length && !instant.length && emptyEl) {
    histList.appendChild(emptyEl);
  }
  populateHistoryPlayerChips();
  populateHistoryAdvancedFilters();
}

function populateHistoryPlayerChips() {
  const select = document.getElementById("histPlayerSelect");
  if (!select) return;
  const currentPlayer = histPlayerFilter;
  const names = new Set();
  allMatches.forEach((m) => {
    [...m.teamA, ...m.teamB].forEach((p) => names.add(nameMap[p] || p));
  });
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  select.innerHTML =
    '<option value="">ALL PLAYERS</option>' +
    sorted
      .map(
        (name) =>
          `<option value="${name.replace(/"/g, "&quot;")}" ${currentPlayer === name ? "selected" : ""}>${name.toUpperCase()}</option>`,
      )
      .join("");
  select.value = currentPlayer;
}

function populateHistoryAdvancedFilters() {
  const pairSelect = document.getElementById("histPairFilter");
  if (!pairSelect) return;
  const currentPair = pairSelect.value || histPairFilter;
  const pairOptions = getPairStats()
    .map(
      (p) =>
        `<option value="${p.key.replace(/"/g, "&quot;")}" ${currentPair === p.key ? "selected" : ""}>${p.key.toUpperCase()} (${p.wins}-${p.losses})</option>`,
    )
    .join("");
  pairSelect.innerHTML = `<option value="">ALL PAIRS</option>${pairOptions}`;
  pairSelect.value = currentPair;

  // ── Populate H2H player selects ──
  const h2hA = document.getElementById("h2hPlayerA");
  const h2hB = document.getElementById("h2hPlayerB");
  if (h2hA && h2hB) {
    const names = new Set();
    allMatches.forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
        names.add(nameMap[p] || p),
      );
    });
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    const opts = sorted
      .map(
        (n) =>
          `<option value="${n.replace(/"/g, "&quot;")}">${n.toUpperCase()}</option>`,
      )
      .join("");
    const savedA = h2hA.value || h2hFilterA;
    const savedB = h2hB.value || h2hFilterB;
    h2hA.innerHTML = `<option value="">P1</option>${opts}`;
    h2hB.innerHTML = `<option value="">P2</option>${opts}`;

    if (savedA) h2hA.value = savedA;
    if (savedB) h2hB.value = savedB;
  }

  const seasonSelect = document.getElementById("histSeasonFilter");
  if (seasonSelect) {
    const currentSeason = seasonSelect.value || histSeasonFilter;
    const seasons = [
      ...new Set(
        allMatches
          .map((m) => (m.date || "").slice(0, 7))
          .filter((date) => /^\d{4}-\d{2}$/.test(date)),
      ),
    ].sort((a, b) => b.localeCompare(a));
    seasonSelect.innerHTML =
      '<option value="">ALL</option>' +
      seasons
        .map(
          (season) =>
            `<option value="${season}" ${currentSeason === season ? "selected" : ""}>${season}</option>`,
        )
        .join("");
    seasonSelect.value = currentSeason;
  }

  const data = document.getElementById("player-suggestions");
  if (data) {
    data.innerHTML = getAllPlayerNamesFromMatches()
      .map((player) => `<option value="${player}">`)
      .join("");
  }
}

function setHistPlayerFilter(name) {
  histPlayerFilter = name;
  if (name) {
    // Clear P1/P2 when a player is chosen
    h2hFilterA = "";
    h2hFilterB = "";
    const a = document.getElementById("h2hPlayerA");
    const b = document.getElementById("h2hPlayerB");
    if (a) a.value = "";
    if (b) b.value = "";
  } else {
    histOutcomeFilter = "all";
    refreshOutcomeButtons();
  }
  populateHistoryPlayerChips();
  renderModernMatches();
}

function setHistOutcome(val) {
  histOutcomeFilter = val;
  refreshOutcomeButtons();
  renderModernMatches();
}

function setHistMargin(val) {
  histMarginFilter = val;
  document
    .querySelectorAll("[data-margin]")
    .forEach((b) => b.classList.remove("on"));
  document.querySelector(`[data-margin="${val}"]`)?.classList.add("on");
  renderModernMatches();
}

function setHistPairFilter(val) {
  histPairFilter = val;
  if (val) {
    // Clear P1/P2 when a pair is chosen
    h2hFilterA = "";
    h2hFilterB = "";
    const a = document.getElementById("h2hPlayerA");
    const b = document.getElementById("h2hPlayerB");
    if (a) a.value = "";
    if (b) b.value = "";
  }
  renderModernMatches();
}

function setHistScorelineFilter(val) {
  histScorelineFilter = val;
  renderModernMatches();
}

function setHistSeasonFilter(val) {
  histSeasonFilter = val;
  renderModernMatches();
}

function applyHeadToHeadFilter() {
  h2hFilterA = document.getElementById("h2hPlayerA").value.trim();
  h2hFilterB = document.getElementById("h2hPlayerB").value.trim();
  if (h2hFilterA || h2hFilterB) {
    // Clear player and pair filters when H2H is set
    histPlayerFilter = "";
    histPairFilter = "";
    const ps = document.getElementById("histPlayerSelect");
    const pr = document.getElementById("histPairFilter");
    if (ps) ps.value = "";
    if (pr) pr.value = "";
    populateHistoryPlayerChips();
  }
  renderModernMatches();
}

function onHeadToHeadInput() {
  const a = document.getElementById("h2hPlayerA").value.trim();
  const b = document.getElementById("h2hPlayerB").value.trim();
  if (!a || !b) {
    h2hFilterA = "";
    h2hFilterB = "";
    renderModernMatches();
  }
}

function clearHeadToHeadPlayer(which) {
  const id = which === "A" ? "h2hPlayerA" : "h2hPlayerB";
  document.getElementById(id).value = "";
  h2hFilterA = "";
  h2hFilterB = "";
  renderModernMatches();
}

function clearHeadToHeadFilter() {
  h2hFilterA = "";
  h2hFilterB = "";
  document.getElementById("h2hPlayerA").value = "";
  document.getElementById("h2hPlayerB").value = "";
  renderModernMatches();
}

function refreshOutcomeButtons() {
  document
    .querySelectorAll("[data-outcome]")
    .forEach((b) => b.classList.remove("on"));
  document
    .querySelector(`[data-outcome="${histOutcomeFilter}"]`)
    ?.classList.add("on");
}

function getPlayerStats(matches) {
  const stats = {};
  matches.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    m.teamA.forEach((p) => {
      if (!stats[p])
        stats[p] = {
          name: p,
          matches: 0,
          wins: 0,
          losses: 0,
          gw: 0,
          gl: 0,
          net: 0,
        };
      stats[p].matches++;
      stats[p].gw += m.scoreA;
      stats[p].gl += m.scoreB;
      stats[p].net = stats[p].gw - stats[p].gl;
      if (aWon) stats[p].wins++;
      else stats[p].losses++;
    });
    m.teamB.forEach((p) => {
      if (!stats[p])
        stats[p] = {
          name: p,
          matches: 0,
          wins: 0,
          losses: 0,
          gw: 0,
          gl: 0,
          net: 0,
        };
      stats[p].matches++;
      stats[p].gw += m.scoreB;
      stats[p].gl += m.scoreA;
      stats[p].net = stats[p].gw - stats[p].gl;
      if (!aWon) stats[p].wins++;
      else stats[p].losses++;
    });
  });
  return Object.values(stats).sort((a, b) => b.matches - a.matches);
}

function renderAddMatches() {
  const query = (
    document.getElementById("add-match-search")?.value || ""
  ).toLowerCase();
  let matches = query
    ? allMatches.filter((m) => JSON.stringify(m).toLowerCase().includes(query))
    : [...allMatches];
  const addList = document.getElementById("add-match-list");
  addList.innerHTML = buildMatchCards(matches, true);
  addList.querySelectorAll(".team-score[data-final], .motd-score[data-final]").forEach((el) => {
    el.textContent = el.dataset.final || "0";
  });
}

function deleteMatchByIndex(i) {
  if (!confirm("Delete this match?")) return;
  allMatches.splice(i, 1);
  saveCloudData();
  renderModernMatches();
  renderAddMatches();
  renderHome();
  renderCompact();
}
function closeMatchEdit() {
  document.querySelectorAll(".match-edit-inline").forEach((el) => {
    const idx = el.dataset.editIdx;
    el.classList.remove("open");
    const src = document.querySelector(`.match-card[data-match-idx="${idx}"]`);
    if (src) src.classList.remove("edit-active");
    setTimeout(() => el.remove(), 260);
  });
}

function editMatchByIndex(i) {
  const m = allMatches[i];
  if (!m) return;
  // If clicking the same card again, toggle closed
  const existing = document.querySelector(
    `.match-edit-inline[data-edit-idx="${i}"]`,
  );
  if (existing) {
    closeMatchEdit();
    return;
  }
  closeMatchEdit();
  const players = Object.keys(aliasMap).sort((a, b) => a.localeCompare(b));
  const opts = (val) =>
    players
      .map(
        (p) =>
          `<option value="${p}"${p === val ? " selected" : ""}>${p}</option>`,
      )
      .join("");
  const el = document.createElement("div");
  el.className = "match-edit-inline";
  el.dataset.editIdx = i;
  el.innerHTML = `
    <div class="mei-header">
      <span class="mei-title">✏ EDIT MATCH</span>
      <button class="mei-close" onclick="closeMatchEdit()">✕</button>
    </div>
    <div class="mei-section-lbl">DATE</div>
    <input id="edit-match-date" type="date" class="mei-input" style="width:100%;margin-bottom:10px" value="${m.date || todayISO()}">
    <div class="mei-section-lbl" style="color:var(--green)">TEAM A</div>
    <div class="mei-row">
      <select id="edit-a1" class="mei-sel"><option value="">P1</option>${opts(m.teamA[0])}</select>
      <select id="edit-a2" class="mei-sel"><option value="">P2</option>${opts(m.teamA[1])}</select>
    </div>
    <div class="mei-section-lbl" style="color:var(--red)">TEAM B</div>
    <div class="mei-row">
      <select id="edit-b1" class="mei-sel"><option value="">P1</option>${opts(m.teamB[0])}</select>
      <select id="edit-b2" class="mei-sel"><option value="">P2</option>${opts(m.teamB[1])}</select>
    </div>
    <div class="mei-section-lbl">SCORE</div>
    <div class="mei-row" style="align-items:center;margin-bottom:10px">
      <input id="edit-sa" type="number" min="0" max="20" class="mei-input mei-score" value="${m.scoreA}">
      <span style="color:var(--muted);font-weight:900;font-size:18px;padding:0 4px">–</span>
      <input id="edit-sb" type="number" min="0" max="20" class="mei-input mei-score" value="${m.scoreB}">
    </div>
    <div class="mei-section-lbl">NOTE <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>
    <input id="edit-note" type="text" class="mei-input" style="width:100%;margin-bottom:10px" placeholder="e.g. rainy day, semifinals…" value="${m.note || ""}">
    <div id="edit-match-err" style="color:var(--red);font-size:12px;margin-bottom:6px;display:none"></div>
    <div class="mei-actions">
      <button class="mei-cancel" onclick="closeMatchEdit()">Cancel</button>
      <button class="mei-save" onclick="saveMatchEdit(${i})">Save Changes</button>
    </div>`;
  const srcCard = document.querySelector(`.match-card[data-match-idx="${i}"]`);
  if (srcCard) {
    srcCard.insertAdjacentElement("afterend", el);
    srcCard.classList.add("edit-active");
  } else {
    const list = document.getElementById("modern-match-list");
    if (list) list.prepend(el);
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add("open"));
  });
  setTimeout(
    () => el.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    60,
  );
}

function saveMatchEdit(i) {
  const m = allMatches[i];
  if (!m) return;
  const date = document.getElementById("edit-match-date")?.value;
  const a1 = document.getElementById("edit-a1")?.value;
  const a2 = document.getElementById("edit-a2")?.value;
  const b1 = document.getElementById("edit-b1")?.value;
  const b2 = document.getElementById("edit-b2")?.value;
  const sa = parseInt(document.getElementById("edit-sa")?.value);
  const sb = parseInt(document.getElementById("edit-sb")?.value);
  const note = document.getElementById("edit-note")?.value.trim();
  const errEl = document.getElementById("edit-match-err");
  const show = (msg) => {
    errEl.textContent = msg;
    errEl.style.display = "block";
  };
  if (!a1 || !b1) return show("Select at least P1 for each team.");
  if (isNaN(sa) || isNaN(sb)) return show("Enter valid scores.");
  if (sa === sb) return show("Scores cannot be equal.");
  const teamA = [a1, a2].filter(Boolean);
  const teamB = [b1, b2].filter(Boolean);
  if (teamA.length !== teamB.length)
    return show("Both teams must have the same size.");
  m.date = date || m.date;
  m.teamA = teamA;
  m.teamB = teamB;
  m.scoreA = sa;
  m.scoreB = sb;
  if (note) m.note = note;
  else delete m.note;
  saveCloudData();
  closeMatchEdit();
  renderModernMatches();
  renderAddMatches();
  renderHome();
  renderCompact();
}

// ── FAB MODAL ──────────────────────────────────────────────
function populatePlayerDropdowns() {
  const displayNames = Object.keys(aliasMap).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const placeholders = {
    "modern-team-a-p1": "Team A — P1",
    "modern-team-a-p2": "Team A — P2",
    "modern-team-b-p1": "Team B — P1",
    "modern-team-b-p2": "Team B — P2",
  };
  Object.entries(placeholders).forEach(([id, label]) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML =
      `<option value="">${label}</option>` +
      displayNames.map((n) => `<option value="${n}">${n}</option>`).join("");
    sel.value = "";
  });
}

function openFabModal() {
  const activeTab = document.querySelector(".itab.on");
  if (activeTab && activeTab.textContent.includes("Add Matches")) {
    openModernAddModal();
  } else if (activeTab && activeTab.textContent.includes("Names")) {
    openNameAddModal();
  }
}

function openModernAddModal() {
  document.getElementById("modern-add-modal").classList.add("show");
  document.getElementById("modern-date").value = todayISO();
  populatePlayerDropdowns();
}

function quickRematch(idx) {
  const m = allMatches[idx];
  if (!m) return;
  // Swap teams: winners become team B, losers become team A
  const newA = (m.teamB || []).map((p) => nameMap[p] || p);
  const newB = (m.teamA || []).map((p) => nameMap[p] || p);
  openModernAddModal();
  requestAnimationFrame(() => {
    const sel = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.value = val;
    };
    sel("modern-team-a-p1", newA[0] || "");
    sel("modern-team-a-p2", newA[1] || "");
    sel("modern-team-b-p1", newB[0] || "");
    sel("modern-team-b-p2", newB[1] || "");
    // Clear scores so user enters fresh result
    const sa = document.getElementById("modern-score-a");
    const sb = document.getElementById("modern-score-b");
    if (sa) sa.value = "";
    if (sb) sb.value = "";
  });
}
function closeModernAddModal() {
  document.getElementById("modern-add-modal").classList.remove("show");
  const noteEl = document.getElementById("modern-note");
  if (noteEl) noteEl.value = "";
}
document.getElementById("modern-add-modal").addEventListener("click", (e) => {
  if (e.target.id === "modern-add-modal") closeModernAddModal();
});

function openNameAddModal() {
  document.getElementById("name-add-modal").classList.add("show");
}
function closeNameAddModal() {
  document.getElementById("name-add-modal").classList.remove("show");
}
document.getElementById("name-add-modal").addEventListener("click", (e) => {
  if (e.target.id === "name-add-modal") closeNameAddModal();
});

function saveQuickName() {
  const display = document.getElementById("name-display").value.trim();
  const aliasesText = document.getElementById("name-aliases").value.trim();

  if (!display) {
    alert("Display name is required");
    return;
  }

  const aliases = aliasesText
    ? aliasesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  // Add to textarea format
  const currentText = document.getElementById("namesTA").value;
  const newEntry = `${display} - ${aliases.join(", ")}`;
  document.getElementById("namesTA").value = currentText
    ? currentText + "\n" + newEntry
    : newEntry;

  // Save the names
  saveNames();

  // Close modal and clear fields
  closeNameAddModal();
  document.getElementById("name-display").value = "";
  document.getElementById("name-aliases").value = "";
}

function saveModernMatch() {
  const p1a = document.getElementById("modern-team-a-p1").value;
  const p2a = document.getElementById("modern-team-a-p2").value;
  const p1b = document.getElementById("modern-team-b-p1").value;
  const p2b = document.getElementById("modern-team-b-p2").value;
  const sA = parseInt(document.getElementById("modern-score-a").value);
  const sB = parseInt(document.getElementById("modern-score-b").value);
  const date = document.getElementById("modern-date").value || todayISO();
  const note = document.getElementById("modern-note")?.value.trim() || "";
  if (!p1a || !p2a || !p1b || !p2b || isNaN(sA) || isNaN(sB) || sA === sB) {
    alert("Invalid match data");
    return;
  }
  const teamA = [p1a, p2a];
  const teamB = [p1b, p2b];
  const prevSnapshot = [...allMatches];
  lastMatchSnapshot = prevSnapshot;
  const match = { teamA, teamB, scoreA: sA, scoreB: sB, date };
  if (note) match.note = note;
  allMatches.push(match);
  checkMilestones(prevSnapshot, allMatches);
  saveCloudData();
  closeModernAddModal();
  renderModernMatches();
  renderAddMatches();
  renderHome();
  renderCompact();
}

function openPlayerDetail(name) {
  document.getElementById("player-detail-modal")?.remove();
  const detail = getPlayerDetail(name);
  if (!detail.stats) {
    alert("No player stats found.");
    return;
  }
  const s = detail.stats;

  // Feature 1: current streak
  const streakIcon = s.curStreak > 0 ? (s.curType === "W" ? "🔥" : "❄️") : "";
  const streakColor =
    s.curStreak > 0
      ? s.curType === "W"
        ? "var(--green)"
        : "var(--red)"
      : "var(--muted)";
  const streakStr =
    s.curStreak > 0 ? `${streakIcon} ${s.curStreak}${s.curType}` : "—";

  // Feature 4: form dots (larger in detail view)
  const formDotsHtml =
    s.form.length > 0
      ? s.form
          .map(
            (r) =>
              `<span class="fd fd-lg ${r === "W" ? "fd-w" : "fd-l"}">${r}</span>`,
          )
          .join("")
      : `<span style="color:var(--muted);font-size:11px">—</span>`;

  // Feature 5: avg margin
  const marginVal =
    s.avgMargin >= 0 ? `+${s.avgMargin.toFixed(1)}` : s.avgMargin.toFixed(1);
  const marginColor =
    s.avgMargin > 0
      ? "var(--green)"
      : s.avgMargin < 0
        ? "var(--red)"
        : "var(--muted)";

  // Form graph — rolling 5-match win rate sparkline
  const graphMatches = [...detail.matches]
    .sort(
      (a, b) =>
        new Date(a.date || "1970-01-01") - new Date(b.date || "1970-01-01"),
    )
    .slice(-15);
  const formGraphHtml = (() => {
    if (graphMatches.length < 3) return "";
    const WINDOW = 5,
      W = 260,
      H = 56,
      PAD = 8;
    const wins = graphMatches.map((m) => {
      const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
      const own = inA ? Number(m.scoreA) : Number(m.scoreB);
      const opp = inA ? Number(m.scoreB) : Number(m.scoreA);
      return own > opp ? 1 : 0;
    });
    const rates = wins.map((_, i) => {
      const sl = wins.slice(Math.max(0, i - WINDOW + 1), i + 1);
      return sl.reduce((s, v) => s + v, 0) / sl.length;
    });
    const n = rates.length;
    const xs = rates.map((_, i) => PAD + (i / (n - 1)) * (W - PAD * 2));
    const ys = rates.map((r) => H - PAD - r * (H - PAD * 2));
    const pathD = xs
      .map(
        (x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`,
      )
      .join(" ");
    const areaD =
      pathD +
      ` L${xs[n - 1].toFixed(1)},${(H - PAD).toFixed(1)} L${xs[0].toFixed(1)},${(H - PAD).toFixed(1)} Z`;
    const last = rates[n - 1];
    const lineColor =
      last >= 0.6 ? "#36d47e" : last <= 0.4 ? "#f04f4f" : "#f5c842";
    const gId = `fg_${name.replace(/\W+/g, "_")}`;
    const dots = xs
      .map(
        (x, i) =>
          `<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.5" fill="${wins[i] ? "#36d47e" : "#f04f4f"}"/>`,
      )
      .join("");
    return `<div class="ana-card">
      <span class="badge">Form Graph</span>
      <div style="margin-top:10px">
        <svg width="100%" height="56" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;overflow:visible">
          <defs>
            <linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${lineColor}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <line x1="${PAD}" y1="${(H / 2).toFixed(1)}" x2="${(W - PAD).toFixed(1)}" y2="${(H / 2).toFixed(1)}" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="4,4"/>
          <path d="${areaD}" fill="url(#${gId})"/>
          <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          ${dots}
        </svg>
        <div style="display:flex;justify-content:space-between;margin-top:5px">
          <span class="sub">rolling 5-match win rate · last ${n}</span>
          <span style="font-size:11px;font-weight:800;color:${lineColor}">${(last * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>`;
  })();

  // Feature 2: best / worst partner
  const bestPartnerHtml = s.bestPartner
    ? `
          <div class="det-conn">
            <div class="det-conn-icon">🤝</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${s.bestPartner.name}</div>
              <div class="det-conn-meta"><span class="p">${s.bestPartner.pct.toFixed(0)}% win</span> · ${s.bestPartner.played}g</div>
            </div>
            <div class="det-conn-tag">Best Partner</div>
          </div>`
    : "";

  const worstPartnerHtml =
    s.worstPartner && s.worstPartner.name !== s.bestPartner?.name
      ? `
          <div class="det-conn">
            <div class="det-conn-icon">⚡</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${s.worstPartner.name}</div>
              <div class="det-conn-meta"><span class="n">${s.worstPartner.pct.toFixed(0)}% win</span> · ${s.worstPartner.played}g</div>
            </div>
            <div class="det-conn-tag">Worst Partner</div>
          </div>`
      : "";

  // Feature 3: nemesis / fav opponent
  const nemesisHtml = s.nemesis
    ? `
          <div class="det-conn">
            <div class="det-conn-icon">⚔️</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${s.nemesis.name}</div>
              <div class="det-conn-meta"><span class="n">${s.nemesis.pct.toFixed(0)}% win rate</span> · ${s.nemesis.played}g</div>
            </div>
            <div class="det-conn-tag">Nemesis</div>
          </div>`
    : "";

  const favOppHtml =
    s.favOpp && s.favOpp.name !== s.nemesis?.name
      ? `
          <div class="det-conn">
            <div class="det-conn-icon">💪</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${s.favOpp.name}</div>
              <div class="det-conn-meta"><span class="p">${s.favOpp.pct.toFixed(0)}% win rate</span> · ${s.favOpp.played}g</div>
            </div>
            <div class="det-conn-tag">Fav Opponent</div>
          </div>`
      : "";

  const mostCommonPartnerHtml = detail.topMate
    ? `<div class="det-conn">
            <div class="det-conn-icon">👥</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${detail.topMate[0]}</div>
              <div class="det-conn-meta">${detail.topMate[1]} matches together</div>
            </div>
            <div class="det-conn-tag">Most Common Partner</div>
          </div>`
    : "";

  const mostCommonOppHtml = detail.toughOpp
    ? `<div class="det-conn">
            <div class="det-conn-icon">🎯</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${detail.toughOpp[0]}</div>
              <div class="det-conn-meta">${detail.toughOpp[1]} matches faced</div>
            </div>
            <div class="det-conn-tag">Most Common Opponent</div>
          </div>`
    : "";

  const connectionsHtml =
    bestPartnerHtml ||
    worstPartnerHtml ||
    nemesisHtml ||
    favOppHtml ||
    mostCommonPartnerHtml ||
    mostCommonOppHtml
      ? `<div class="ana-card">
              <span class="badge">Connections</span>
              <div class="det-conn-list">${bestPartnerHtml}${worstPartnerHtml}${nemesisHtml}${favOppHtml}${mostCommonPartnerHtml}${mostCommonOppHtml}</div>
            </div>`
      : "";

  // ELO
  const eloMap = computeElo(allMatches);
  const playerElo = eloMap[name] || 1000;
  const eloChange = playerElo - 1000;
  const eloChangeStr = eloChange > 0 ? `+${eloChange}` : `${eloChange}`;
  const eloChangeCol =
    eloChange > 0
      ? "var(--green)"
      : eloChange < 0
        ? "var(--red)"
        : "var(--muted)";

  // Badges
  const badges = computeBadges(name, s, eloMap, allMatches);
  const badgesHtml = badges.length
    ? `<div class="ana-card"><span class="badge">Award Badges</span><div class="badge-chips" style="margin-top:10px">${badges.map((b) => `<div class="badge-chip" title="${b.desc}"><span>${b.icon}</span><span class="badge-chip-lbl">${b.label}</span></div>`).join("")}</div></div>`
    : "";

  // Clutch stats
  const playerMatchesForClutch = allMatches.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  let closePlayed = 0,
    closeWins = 0;
  playerMatchesForClutch.forEach((m) => {
    if (Math.abs(m.scoreA - m.scoreB) > 1) return;
    const inA = (m.teamA || []).includes(name);
    const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    closePlayed++;
    if (won) closeWins++;
  });
  const clutchPct = closePlayed > 0 ? (closeWins / closePlayed) * 100 : 0;
  const clutchLabel =
    closePlayed >= 3
      ? clutchPct > 60
        ? `<span style="color:var(--green);font-weight:800">CLUTCH</span>`
        : clutchPct < 40
          ? `<span style="color:var(--red);font-weight:800">CHOKER</span>`
          : `<span style="color:var(--muted);font-weight:800">NEUTRAL</span>`
      : "";
  const clutchHtml =
    closePlayed >= 3
      ? `<div class="ana-card"><span class="badge">Clutch Factor</span><div class="det-streak-row"><div class="det-streak-cell"><div class="det-streak-val">${clutchPct.toFixed(0)}%</div><div class="sub">Clutch Win%</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val">${closePlayed}</div><div class="sub">Close Matches</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val">${clutchLabel}</div><div class="sub">Rating</div></div></div></div>`
      : "";

  // Leaderboard Race stats for this player
  const { from: wkFrom, to: wkTo } = lastWeekRange();
  const allEloMap = computeElo(allMatches);
  const allRanked = computeStats(allMatches, allEloMap);
  const preWkMatches = allMatches.filter((m) => (m.date || "") < wkFrom);
  const preWkRanked = computeStats(preWkMatches, computeElo(preWkMatches));
  const rAll = allRanked.findIndex((p) => p.name === name) + 1 || null;
  const rPre = preWkRanked.findIndex((p) => p.name === name) + 1 || null;
  const raceDelta = rPre && rAll ? rPre - rAll : null;
  const raceDeltaStr =
    raceDelta === null
      ? "—"
      : raceDelta > 0
        ? `▲${raceDelta}`
        : raceDelta < 0
          ? `▼${Math.abs(raceDelta)}`
          : "—";
  const raceDeltaColor =
    raceDelta > 0
      ? "var(--green)"
      : raceDelta < 0
        ? "var(--red)"
        : "var(--muted)";
  const wkLabel = `${fmtDate(wkFrom).replace(/\s\d{4}$/, "")} – ${fmtDate(wkTo).replace(/\s\d{4}$/, "")}`;
  const raceHtml = `
    <div class="ana-card">
      <span class="badge">Leaderboard Race</span>
      <div class="det-streak-row">
        <div class="det-streak-cell">
          <div class="det-streak-val">${rAll ? `#${rAll}` : "—"}</div>
          <div class="sub">Current Rank</div>
        </div>
        <div class="det-streak-div"></div>
        <div class="det-streak-cell">
          <div class="det-streak-val">${rPre ? `#${rPre}` : "—"}</div>
          <div class="sub">Last Wk. Rank</div>
        </div>
        <div class="det-streak-div"></div>
        <div class="det-streak-cell">
          <div class="det-streak-val" style="color:${raceDeltaColor}">${raceDeltaStr}</div>
          <div class="sub">Movement</div>
        </div>
      </div>
    </div>`;

  // ── ELO TIMELINE CHART ─────────────────────────────────
  const eloTimelineHtml = (() => {
    const sorted = [...allMatches].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    const playerMs = sorted.filter((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].includes(name),
    );
    if (playerMs.length < 3) return "";
    const elo = {};
    const pts = [];
    sorted.forEach((m) => {
      const allP = [...(m.teamA || []), ...(m.teamB || [])];
      allP.forEach((p) => {
        if (!(p in elo)) elo[p] = 1000;
      });
      const aWon = m.scoreA > m.scoreB;
      const avgA =
        m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        elo[p] = (elo[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        elo[p] = (elo[p] || 1000) + dB;
      });
      if ([...(m.teamA || []), ...(m.teamB || [])].includes(name)) {
        const inA = (m.teamA || []).includes(name);
        pts.push({ elo: elo[name], date: m.date, won: inA ? aWon : !aWon });
      }
    });
    if (pts.length < 3) return "";
    const W = 300,
      H = 90,
      pl = 36,
      pr = 8,
      pt = 8,
      pb = 18,
      cW = W - pl - pr,
      cH = H - pt - pb;
    const minE = Math.min(...pts.map((p) => p.elo)) - 20;
    const maxE = Math.max(...pts.map((p) => p.elo)) + 20;
    const eRange = Math.max(1, maxE - minE);
    const toX = (i) => pl + (i / (pts.length - 1 || 1)) * cW;
    const toY = (e) => pt + (1 - (e - minE) / eRange) * cH;
    const yLines = [
      minE + eRange * 0.25,
      minE + eRange * 0.5,
      minE + eRange * 0.75,
    ]
      .map((ev) => {
        const y = toY(ev);
        return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/><text x="${pl - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.3)">${Math.round(ev)}</text>`;
      })
      .join("");
    const polyline = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`)
      .join(" ");
    const area =
      `M${toX(0).toFixed(1)},${(H - pb).toFixed(1)} ` +
      pts
        .map((p, i) => `L${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`)
        .join(" ") +
      ` L${toX(pts.length - 1).toFixed(1)},${(H - pb).toFixed(1)} Z`;
    const col = playerColor(name);
    const circles = pts
      .map(
        (p, i) =>
          `<circle cx="${toX(i).toFixed(1)}" cy="${toY(p.elo).toFixed(1)}" r="2.5" fill="${p.won ? "var(--green)" : "var(--red)"}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5"><title>${p.date}: ELO ${p.elo} (${p.won ? "W" : "L"})</title></circle>`,
      )
      .join("");
    const lastElo = pts[pts.length - 1].elo;
    const firstElo = pts[0].elo;
    const netChange = lastElo - firstElo;
    const netStr = netChange > 0 ? `+${netChange}` : `${netChange}`;
    const netCol =
      netChange > 0
        ? "var(--green)"
        : netChange < 0
          ? "var(--red)"
          : "var(--muted)";
    const peakElo = Math.max(...pts.map((p) => p.elo));
    const peakPt = pts.find((p) => p.elo === peakElo);
    const fromPeak = lastElo - peakElo;
    const fromPeakLabel = fromPeak === 0
      ? `<span style="color:var(--green);font-weight:700">▲ Currently at peak</span>`
      : `<span style="color:var(--red);font-weight:700">${fromPeak} from peak</span>`;
    return `<div class="ana-card"><span class="badge">ELO Timeline</span>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 4px">
        <div style="font-size:9px;color:var(--muted)">● W &nbsp; ● L &nbsp; · ${pts.length} matches</div>
        <div style="font-size:12px;font-weight:800;color:${netCol}">${netStr} ELO total</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:9px;color:var(--muted)">All-time high: <span style="color:var(--green);font-weight:800;font-size:11px">${peakElo}</span><span style="color:var(--muted);margin-left:4px">(${fmtDate(peakPt?.date)})</span></div>
        <div style="font-size:9px">${fromPeakLabel}</div>
      </div>
      <div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible">
        ${yLines}
        <defs><linearGradient id="etg_${name.replace(/\s/g, "")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}" stop-opacity="0.25"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
        <path d="${area}" fill="url(#etg_${name.replace(/\s/g, "")})" />
        <polyline points="${polyline}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${circles}
        <text x="${toX(pts.length - 1).toFixed(1)}" y="${(toY(lastElo) - 5).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="800" fill="${col}">${lastElo}</text>
      </svg></div>
    </div>`;
  })();

  const recentCards = detail.recent
    .slice()
    .reverse()
    .map((m) => {
      const scoreColor = m.won ? "var(--green)" : "var(--red)";
      return `<div class="ana-card det-match-card">
              <div class="det-match-result" style="color:${scoreColor}">${m.won ? "W" : "L"}</div>
              <div class="det-match-body">
                <div class="det-match-score">${m.score}</div>
                <div class="sub">${fmtDate(m.date)} · vs ${m.opponents.toUpperCase()}</div>
              </div>
            </div>`;
    })
    .join("");

  const html = `
          <div id="player-detail-modal">
            <div class="analytics-inner">
              <div class="analytics-header">
                <div class="analytics-title" style="display:flex;align-items:center;gap:10px">${playerAvatar(name, 64)}${name}</div>
                <div style="display:flex;align-items:center;gap:8px">
                  <button class="share-card-btn" onclick="openShareCard('${name.replace(/'/g, "\\'")}')">⬆ Share</button>
                  <button class="analytics-close" onclick="document.getElementById('player-detail-modal').remove()">✕</button>
                </div>
              </div>
              <div class="analytics-cards">

                <div class="ana-card ov-card">
                  <div class="ov-header">
                    <div class="ov-sr-block">
                      <div class="ov-sr-val">${s.sr.toFixed(2)}</div>
                      <div class="ov-sr-lbl">Skill Rating</div>
                      <div class="ov-sr-elo" style="font-size:11px;color:var(--muted);margin-top:2px">ELO <span style="color:${eloChangeCol};font-weight:700">${playerElo}</span></div>
                    </div>
                    <div class="ov-record-block">
                      <div class="ov-record">${s.mw}<span class="ov-record-sep">W</span>${s.ml}<span class="ov-record-sep">L</span></div>
                      <div class="ov-win-pct">${s.winPct.toFixed(0)}% win rate · ${s.mp} played</div>
                    </div>
                  </div>
                  <div class="ov-grid">
                    <div class="ov-cell">
                      <div class="ov-val p">${s.gw}</div>
                      <div class="ov-lbl">Games Won</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val n">${s.gl}</div>
                      <div class="ov-lbl">Games Lost</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val ${s.diff >= 0 ? "p" : "n"}">${s.diff >= 0 ? "+" : ""}${s.diff}</div>
                      <div class="ov-lbl">Game Diff</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val">${s.gamePct.toFixed(0)}%</div>
                      <div class="ov-lbl">Game %</div>
                    </div>
                  </div>
                </div>

                <div class="ana-card">
                  <span class="badge">Streak & Form</span>
                  <div class="det-streak-row">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:${streakColor}">${streakStr}</div>
                      <div class="sub">Current</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:var(--green)">${s.bestWinStreak}W</div>
                      <div class="sub">Win</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:var(--red)">${detail.maxLossStreak}L</div>
                      <div class="sub">Loss</div>
                    </div>
                  </div>
                  <div class="det-form-row">
                    <span class="sub" style="flex-shrink:0">Last ${s.form.length}</span>
                    <div class="det-form-dots">${formDotsHtml}</div>
                  </div>
                </div>

                ${formGraphHtml}

                <div class="ana-card">
                  <span class="badge">Score Dominance</span>
                  <div class="det-streak-row">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:${marginColor}">${marginVal}</div>
                      <div class="sub">Avg Margin</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:${s.consistency !== null ? (s.consistency <= 2 ? "var(--green)" : s.consistency <= 4 ? "var(--gold)" : "var(--red)") : "var(--muted)"}">${s.consistency !== null ? s.consistency : "—"}</div>
                      <div class="sub">Consistency</div>
                    </div>
                  </div>
                  <div class="det-streak-row" style="margin-top:12px">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:var(--green)">${detail.shutoutWins}</div>
                      <div class="sub">Shutout Wins</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:var(--red)">${detail.shutoutLosses}</div>
                      <div class="sub">Shutout Loss</div>
                    </div>
                  </div>
                </div>

                ${raceHtml}

                ${eloTimelineHtml}

                ${connectionsHtml}

                ${clutchHtml}

                ${badgesHtml}

              </div>
              <div style="margin-top:20px;font-size:13px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Recent Matches</div>
              <div class="analytics-cards">${recentCards || '<div class="ana-card"><div class="sub">No matches yet.</div></div>'}</div>
            </div>
          </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

function openH2HDetail(a, b) {
  const existing = document.getElementById("h2h-detail-modal");
  if (existing) existing.remove();
  const h2h = getHeadToHeadStats(a, b, allMatches);
  const total = h2h.aWins + h2h.bWins || 1;
  const aWinPct = Math.round((h2h.aWins / total) * 100);
  const bWinPct = 100 - aWinPct;

  // Game-level stats
  let aGW = 0, bGW = 0, aShut = 0, bShut = 0;
  let aStreak = 0, bStreak = 0, aCurStreak = 0, bCurStreak = 0, aCurType = null, bCurType = null;
  const sorted = [...h2h.matches].sort((x, y) => (x.date || "").localeCompare(y.date || ""));
  sorted.forEach((m) => {
    const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
    const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    const aS = aInA ? m.scoreA : m.scoreB;
    const bS = aInA ? m.scoreB : m.scoreA;
    aGW += aS; bGW += bS;
    if (bS === 0) aShut++;
    if (aS === 0) bShut++;
    if (aWon) {
      aCurType === "w" ? aCurStreak++ : ((aCurType = "w"), (aCurStreak = 1));
      bCurStreak = 0; bCurType = null;
    } else {
      bCurType === "w" ? bCurStreak++ : ((bCurType = "w"), (bCurStreak = 1));
      aCurStreak = 0; aCurType = null;
    }
    aStreak = Math.max(aStreak, aCurStreak);
    bStreak = Math.max(bStreak, bCurStreak);
  });
  const aGPct = Math.round((aGW / (aGW + bGW || 1)) * 100);

  // ELO walk for per-match deltas
  const h2hDeltaMap = new Map();
  const _e = {};
  [...allMatches]
    .sort((x, y) => (x.date || "").localeCompare(y.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => { if (!(p in _e)) _e[p] = 1000; });
      const mAWon = m.scoreA > m.scoreB;
      const avgA = m.teamA.reduce((s, p) => s + _e[p], 0) / Math.max(m.teamA.length, 1);
      const avgB = m.teamB.reduce((s, p) => s + _e[p], 0) / Math.max(m.teamB.length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((mAWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((mAWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => { _e[p] = (_e[p] || 1000) + dA; });
      m.teamB.forEach((p) => { _e[p] = (_e[p] || 1000) + dB; });
      const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
      const aInB = (m.teamB || []).some((p) => normPlayer(p) === a);
      const bInA = (m.teamA || []).some((p) => normPlayer(p) === b);
      const bInB = (m.teamB || []).some((p) => normPlayer(p) === b);
      if ((aInA && bInB) || (aInB && bInA))
        h2hDeltaMap.set(m, { ad: aInA ? dA : dB, bd: bInA ? dA : dB });
    });
  let aEloTotal = 0, bEloTotal = 0;
  h2hDeltaMap.forEach((v) => { aEloTotal += v.ad; bEloTotal += v.bd; });

  const fmtD = (n) => n > 0 ? `+${n}` : String(n);
  const dCol = (n) => n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--muted)";
  const eloBg = (n) => n > 0 ? "rgba(74,222,128,0.15)" : n < 0 ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.06)";
  const borderCol = (n) => n > 0 ? "#4ade80" : n < 0 ? "#f87171" : "rgba(255,255,255,0.1)";

  const col1 = playerColor(a);
  const col2 = playerColor(b);
  const leader = h2h.aWins > h2h.bWins ? a : h2h.bWins > h2h.aWins ? b : null;
  const leaderCol = leader === a ? col1 : col2;
  const aN = a.split(" ")[0];
  const bN = b.split(" ")[0];

  const recentCards = [...h2h.matches]
    .sort((x, y) => (y.date || "").localeCompare(x.date || ""))
    .slice(0, 8)
    .map((m) => {
      const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
      const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const sa = aInA ? m.scoreA : m.scoreB;
      const sb = aInA ? m.scoreB : m.scoreA;
      const deltas = h2hDeltaMap.get(m);
      const ad = deltas?.ad ?? 0;
      const bd = deltas?.bd ?? 0;
      const winnerCol = aWon ? col1 : col2;
      return `
        <div class="h2h-match-card">
          <div class="h2h-match-accent" style="background:${winnerCol}"></div>
          <div class="h2h-match-body">
            <div class="h2h-match-row1">
              <span class="h2h-match-winner-name" style="color:${winnerCol}">${aWon ? aN : bN} won</span>
              <span class="h2h-match-score">${sa}–${sb}</span>
              <span class="h2h-match-date">${fmtDate(m.date)}</span>
            </div>
            <div class="h2h-match-row2">
              <span class="h2h-elo-pill" style="background:${eloBg(ad)};color:${dCol(ad)}">${aN} ${fmtD(ad)}</span>
              <span class="h2h-elo-pill" style="background:${eloBg(bd)};color:${dCol(bd)}">${bN} ${fmtD(bd)}</span>
            </div>
          </div>
        </div>`;
    })
    .join("");

  const html = `
    <div id="h2h-detail-modal" class="h2h-modal-overlay" onclick="if(event.target===this)this.remove()">
      <div class="h2h-modal-card">
        <div class="h2h-modal-header">
          <span class="h2h-modal-title">⚔️ H2H DEEP DIVE</span>
          <button class="h2h-modal-close" onclick="document.getElementById('h2h-detail-modal').remove()">✕</button>
        </div>
        <div class="h2h-modern">
          <div class="h2h-hero">
            <div class="h2h-hero-side" style="background:linear-gradient(135deg,${col1}18 0%,transparent 70%)">
              ${playerAvatar(a, 34)}
              <div class="h2h-hero-name">${a}</div>
              <div class="h2h-hero-wins" style="color:${col1}">${h2h.aWins}</div>
              <div class="h2h-hero-sub">${aWinPct}% win rate</div>
            </div>
            <div class="h2h-hero-center">
              <div class="h2h-vs-badge">VS</div>
              <div class="h2h-total-badge">${total}<br><span style="font-size:8px;font-weight:600;opacity:0.6">played</span></div>
            </div>
            <div class="h2h-hero-side h2h-hero-right" style="background:linear-gradient(225deg,${col2}18 0%,transparent 70%)">
              ${playerAvatar(b, 34)}
              <div class="h2h-hero-name">${b}</div>
              <div class="h2h-hero-wins" style="color:${col2}">${h2h.bWins}</div>
              <div class="h2h-hero-sub">${bWinPct}% win rate</div>
            </div>
          </div>

          <div class="h2h-split-wrap">
            <span class="h2h-split-pct" style="color:${col1}">${aWinPct}%</span>
            <div class="h2h-split-bar">
              <div class="h2h-split-seg" style="width:${aWinPct}%;background:${col1}"></div>
              <div class="h2h-split-seg" style="width:${bWinPct}%;background:${col2}"></div>
            </div>
            <span class="h2h-split-pct" style="color:${col2}">${bWinPct}%</span>
          </div>

          <div class="h2h-leader-badge">
            ${leader
              ? `<span style="color:${leaderCol};font-weight:800">${leader}</span>&nbsp;leads this rivalry`
              : "⚖️ Perfectly balanced"}
          </div>

          <div class="h2h-stats-grid">
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val ${h2h.diff >= 0 ? "" : "neg"}">${h2h.diff >= 0 ? "+" : ""}${h2h.diff}</div>
              <div class="h2h-stat-lbl">GAME DIFF</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val">${aGPct}%</div>
              <div class="h2h-stat-lbl">GAME%</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val" style="color:${col1}">${aGW}</div>
              <div class="h2h-stat-lbl">${aN} GW</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val" style="color:${col2}">${bGW}</div>
              <div class="h2h-stat-lbl">${bN} GW</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val" style="color:var(--green)">${aShut}</div>
              <div class="h2h-stat-lbl">${aN} SHUTOUT</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val" style="color:var(--green)">${bShut}</div>
              <div class="h2h-stat-lbl">${bN} SHUTOUT</div>
            </div>
          </div>

          <div class="h2h-elo-row">
            <div class="h2h-elo-card" style="border-top-color:${borderCol(aEloTotal)}">
              <div class="h2h-elo-label">ELO IMPACT</div>
              <div class="h2h-elo-player" style="color:${col1}">${a}</div>
              <div class="h2h-elo-delta" style="color:${dCol(aEloTotal)}">${fmtD(aEloTotal)}</div>
              <div class="h2h-elo-sub">from ${total} meetings</div>
            </div>
            <div class="h2h-elo-card" style="border-top-color:${borderCol(bEloTotal)}">
              <div class="h2h-elo-label">ELO IMPACT</div>
              <div class="h2h-elo-player" style="color:${col2}">${b}</div>
              <div class="h2h-elo-delta" style="color:${dCol(bEloTotal)}">${fmtD(bEloTotal)}</div>
              <div class="h2h-elo-sub">from ${total} meetings</div>
            </div>
          </div>

          <div class="h2h-elo-row" style="margin-bottom:14px">
            <div class="h2h-elo-card" style="border-top-color:var(--accent)">
              <div class="h2h-elo-label">BEST WIN STREAK</div>
              <div class="h2h-elo-player" style="color:${col1}">${a}</div>
              <div class="h2h-elo-delta" style="color:var(--accent)">${aStreak}</div>
            </div>
            <div class="h2h-elo-card" style="border-top-color:var(--accent)">
              <div class="h2h-elo-label">BEST WIN STREAK</div>
              <div class="h2h-elo-player" style="color:${col2}">${b}</div>
              <div class="h2h-elo-delta" style="color:var(--accent)">${bStreak}</div>
            </div>
          </div>

          <div class="h2h-matches-title">RECENT MATCHES</div>
          <div class="h2h-match-list">
            ${recentCards || '<div style="color:var(--muted);padding:8px;font-size:11px">No matches yet.</div>'}
          </div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

function openSummaryScreenshot() {
  const leaderTableEl = document.querySelector(".cmp-body-scroll .cmp");
  if (!leaderTableEl) { showToast("No data to capture", "❌"); return; }

  // Flush any in-progress staggered animation: instantly write all rows to the DOM
  if (_cmpLeaderHtmls.length) {
    const tbody = document.getElementById("cmpBody");
    if (tbody) tbody.innerHTML = _cmpLeaderHtmls.join("");
  }
  if (_cmpFiltered.length !== undefined) {
    const cmpMatchesEl = document.getElementById("cmpMatches");
    if (cmpMatchesEl) {
      cmpMatchesEl.innerHTML =
        buildCompactMatchRows(_cmpFiltered) +
        buildHistorySummary(_cmpFiltered, cmpFilter);
    }
  }

  const fname = {
    all: "All Time", today: "Today", week: "This Week",
    lastweek: "Last Week", weekend: "Weekend", month: "This Month", range: "Custom Range",
  };
  const filterLabel = (fname[cmpFilter] || "Summary").toUpperCase();

  // Clone leaderboard — strip interactivity & sort arrows
  const leaderClone = leaderTableEl.cloneNode(true);
  leaderClone.querySelectorAll("[onclick]").forEach(el => el.removeAttribute("onclick"));
  leaderClone.querySelectorAll(".sort-arrow").forEach(el => el.remove());

  // Clone matches
  const matchTableEl = document.querySelector("#cmpMatches .cmp-match-rows");
  let matchHtml = "";
  if (matchTableEl) {
    const matchClone = matchTableEl.cloneNode(true);
    matchClone.querySelectorAll("[onclick]").forEach(el => el.removeAttribute("onclick"));
    matchHtml = `
      <div class="snap-section-hdr">MATCHES PLAYED</div>
      <div class="snap-full-row">${matchClone.outerHTML}</div>`;
  }

  // Populate snapshot page
  document.getElementById("snap-content").innerHTML = `
    <div class="snap-section-hdr snap-section-hdr-row">
      <span>PLAYER LEADERBOARD</span>
      <span class="ss-card-badge">${filterLabel}</span>
    </div>
    <div class="snap-full-row">${leaderClone.outerHTML}</div>
    ${matchHtml}`;

  // Navigate to snapshot page
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("pg-snapshot").classList.add("active");
  document.getElementById("pg-snapshot").scrollTop = 0;
  document.getElementById("fab").style.display = "none";
}

function closeSnapshot() {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("pg-compact").classList.add("active");
  renderCompact();
}

function openShareCard(name) {
  document.getElementById("share-card-overlay")?.remove();
  const detail = getPlayerDetail(name);
  if (!detail.stats) return;
  const s = detail.stats;
  const eloMap = computeElo(allMatches);
  const elo = Math.round(eloMap[name] || 1000);
  const col = playerColor(name);

  const streakIcon = s.curStreak > 0 ? (s.curType === "W" ? "🔥" : "❄️") : "";
  const streakStr =
    s.curStreak > 0 ? `${streakIcon} ${s.curStreak}${s.curType}` : "—";
  const marginStr =
    s.avgMargin >= 0 ? `+${s.avgMargin.toFixed(1)}` : s.avgMargin.toFixed(1);
  const marginColor =
    s.avgMargin > 0 ? "#36d47e" : s.avgMargin < 0 ? "#f04f4f" : "#60607a";

  const formDots = s.form
    .slice(-10)
    .map(
      (r) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:10px;font-weight:900;background:${r === "W" ? "rgba(54,212,126,0.15)" : "rgba(240,79,79,0.15)"};border:1px solid ${r === "W" ? "rgba(54,212,126,0.35)" : "rgba(240,79,79,0.35)"};color:${r === "W" ? "#36d47e" : "#f04f4f"}">${r}</span>`,
    )
    .join("");

  const allRanked = computeStats(allMatches, eloMap);
  const rank = allRanked.findIndex((p) => p.name === name) + 1;

  const bigStat = (val, lbl, color = "#eeeae4") =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;padding:14px 6px">
      <div style="font-size:26px;font-weight:900;color:${color};letter-spacing:-0.02em;line-height:1">${val}</div>
      <div style="font-size:9px;font-weight:700;color:#4a4a6a;text-transform:uppercase;letter-spacing:0.1em">${lbl}</div>
    </div>`;
  const miniStat = (val, lbl, color = "#ccc8e8") =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;padding:10px 4px">
      <div style="font-size:16px;font-weight:800;color:${color};line-height:1">${val}</div>
      <div style="font-size:8px;font-weight:700;color:#4a4a6a;text-transform:uppercase;letter-spacing:0.08em;text-align:center">${lbl}</div>
    </div>`;
  const vDiv = (h = 32) =>
    `<div style="width:1px;height:${h}px;background:rgba(255,255,255,0.07);align-self:center"></div>`;

  const card = `
    <div style="background:linear-gradient(160deg,#0d0d1a 0%,#11111f 60%,#0a0a15 100%);border-radius:24px;border:1px solid rgba(255,255,255,0.08);padding:0;width:100%;max-width:340px;box-shadow:0 8px 60px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.04);position:relative;overflow:hidden">

      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 10%,${col}22 0%,transparent 55%);pointer-events:none"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${col},transparent)"></div>

      <div style="padding:24px 22px 18px;display:flex;align-items:center;gap:16px">
        <div style="position:relative;flex-shrink:0">
          <div style="width:68px;height:68px;border-radius:50%;background:${col}22;border:2px solid ${col}55;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:${col};letter-spacing:-0.02em">${playerInitials(name)}</div>
          <div style="position:absolute;inset:-3px;border-radius:50%;border:1.5px solid ${col}33;pointer-events:none"></div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:22px;font-weight:900;color:#f0ecff;letter-spacing:-0.01em;line-height:1.1">${name}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
            <span style="background:${col}22;color:${col};font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;border:1px solid ${col}44;letter-spacing:0.04em">#${rank} RANK</span>
            <span style="color:#4a4a6a;font-size:10px;font-weight:600">${elo} ELO</span>
          </div>
        </div>
      </div>

      <div style="margin:0 16px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;display:flex;align-items:stretch">
        ${bigStat(`${s.mw}W–${s.ml}L`, "Record")}
        ${vDiv(40)}
        ${bigStat(`${s.winPct.toFixed(0)}%`, "Win Rate", s.winPct >= 50 ? "#36d47e" : "#f04f4f")}
        ${vDiv(40)}
        ${bigStat(s.sr.toFixed(2), "Skill Rating", col)}
      </div>

      <div style="margin:0 16px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;display:flex;align-items:stretch">
        ${miniStat(s.mp, "Matches")}
        ${vDiv(24)}
        ${miniStat(detail.maxWinStreak || 0, "Best Streak")}
        ${vDiv(24)}
        ${miniStat(streakStr, "Current")}
        ${vDiv(24)}
        ${miniStat(marginStr, "Avg Margin", marginColor)}
        ${vDiv(24)}
        ${miniStat(`${s.consistency?.toFixed(0) ?? "—"}%`, "Consist.")}
      </div>

      ${
        s.form.length
          ? `
      <div style="margin:0 16px 18px">
        <div style="font-size:8px;font-weight:800;color:#4a4a6a;letter-spacing:0.12em;margin-bottom:8px;text-transform:uppercase">Recent Form</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">${formDots}</div>
      </div>`
          : ""
      }

      <div style="margin:0 16px 20px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)"></div>
      <div style="padding:0 22px 20px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:18px;height:18px;border-radius:5px;background:${col};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#000">P</div>
          <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:${col}">PADEL EKTA</div>
        </div>
        <div style="font-size:9px;color:#3a3a5a;font-weight:600;letter-spacing:0.04em">${todayISO()}</div>
      </div>
    </div>`;

  const overlay = document.createElement("div");
  overlay.id = "share-card-overlay";
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-overlay-bg" onclick="document.getElementById('share-card-overlay').remove()"></div>
    <div class="share-overlay-inner">
      <div class="share-overlay-hint">📸 Screenshot to share</div>
      ${card}
      <button class="share-close-btn" onclick="document.getElementById('share-card-overlay').remove()">Close</button>
    </div>`;
  document.body.appendChild(overlay);
}

function openWeeklyDigest() {
  document.getElementById("share-card-overlay")?.remove();
  const { from: wkFrom, to: wkTo } = lastWeekRange();
  const wkMatches = allMatches.filter(
    (m) => (m.date || "") >= wkFrom && (m.date || "") <= wkTo,
  );
  const thisWkMatches = allMatches.filter(
    (m) => (m.date || "") >= weekISO() && (m.date || "") <= todayISO(),
  );
  const useMatches = thisWkMatches.length >= 3 ? thisWkMatches : wkMatches;
  const label = thisWkMatches.length >= 3 ? "This Week" : "Last Week";
  if (useMatches.length < 2) {
    showToast("Not enough matches this week yet", "📋");
    return;
  }

  const eloNow = computeElo(allMatches);
  const eloPre = computeElo(
    allMatches.filter(
      (m) => (m.date || "") < (thisWkMatches.length >= 3 ? weekISO() : wkFrom),
    ),
  );
  const stats = computeStats(useMatches, computeElo(useMatches));

  // Most wins
  const topWinner = [...stats].sort((a, b) => b.mw - a.mw)[0];
  // Biggest ELO mover
  const mover = Object.keys(eloNow)
    .map((p) => ({ name: p, gain: (eloNow[p] || 1000) - (eloPre[p] || 1000) }))
    .filter((p) =>
      useMatches.some((m) =>
        [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
      ),
    )
    .sort((a, b) => b.gain - a.gain)[0];
  // Biggest upset
  const runElo2 = {};
  let biggestUpset = null;
  [...allMatches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in runElo2)) runElo2[p] = 1000;
      });
      const avgA =
        m.teamA.reduce((s, p) => s + runElo2[p], 0) /
        Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + runElo2[p], 0) /
        Math.max(m.teamB.length, 1);
      const aWon = m.scoreA > m.scoreB;
      const gap = aWon ? avgB - avgA : avgA - avgB;
      if (
        useMatches.includes(m) &&
        gap > 30 &&
        (!biggestUpset || gap > biggestUpset.gap)
      ) {
        biggestUpset = {
          m,
          gap: Math.round(gap),
          winner: aWon ? m.teamA : m.teamB,
          loser: aWon ? m.teamB : m.teamA,
        };
      }
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        runElo2[p] = (runElo2[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        runElo2[p] = (runElo2[p] || 1000) + dB;
      });
    });
  // Best pair
  const wkPairs = getPairStats(useMatches).filter((p) => p.played >= 2)[0];
  // Hot streak player
  const hotPlayer = stats
    .filter((p) => p.curType === "W" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)[0];

  const accentCol = "#18d7ff";
  const statRow = (icon, label2, val, sub) =>
    `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;font-weight:700;color:#4a4a6a;letter-spacing:0.06em;text-transform:uppercase">${label2}</div>
        <div style="font-size:13px;font-weight:900;color:#eeeae4;margin-top:1px">${val}</div>
      </div>
      <div style="font-size:10px;color:#4a4a6a;text-align:right;flex-shrink:0">${sub}</div>
    </div>`;

  const card = `
    <div style="background:linear-gradient(160deg,#0d0d1a,#11111f,#0a0a15);border-radius:24px;border:1px solid rgba(255,255,255,0.08);width:100%;max-width:340px;box-shadow:0 8px 60px rgba(0,0,0,0.7);position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 0%,${accentCol}18 0%,transparent 55%);pointer-events:none"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${accentCol},transparent)"></div>
      <div style="padding:20px 22px 16px">
        <div style="font-size:10px;font-weight:800;color:${accentCol};letter-spacing:0.14em;margin-bottom:4px">WEEKLY DIGEST</div>
        <div style="font-size:20px;font-weight:900;color:#f0ecff;line-height:1.1">${label}</div>
        <div style="font-size:11px;color:#4a4a6a;margin-top:4px">${useMatches.length} matches · ${[...new Set(useMatches.flatMap((m) => [...m.teamA, ...m.teamB]))].length} players</div>
      </div>
      <div style="margin:0 16px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:4px 12px">
        ${topWinner ? statRow("🏆", "Top Winner", topWinner.name, `${topWinner.mw}W–${topWinner.ml}L`) : ""}
        ${mover && mover.gain > 0 ? statRow("📈", "Biggest Mover", mover.name, `+${mover.gain} ELO`) : ""}
        ${hotPlayer ? statRow("🔥", "On Fire", hotPlayer.name, `${hotPlayer.curStreak}-match win streak`) : ""}
        ${wkPairs ? statRow("🤝", "Best Duo", wkPairs.key, `${wkPairs.winPct}% · ${wkPairs.played}g`) : ""}
        ${biggestUpset ? statRow("⚡", "Biggest Upset", biggestUpset.winner.map((p) => p.split(" ")[0]).join(" & ") + " won", `+${biggestUpset.gap} ELO gap`) : ""}
      </div>
      <div style="margin:0 16px 20px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)"></div>
      <div style="padding:0 22px 20px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:18px;height:18px;border-radius:5px;background:${accentCol};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#000">P</div>
          <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:${accentCol}">PADEL EKTA</div>
        </div>
        <div style="font-size:9px;color:#3a3a5a;font-weight:600">${todayISO()}</div>
      </div>
    </div>`;

  const overlay = document.createElement("div");
  overlay.id = "share-card-overlay";
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-overlay-bg" onclick="document.getElementById('share-card-overlay').remove()"></div>
    <div class="share-overlay-inner">
      <div class="share-overlay-hint">📸 Screenshot to share</div>
      ${card}
      <button class="share-close-btn" onclick="document.getElementById('share-card-overlay').remove()">Close</button>
    </div>`;
  document.body.appendChild(overlay);
}

function openPairDetail(key) {
  document.getElementById("pair-detail-modal")?.remove();
  const players = key.split(" & ");
  const matches = allMatches.filter(
    (m) =>
      m.teamA.length === 2 &&
      m.teamB.length === 2 &&
      ([...m.teamA].sort().join(" & ") === key ||
        [...m.teamB].sort().join(" & ") === key),
  );
  if (!matches.length) return;

  // ── Core counts ──────────────────────────────────────────
  let wins = 0,
    gw = 0,
    gl = 0,
    totalDiff = 0;
  let curStreak = 0,
    curType = "",
    bestWin = 0,
    bestLoss = 0;
  let winStreak = 0,
    lossStreak = 0,
    maxWinStreak = 0,
    maxLossStreak = 0;
  let fireCount = 0,
    dominatingWins = 0,
    shutoutWins = 0,
    shutoutLosses = 0;
  const form = [],
    oppRecord = {};

  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach((m) => {
    const isPair = [...m.teamA].sort().join(" & ") === key;
    const pScore = isPair ? m.scoreA : m.scoreB;
    const oScore = isPair ? m.scoreB : m.scoreA;
    const won = pScore > oScore;
    const margin = pScore - oScore;
    const opp = [...(isPair ? m.teamB : m.teamA)].sort().join(" & ");

    gw += pScore;
    gl += oScore;
    totalDiff += margin;
    if (won) {
      wins++;
      if (margin > bestWin) bestWin = margin;
    } else {
      if (-margin > bestLoss) bestLoss = -margin;
    }

    form.push(won ? "W" : "L");
    if (!oppRecord[opp]) oppRecord[opp] = { w: 0, l: 0 };
    if (won) oppRecord[opp].w++;
    else oppRecord[opp].l++;

    if (won) {
      winStreak++;
      lossStreak = 0;
      if (winStreak > maxWinStreak) maxWinStreak = winStreak;
    } else {
      lossStreak++;
      winStreak = 0;
      if (lossStreak > maxLossStreak) maxLossStreak = lossStreak;
    }

    if (isFireMatch(m)) fireCount++;
    if (isDominatingMatch(m) && won) dominatingWins++;
    if (pScore === 0) shutoutLosses++;
    if (oScore === 0) shutoutWins++;
  });

  // Current streak
  for (let i = form.length - 1; i >= 0; i--) {
    if (i === form.length - 1) {
      curType = form[i];
      curStreak = 1;
    } else if (form[i] === curType) curStreak++;
    else break;
  }

  const played = matches.length,
    losses = played - wins;
  const winPct = Math.round((wins / played) * 100);
  const gamePct = Math.round((gw / (gw + gl)) * 100);
  const avgDiff = (totalDiff / played).toFixed(1);
  const avgDiffStr = totalDiff >= 0 ? `+${avgDiff}` : avgDiff;
  const firstMatch = sorted[0].date,
    lastMatch = sorted[sorted.length - 1].date;

  // ── Form dots ─────────────────────────────────────────────
  const formHtml = form
    .slice(-10)
    .map(
      (r) =>
        `<span class="fd fd-lg ${r === "W" ? "fd-w" : "fd-l"}">${r}</span>`,
    )
    .join("");

  // ── Opponents ─────────────────────────────────────────────
  const oppHtml = Object.entries(oppRecord)
    .sort((a, b) => b[1].w + b[1].l - (a[1].w + a[1].l))
    .map(([opp, rec]) => {
      const tot = rec.w + rec.l;
      const pct = Math.round((rec.w / tot) * 100);
      const col =
        pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--text)";
      return `<div class="chem-row"><div class="chem-names" style="font-size:10px">${opp}</div><div class="chem-wl">${rec.w}–${rec.l}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pct}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pct}%</div></div>`;
    })
    .join("");

  // ── Recent matches ────────────────────────────────────────
  const recentHtml = [...sorted]
    .reverse()
    .slice(0, 6)
    .map((m) => {
      const isPair = [...m.teamA].sort().join(" & ") === key;
      const pScore = isPair ? m.scoreA : m.scoreB;
      const oScore = isPair ? m.scoreB : m.scoreA;
      const won = pScore > oScore;
      const opp = [...(isPair ? m.teamB : m.teamA)].sort().join(" & ");
      return `<div class="chem-row"><div style="font-size:9px;color:var(--muted);flex-shrink:0;width:56px">${fmtDate(
        m.date,
      )
        .replace(/\s+\d{4}$/, "")
        .toUpperCase()}</div><div class="chem-names" style="font-size:10px">vs ${opp}</div><div style="font-size:11px;font-weight:800;color:${won ? "var(--green)" : "var(--red)"};flex-shrink:0">${pScore}–${oScore}</div></div>`;
    })
    .join("");

  const streakCol = curType === "W" ? "var(--green)" : "var(--red)";
  const streakIcon = curType === "W" ? "🔥" : "❄️";

  const html = `
          <div id="pair-detail-modal">
            <div class="analytics-inner">
              <div class="analytics-header">
                <div class="analytics-title" style="font-size:15px">🤝 ${key}</div>
                <button class="analytics-close" onclick="document.getElementById('pair-detail-modal').remove()">✕</button>
              </div>
              <div class="analytics-cards">

                <!-- Overview -->
                <div class="ana-card ov-card">
                  <div class="ov-header">
                    <div class="ov-sr-block">
                      <div class="ov-sr-val" style="color:${winPct >= 60 ? "var(--green)" : winPct <= 40 ? "var(--red)" : "var(--text)"}">${winPct}%</div>
                      <div class="ov-sr-lbl">Win Rate</div>
                    </div>
                    <div class="ov-record-block">
                      <div class="ov-record">${wins}<span class="ov-record-sep">W</span>${losses}<span class="ov-record-sep">L</span></div>
                      <div class="ov-win-pct">${played} matches together</div>
                    </div>
                  </div>
                  <div class="ov-grid" style="margin-top:10px">
                    <div class="ov-cell"><div class="ov-val p">${gw}</div><div class="ov-lbl">Games Won</div></div>
                    <div class="ov-cell"><div class="ov-val n">${gl}</div><div class="ov-lbl">Games Lost</div></div>
                    <div class="ov-cell"><div class="ov-val ${totalDiff >= 0 ? "p" : "n"}">${totalDiff >= 0 ? "+" : ""}${totalDiff}</div><div class="ov-lbl">Game Diff</div></div>
                    <div class="ov-cell"><div class="ov-val">${gamePct}%</div><div class="ov-lbl">Game %</div></div>
                    <div class="ov-cell"><div class="ov-val ${totalDiff >= 0 ? "p" : "n"}">${avgDiffStr}</div><div class="ov-lbl">Avg Margin</div></div>
                    <div class="ov-cell"><div class="ov-val p">+${bestWin}</div><div class="ov-lbl">Best Win</div></div>
                    <div class="ov-cell"><div class="ov-val n">-${bestLoss}</div><div class="ov-lbl">Worst Loss</div></div>
                    <div class="ov-cell"><div class="ov-val">${fireCount}</div><div class="ov-lbl">🔥 Fires</div></div>
                  </div>
                </div>

                <!-- Streaks -->
                <div class="ana-card">
                  <span class="badge">Streaks & Form</span>
                  <div class="ov-grid" style="margin-top:10px;grid-template-columns:repeat(3,1fr)">
                    <div class="ov-cell">
                      <div class="ov-val" style="color:${curStreak > 0 ? streakCol : "var(--muted)"}">${curStreak > 0 ? `${streakIcon} ${curStreak}${curType}` : "—"}</div>
                      <div class="ov-lbl">Current</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--green)">${maxWinStreak}W</div>
                      <div class="ov-lbl">Best Streak</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--red)">${maxLossStreak}L</div>
                      <div class="ov-lbl">Worst Streak</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--green)">${shutoutWins}</div>
                      <div class="ov-lbl">Shutout W</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--red)">${shutoutLosses}</div>
                      <div class="ov-lbl">Shutout L</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val">${dominatingWins}</div>
                      <div class="ov-lbl">💀 Dominant W</div>
                    </div>
                  </div>
                  <div style="margin-top:12px">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Recent Form</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">${formHtml}</div>
                  </div>
                </div>

                <!-- Timeline -->
                <div class="ana-card">
                  <span class="badge">Timeline</span>
                  <div class="det-streak-row" style="margin-top:10px">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="font-size:13px;font-weight:700">${fmtDate(firstMatch)}</div>
                      <div class="sub">First Together</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="font-size:13px;font-weight:700">${fmtDate(lastMatch)}</div>
                      <div class="sub">Last Together</div>
                    </div>
                  </div>
                </div>

                <!-- vs Opponents -->
                <div class="ana-card">
                  <span class="badge">vs Opponents</span>
                  <div style="margin-top:8px">${oppHtml || '<div class="sub">No data.</div>'}</div>
                </div>

              </div>
              <div style="margin-top:20px;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Recent Matches</div>
              <div class="ana-card" style="padding:8px 12px">${recentHtml || '<div class="sub">No matches.</div>'}</div>
            </div>
          </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

function getMatrixAlias(name) {
  // If already an alias array from firebase
  if (Array.isArray(name)) {
    return String(name[0] || "")
      .trim()
      .toUpperCase()
      .slice(0, 3);
  }

  // If passed actual player name string
  const aliases = aliasMap?.[name];

  if (Array.isArray(aliases) && aliases.length > 0) {
    return String(aliases[0] || "")
      .trim()
      .toUpperCase()
      .slice(0, 3);
  }

  // Fallback initials
  return String(name || "")
    .split(" ")
    .map((p) => p[0] || "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

// ── P VS P MATRIX (COMPACT, NO SCROLL) ────────────────────
function buildH2HMatrixCompact(players) {
  if (players.length < 2)
    return '<div style="color:var(--muted);font-size:11px">Need at least 2 players with matches.</div>';

  // Build head-to-head matrix
  const matrix = {};
  players.forEach((a) => {
    matrix[a] = {};
    players.forEach((b) => {
      if (a === b) {
        matrix[a][b] = null;
        return;
      }
      const h2h = getHeadToHeadStats(a, b);
      const total = h2h.aWins + h2h.bWins;
      matrix[a][b] = total > 0 ? { wins: h2h.aWins, total } : null;
    });
  });

  // Build unique 2-char aliases (fall back to 3 if clash)
  // const usedAliases = new Set();
  // const aliases = {};
  // players.forEach((p) => {
  //   // Strategy 1: first 2 chars
  //   let alias = p.slice(0, 3).toUpperCase();
  //   if (!usedAliases.has(alias)) {
  //     aliases[p] = alias;
  //     usedAliases.add(alias);
  //     return;
  //   }
  //   // Strategy 2: first char + last char
  //   alias = (p[0] + p[p.length - 1]).toUpperCase();
  //   if (!usedAliases.has(alias)) {
  //     aliases[p] = alias;
  //     usedAliases.add(alias);
  //     return;
  //   }
  //   // Strategy 3: first 3 chars
  //   alias = p.slice(0, 3).toUpperCase();
  //   if (!usedAliases.has(alias)) {
  //     aliases[p] = alias;
  //     usedAliases.add(alias);
  //     return;
  //   }
  //   // Fallback: first 2 + index digit
  //   let i = 1;
  //   while (usedAliases.has(p.slice(0, 1).toUpperCase() + i)) i++;
  //   aliases[p] = p.slice(0, 1).toUpperCase() + i;
  //   usedAliases.add(aliases[p]);
  // });

  const colHeaders = players
    .map(
      (p) =>
        `<th class="pvp-th" title="${p}">${getMatrixAlias(aliasMap[p])}</th>`,
    )
    .join("");

  const rows = players
    .map((a) => {
      const cells = players
        .map((b) => {
          if (a === b) return `<td class="pvp-td pvp-self">·</td>`;
          const d = matrix[a][b];
          if (!d) return `<td class="pvp-td pvp-none">—</td>`;
          const pct = Math.round((d.wins / d.total) * 100);
          const cls =
            pct >= 60 ? "pvp-win" : pct <= 40 ? "pvp-loss" : "pvp-even";
          return `<td class="pvp-td ${cls}" title="${a} vs ${b}: ${d.wins}W–${d.total - d.wins}L">${pct}%</td>`;
        })
        .join("");
      // Row label: use same alias as column header
      return `<tr><td class="pvp-row-hdr" title="${a}">${getMatrixAlias(aliasMap[a])}</td>${cells}</tr>`;
    })
    .join("");

  // Legend: alias → full name, two per line
  const legend = players
    .map(
      (p) =>
        `<span class="pvp-legend-item"><strong>${getMatrixAlias(aliasMap[p])}</strong> ${p.toUpperCase()}</span>`,
    )
    .join("");

  return `<div class="pvp-wrap">
              <table class="pvp-table">
                <thead><tr><th class="pvp-corner"></th>${colHeaders}</tr></thead>
                <tbody>${rows}</tbody>
              </table>
              <div class="pvp-legend">${legend}</div>
            </div>`;
}

// ── P VS P MATRIX ──────────────────────────────────────────
function buildH2HMatrix(players) {
  if (players.length < 2)
    return '<div style="color:var(--muted);font-size:11px">Need at least 2 players with matches.</div>';

  // Build win % for each row vs col (row beats col)
  const matrix = {};
  players.forEach((a) => {
    matrix[a] = {};
    players.forEach((b) => {
      if (a === b) {
        matrix[a][b] = null;
        return;
      }
      const h2h = getHeadToHeadStats(a, b);
      const total = h2h.aWins + h2h.bWins;
      matrix[a][b] = total > 0 ? { wins: h2h.aWins, total } : null;
    });
  });

  // Short name: first 5 chars to keep columns tight
  const short = (n) => (n.length > 6 ? n.slice(0, 5) + "…" : n);

  const colHeaders = players
    .map(
      (p) => `<th class="pvp-th" title="${p}">${getMatrixAlias(short(p))}</th>`,
    )
    .join("");

  const rows = players
    .map((a) => {
      const cells = players
        .map((b) => {
          if (a === b) return `<td class="pvp-td pvp-self">·</td>`;
          const d = matrix[a][b];
          if (!d) return `<td class="pvp-td pvp-none">—</td>`;
          const pct = Math.round((d.wins / d.total) * 100);
          const cls =
            pct >= 60 ? "pvp-win" : pct <= 40 ? "pvp-loss" : "pvp-even";
          return `<td class="pvp-td ${cls}" title="${a} vs ${b}: ${d.wins}W–${d.total - d.wins}L">${pct}%</td>`;
        })
        .join("");
      return `<tr><td class="pvp-row-hdr" title="${a}">${short(a)}</td>${cells}</tr>`;
    })
    .join("");

  return `<table class="pvp-table">
              <thead><tr><th class="pvp-corner"></th>${colHeaders}</tr></thead>
              <tbody>${rows}</tbody>
            </table>`;
}

// ── PLAYER COMPARISON ─────────────────────────────────────
const CMP_DATE_OPTS = [
  { v: "all", l: "ALL TIME" },
  { v: "today", l: "TODAY" },
  { v: "week", l: "THIS WEEK" },
  { v: "lastweek", l: "LAST WEEK" },
  { v: "weekend", l: "WEEKEND" },
  { v: "month", l: "THIS MONTH" },
];

function cmpDateOptsHtml(selected = "all") {
  return CMP_DATE_OPTS.map(
    (o) =>
      `<option value="${o.v}"${o.v === selected ? " selected" : ""}>${o.l}</option>`,
  ).join("");
}

function triggerCompare() {
  const a = document.getElementById("cmpSelA")?.value;
  const b = document.getElementById("cmpSelB")?.value;
  const dateF = document.getElementById("cmpDateSel")?.value || "all";
  if (!a || !b || a === b) {
    showToast("Select two different players", "⚠️", 2000);
    return;
  }
  openPlayerCompare(a, b, dateF);
}

function openPlayerCompare(nameA, nameB, dateFilter = "all") {
  const card = document.getElementById("compare-card");
  if (!card) return;
  const filtered = filterMatches(dateFilter);
  const eloMap = computeElo(filtered);
  const stats = computeStats(filtered, eloMap);
  const sA = stats.find((s) => s.name === nameA);
  const sB = stats.find((s) => s.name === nameB);
  if (!sA || !sB) return;

  const row = (label, valA, valB, higherIsBetter = true) => {
    const a = parseFloat(valA);
    const b = parseFloat(valB);
    const aCol =
      isNaN(a) || isNaN(b)
        ? "var(--text)"
        : higherIsBetter
          ? a > b
            ? "var(--green)"
            : a < b
              ? "var(--red)"
              : "var(--text)"
          : a < b
            ? "var(--green)"
            : a > b
              ? "var(--red)"
              : "var(--text)";
    const bCol =
      isNaN(a) || isNaN(b)
        ? "var(--text)"
        : higherIsBetter
          ? b > a
            ? "var(--green)"
            : b < a
              ? "var(--red)"
              : "var(--text)"
          : b < a
            ? "var(--green)"
            : b > a
              ? "var(--red)"
              : "var(--text)";
    return `<div class="cmp-row">
      <div class="cmp-val" style="color:${aCol}">${valA}</div>
      <div class="cmp-lbl">${label}</div>
      <div class="cmp-val" style="color:${bCol}">${valB}</div>
    </div>`;
  };

  const formA = (sA.form || [])
    .map((r) => `<span class="form-dot ${r === "W" ? "w" : "l"}">${r}</span>`)
    .join("");
  const formB = (sB.form || [])
    .map((r) => `<span class="form-dot ${r === "W" ? "w" : "l"}">${r}</span>`)
    .join("");

  // Use all-matches player list for dropdowns so they're never empty
  const allPlayers = computeStats(allMatches).map((s) => s.name);
  const opts = allPlayers
    .map(
      (p) =>
        `<option value="${p}"${p === nameA ? " selected" : ""}>${p}</option>`,
    )
    .join("");
  const optsB = allPlayers
    .map(
      (p) =>
        `<option value="${p}"${p === nameB ? " selected" : ""}>${p}</option>`,
    )
    .join("");
  const noData = (n) =>
    `<span style="color:var(--muted);font-size:11px">${n} — no data for this period</span>`;

  card.dataset.mode = "result";
  card.style.display = "block";
  card.innerHTML = `
    <div class="cmp-inline-card">
      <div class="cmp-inline-header">
        <span class="cmp-inline-title">⚡ Compare Players</span>
        <button class="cmp-inline-close" onclick="document.getElementById('compare-card').style.display='none';document.getElementById('compare-card').innerHTML=''">×</button>
      </div>
      <div class="cmp-inline-selectors">
        <select id="cmpSelA" class="cmp-ctrl cmp-player">${opts}</select>
        <span class="cmp-inline-vs">VS</span>
        <select id="cmpSelB" class="cmp-ctrl cmp-player">${optsB}</select>
      </div>
      <select id="cmpDateSel" class="cmp-ctrl cmp-full">${cmpDateOptsHtml(dateFilter)}</select>
      <button class="cmp-ctrl cmp-full" onclick="triggerCompare()">COMPARE</button>
      ${
        !sA || !sB
          ? `<div style="padding:12px 0;color:var(--muted);font-size:12px;text-align:center">${!sA ? noData(nameA) : ""}${!sB ? noData(nameB) : ""}</div>`
          : `
      <div class="cmp-result-block">
        <div class="cmp-names-bar">
          <div class="cmp-name">${nameA.split(" ")[0]}</div>
          <div class="cmp-vs-tag">${CMP_DATE_OPTS.find((o) => o.v === dateFilter)?.l || "ALL TIME"}</div>
          <div class="cmp-name">${nameB.split(" ")[0]}</div>
        </div>
        <div class="cmp-rows">
          ${row("Matches", sA.mp, sB.mp)}
          ${row("Win %", sA.winPct.toFixed(0) + "%", sB.winPct.toFixed(0) + "%")}
          ${row("Skill Rating", sA.sr.toFixed(2), sB.sr.toFixed(2))}
          ${row("ELO", eloMap[nameA] || 1000, eloMap[nameB] || 1000)}
          ${row("Game %", sA.gamePct.toFixed(0) + "%", sB.gamePct.toFixed(0) + "%")}
          ${row("Best Streak", sA.bestWinStreak + "W", sB.bestWinStreak + "W")}
          ${row("Avg Margin", (sA.avgMargin >= 0 ? "+" : "") + sA.avgMargin.toFixed(1), (sB.avgMargin >= 0 ? "+" : "") + sB.avgMargin.toFixed(1))}
          ${sA.consistency !== null && sB.consistency !== null ? row("Consistency ±", sA.consistency, sB.consistency, false) : ""}
          <div class="cmp-row" style="align-items:flex-start;padding-top:8px">
            <div class="cmp-form">${formA}</div>
            <div class="cmp-lbl">Form</div>
            <div class="cmp-form" style="justify-content:flex-end">${formB}</div>
          </div>
        </div>
      </div>`
      }
    </div>`;
}

function renderCompareSelector() {
  const card = document.getElementById("compare-card");
  if (!card) return;
  // Toggle: collapse if selector already open
  if (card.style.display !== "none" && card.dataset.mode === "selector") {
    card.style.display = "none";
    card.innerHTML = "";
    return;
  }
  const players = computeStats(allMatches)
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b));
  const opts =
    `<option value="">P1</option>` +
    players.map((p) => `<option value="${p}">${p}</option>`).join("");
  const optsB =
    `<option value="">P2</option>` +
    players.map((p) => `<option value="${p}">${p}</option>`).join("");
  card.dataset.mode = "selector";
  card.style.display = "block";
  card.innerHTML = `
    <div class="cmp-inline-card">
      <div class="cmp-inline-header">
        <span class="cmp-inline-title">⚡ Compare Players</span>
        <button class="cmp-inline-close" onclick="document.getElementById('compare-card').style.display='none';document.getElementById('compare-card').innerHTML=''">×</button>
      </div>
      <div class="cmp-inline-selectors">
        <select id="cmpSelA" class="cmp-ctrl cmp-player">${opts}</select>
        <span class="cmp-inline-vs">VS</span>
        <select id="cmpSelB" class="cmp-ctrl cmp-player">${optsB}</select>
      </div>
      <select id="cmpDateSel" class="cmp-ctrl cmp-full">${cmpDateOptsHtml()}</select>
      <button class="cmp-ctrl cmp-full" onclick="triggerCompare()">COMPARE</button>
    </div>`;
}

// ── ANALYTICS ──────────────────────────────────────────────
function renderH2HDeepDive() {
  const p1 = document.getElementById("h2hP1")?.value;
  const p2 = document.getElementById("h2hP2")?.value;
  const result = document.getElementById("h2h-result");
  if (!result) return;
  if (!p1 || !p2 || p1 === p2) {
    result.innerHTML =
      '<div class="sub" style="padding:8px;color:var(--red)">Select two different players.</div>';
    return;
  }
  const h2h = getHeadToHeadStats(p1, p2);
  const total = h2h.aWins + h2h.bWins;
  if (total === 0) {
    result.innerHTML =
      '<div class="sub" style="padding:8px">These players have never faced each other.</div>';
    return;
  }
  // Walk full ELO to capture per-match deltas for this H2H pair
  const h2hDeltaMap = new Map();
  const _e = {};
  [...allMatches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => { if (!(p in _e)) _e[p] = 1000; });
      const aWon = m.scoreA > m.scoreB;
      const avgA = m.teamA.reduce((s, p) => s + _e[p], 0) / Math.max(m.teamA.length, 1);
      const avgB = m.teamB.reduce((s, p) => s + _e[p], 0) / Math.max(m.teamB.length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => { _e[p] = (_e[p] || 1000) + dA; });
      m.teamB.forEach((p) => { _e[p] = (_e[p] || 1000) + dB; });
      const p1InA = (m.teamA || []).includes(p1);
      const p1InB = (m.teamB || []).includes(p1);
      const p2InA = (m.teamA || []).includes(p2);
      const p2InB = (m.teamB || []).includes(p2);
      if ((p1InA && p2InB) || (p1InB && p2InA))
        h2hDeltaMap.set(m, { p1d: p1InA ? dA : dB, p2d: p2InA ? dA : dB });
    });
  let p1Total = 0, p2Total = 0;
  h2hDeltaMap.forEach((v) => { p1Total += v.p1d; p2Total += v.p2d; });
  const fmtD = (n) => n > 0 ? `+${n}` : String(n);
  const dCol = (n) => n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--muted)";

  const p1Pct = Math.round((h2h.aWins / total) * 100);
  const p2Pct = 100 - p1Pct;
  const recent = [...h2h.matches]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);
  const col1 = playerColor(p1);
  const col2 = playerColor(p2);
  const leader = h2h.aWins > h2h.bWins ? p1 : h2h.bWins > h2h.aWins ? p2 : null;
  const leaderCol = leader === p1 ? col1 : col2;
  const eloBg = (n) => n > 0 ? "rgba(74,222,128,0.15)" : n < 0 ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.06)";
  const borderCol = (n) => n > 0 ? "#4ade80" : n < 0 ? "#f87171" : "rgba(255,255,255,0.1)";
  result.innerHTML = `
    <div class="h2h-modern">
      <div class="h2h-hero">
        <div class="h2h-hero-side" style="background:linear-gradient(135deg,${col1}18 0%,transparent 70%)">
          ${playerAvatar(p1, 34)}
          <div class="h2h-hero-name">${p1}</div>
          <div class="h2h-hero-wins" style="color:${col1}">${h2h.aWins}</div>
          <div class="h2h-hero-sub">${p1Pct}% win rate</div>
        </div>
        <div class="h2h-hero-center">
          <div class="h2h-vs-badge">VS</div>
          <div class="h2h-total-badge">${total}<br><span style="font-size:8px;font-weight:600;opacity:0.6">played</span></div>
        </div>
        <div class="h2h-hero-side h2h-hero-right" style="background:linear-gradient(225deg,${col2}18 0%,transparent 70%)">
          ${playerAvatar(p2, 34)}
          <div class="h2h-hero-name">${p2}</div>
          <div class="h2h-hero-wins" style="color:${col2}">${h2h.bWins}</div>
          <div class="h2h-hero-sub">${p2Pct}% win rate</div>
        </div>
      </div>

      <div class="h2h-split-wrap">
        <span class="h2h-split-pct" style="color:${col1}">${p1Pct}%</span>
        <div class="h2h-split-bar">
          <div class="h2h-split-seg" style="width:${p1Pct}%;background:${col1}"></div>
          <div class="h2h-split-seg" style="width:${p2Pct}%;background:${col2}"></div>
        </div>
        <span class="h2h-split-pct" style="color:${col2}">${p2Pct}%</span>
      </div>

      <div class="h2h-leader-badge">
        ${leader
          ? `<span style="color:${leaderCol};font-weight:800">${leader}</span>&nbsp;leads this rivalry`
          : "⚖️ Perfectly balanced"}
      </div>

      <div class="h2h-elo-row">
        <div class="h2h-elo-card" style="border-top-color:${borderCol(p1Total)}">
          <div class="h2h-elo-label">ELO IMPACT</div>
          <div class="h2h-elo-player" style="color:${col1}">${p1}</div>
          <div class="h2h-elo-delta" style="color:${dCol(p1Total)}">${fmtD(p1Total)}</div>
          <div class="h2h-elo-sub">from ${total} meetings</div>
        </div>
        <div class="h2h-elo-card" style="border-top-color:${borderCol(p2Total)}">
          <div class="h2h-elo-label">ELO IMPACT</div>
          <div class="h2h-elo-player" style="color:${col2}">${p2}</div>
          <div class="h2h-elo-delta" style="color:${dCol(p2Total)}">${fmtD(p2Total)}</div>
          <div class="h2h-elo-sub">from ${total} meetings</div>
        </div>
      </div>

      <div class="h2h-matches-title">RECENT ENCOUNTERS</div>
      <div class="h2h-match-list">
        ${recent
          .map((m) => {
            const p1InA = m.teamA.includes(p1);
            const p1Won = p1InA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
            const deltas = h2hDeltaMap.get(m);
            const p1d = deltas?.p1d ?? 0;
            const p2d = deltas?.p2d ?? 0;
            const winnerCol = p1Won ? col1 : col2;
            const winnerName = p1Won ? p1 : p2;
            const scoreP1 = p1InA ? m.scoreA : m.scoreB;
            const scoreP2 = p1InA ? m.scoreB : m.scoreA;
            return `
              <div class="h2h-match-card">
                <div class="h2h-match-accent" style="background:${winnerCol}"></div>
                <div class="h2h-match-body">
                  <div class="h2h-match-row1">
                    <span class="h2h-match-winner-name" style="color:${winnerCol}">${winnerName} won</span>
                    <span class="h2h-match-score">${scoreP1}–${scoreP2}</span>
                    <span class="h2h-match-date">${fmtDate(m.date)}</span>
                  </div>
                  <div class="h2h-match-row2">
                    <span class="h2h-elo-pill" style="background:${eloBg(p1d)};color:${dCol(p1d)}">${p1} ${fmtD(p1d)}</span>
                    <span class="h2h-elo-pill" style="background:${eloBg(p2d)};color:${dCol(p2d)}">${p2} ${fmtD(p2d)}</span>
                  </div>
                </div>
              </div>`;
          })
          .join("")}
      </div>
    </div>`;
}

// ── ANALYTICS SECTION STATE ────────────────────────────────
const ANA_ORDER_KEY = "ekta_ana_order";
const ANA_COL_KEY = "ekta_ana_col";
function getAnaOrder() {
  try {
    return JSON.parse(localStorage.getItem(ANA_ORDER_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveAnaOrder(a) {
  localStorage.setItem(ANA_ORDER_KEY, JSON.stringify(a));
}
function getAnaCollapsed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(ANA_COL_KEY)) || []);
  } catch (e) {
    return new Set();
  }
}
function saveAnaCollapsed(s) {
  localStorage.setItem(ANA_COL_KEY, JSON.stringify([...s]));
}

function toggleAnaSection(key) {
  const el = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (!el) return;
  el.classList.toggle("collapsed");
  const col = getAnaCollapsed();
  el.classList.contains("collapsed") ? col.add(key) : col.delete(key);
  saveAnaCollapsed(col);
  if (key === "calendar" && !el.classList.contains("collapsed"))
    renderMatchCalendar();
  if (key === "elo" && !el.classList.contains("collapsed")) {
    el.querySelectorAll(".elo-bar").forEach((bar) => {
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "";
    });
  }
  if (!el.classList.contains("collapsed")) {
    el.querySelectorAll(".h2h-cascade-item").forEach((item, i) => {
      item.classList.remove("card-anim");
      void item.offsetWidth;
      item.style.animationDelay = `${50 + i * 90}ms`;
      item.classList.add("card-anim");
    });
  }
}

let _anaDragKey = null;
let _anaClone = null;
let _anaDragOffsetY = 0;

function _reRenderAnalytics() {
  const sc = document.querySelector("#pg-analytics .page-body-scroll");
  const top = sc?.scrollTop || 0;
  renderAnalyticsPage();
  requestAnimationFrame(() => {
    if (sc) sc.scrollTop = top;
  });
}

function anaHandlePointerDown(e, key) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  _anaDragKey = key;

  const sec = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (!sec) return;
  const rect = sec.getBoundingClientRect();
  _anaDragOffsetY = e.clientY - rect.top;

  // Floating clone
  _anaClone = sec.cloneNode(true);
  Object.assign(_anaClone.style, {
    position: "fixed",
    top: rect.top + "px",
    left: rect.left + "px",
    width: rect.width + "px",
    zIndex: 9999,
    opacity: "0.85",
    pointerEvents: "none",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    borderRadius: "8px",
    background: "var(--surface2)",
  });
  document.body.appendChild(_anaClone);
  sec.classList.add("ana-sec-dragging");

  document.addEventListener("pointermove", _anaOnMove);
  document.addEventListener("pointerup", _anaOnUp);
}

function _anaOnMove(e) {
  if (!_anaClone) return;
  _anaClone.style.top = e.clientY - _anaDragOffsetY + "px";

  document
    .querySelectorAll(".ana-sec-drop-above, .ana-sec-drop-below")
    .forEach((el) =>
      el.classList.remove("ana-sec-drop-above", "ana-sec-drop-below"),
    );

  const container = document.getElementById("analytics-page-content");
  if (!container) return;
  for (const sec of container.querySelectorAll(".ana-sec")) {
    if (sec.dataset.key === _anaDragKey) continue;
    const r = sec.getBoundingClientRect();
    if (e.clientY >= r.top && e.clientY <= r.bottom) {
      sec.classList.add(
        e.clientY < r.top + r.height / 2
          ? "ana-sec-drop-above"
          : "ana-sec-drop-below",
      );
      break;
    }
  }
}

function _anaOnUp(e) {
  document.removeEventListener("pointermove", _anaOnMove);
  document.removeEventListener("pointerup", _anaOnUp);
  if (_anaClone) {
    _anaClone.remove();
    _anaClone = null;
  }

  const dragged = document.querySelector(`.ana-sec[data-key="${_anaDragKey}"]`);
  if (dragged) dragged.classList.remove("ana-sec-dragging");

  const above = document.querySelector(".ana-sec-drop-above");
  const below = document.querySelector(".ana-sec-drop-below");
  const target = above || below;
  document
    .querySelectorAll(".ana-sec-drop-above, .ana-sec-drop-below")
    .forEach((el) =>
      el.classList.remove("ana-sec-drop-above", "ana-sec-drop-below"),
    );

  if (target && _anaDragKey) {
    const container = document.getElementById("analytics-page-content");
    const secs = [...container.querySelectorAll(".ana-sec")].map(
      (el) => el.dataset.key,
    );
    const from = secs.indexOf(_anaDragKey);
    secs.splice(from, 1);
    const to = secs.indexOf(target.dataset.key);
    secs.splice(above ? to : to + 1, 0, _anaDragKey);
    saveAnaOrder(secs);
    _reRenderAnalytics();
  }
  _anaDragKey = null;
}

function computeElo(matches) {
  const elo = {};
  const g = (n) => {
    if (!(n in elo)) elo[n] = 1000;
  };
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    [...m.teamA, ...m.teamB].forEach(g);
    const avgA =
      m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB =
      m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const expB = 1 - expA;
    const deltaA = 32 * ((aWon ? 1 : 0) - expA);
    const deltaB = 32 * ((aWon ? 0 : 1) - expB);
    m.teamA.forEach((p) => {
      elo[p] = Math.round(elo[p] + deltaA);
    });
    m.teamB.forEach((p) => {
      elo[p] = Math.round(elo[p] + deltaB);
    });
  });
  return elo;
}

function computeEloHistory(matches) {
  const elo = {};
  const history = {};
  const sorted = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  sorted.forEach((m) => {
    const allP = [...(m.teamA || []), ...(m.teamB || [])];
    allP.forEach((p) => { if (!(p in elo)) { elo[p] = 1000; history[p] = []; } });
    const aWon = m.scoreA > m.scoreB;
    const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    m.teamA.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dA;
      history[p].push({ date: m.date, elo: elo[p], delta: dA, won: aWon, opponent: m.teamB.join(" & "), scoreA: m.scoreA, scoreB: m.scoreB });
    });
    m.teamB.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dB;
      history[p].push({ date: m.date, elo: elo[p], delta: dB, won: !aWon, opponent: m.teamA.join(" & "), scoreA: m.scoreB, scoreB: m.scoreA });
    });
  });
  return history;
}

function computeEloPeaks(matches) {
  const elo = {};
  const peaks = {};
  const sorted = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  sorted.forEach((m) => {
    const allP = [...(m.teamA || []), ...(m.teamB || [])];
    allP.forEach((p) => { if (!(p in elo)) { elo[p] = 1000; peaks[p] = 1000; } });
    const aWon = m.scoreA > m.scoreB;
    const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    m.teamA.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dA;
      if (elo[p] > (peaks[p] || 0)) peaks[p] = elo[p];
    });
    m.teamB.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dB;
      if (elo[p] > (peaks[p] || 0)) peaks[p] = elo[p];
    });
  });
  return peaks;
}

function computeBadges(name, stats, eloMap, allMatchesArr) {
  const badges = [];
  const allStats = computeStats(allMatchesArr);
  const sr = allStats;

  // 👑 King: ranked #1 by SR
  if (sr.length && sr[0].name === name)
    badges.push({ icon: "👑", label: "King", desc: "Ranked #1 overall" });

  // 🔥 On Fire / 🧊 Ice Cold
  const ps = allStats.find((p) => p.name === name);
  if (ps) {
    if (ps.curType === "W" && ps.curStreak >= 5)
      badges.push({
        icon: "🔥",
        label: "On Fire",
        desc: `${ps.curStreak} match win streak`,
      });
    if (ps.curType === "L" && ps.curStreak >= 5)
      badges.push({
        icon: "🧊",
        label: "Ice Cold",
        desc: `${ps.curStreak} match loss streak`,
      });
  }

  // 💪 Ironman: most matches played
  const maxMp = Math.max(...allStats.map((p) => p.mp));
  if (ps && ps.mp === maxMp && maxMp > 0)
    badges.push({
      icon: "💪",
      label: "Ironman",
      desc: `Most matches played (${maxMp})`,
    });

  // 🎯 Sniper: won 2+ matches in a session without conceding any games
  const sessionDates = [
    ...new Set(allMatchesArr.map((m) => m.date).filter(Boolean)),
  ];
  for (const date of sessionDates) {
    const sm = allMatchesArr.filter(
      (m) =>
        m.date === date &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(name),
    );
    let shutoutWins = 0;
    sm.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const own = inA ? m.scoreA : m.scoreB;
      const opp = inA ? m.scoreB : m.scoreA;
      if (own > opp && opp === 0) shutoutWins++;
    });
    if (shutoutWins >= 2) {
      badges.push({
        icon: "🎯",
        label: "Sniper",
        desc: "Won 2+ matches X-0 in one session",
      });
      break;
    }
  }

  // 🧗 Climber: biggest positive ELO gain this week
  const { from: wkFrom } = lastWeekRange();
  const preWkElo = computeElo(
    allMatchesArr.filter((m) => (m.date || "") < wkFrom),
  );
  const eloGains = allStats.map((p) => ({
    name: p.name,
    gain: (eloMap[p.name] || 1000) - (preWkElo[p.name] || 1000),
  }));
  const topGainer = eloGains.sort((a, b) => b.gain - a.gain)[0];
  if (topGainer && topGainer.name === name && topGainer.gain > 0)
    badges.push({
      icon: "🧗",
      label: "Climber",
      desc: `+${topGainer.gain} ELO this week`,
    });

  // 🦁 Clutch King: best win% in close matches (margin <= 1) with ≥3 close games
  const closeW = {},
    closeP = {};
  allMatchesArr.forEach((m) => {
    if (Math.abs(m.scoreA - m.scoreB) > 1) return;
    const aWon = m.scoreA > m.scoreB;
    [...(m.teamA || [])].forEach((p) => {
      closeP[p] = (closeP[p] || 0) + 1;
      if (aWon) closeW[p] = (closeW[p] || 0) + 1;
    });
    [...(m.teamB || [])].forEach((p) => {
      closeP[p] = (closeP[p] || 0) + 1;
      if (!aWon) closeW[p] = (closeW[p] || 0) + 1;
    });
  });
  const clutchPlayers = Object.keys(closeP).filter((p) => closeP[p] >= 3);
  if (clutchPlayers.length) {
    const best = clutchPlayers.sort(
      (a, b) => (closeW[b] || 0) / closeP[b] - (closeW[a] || 0) / closeP[a],
    )[0];
    if (best === name)
      badges.push({
        icon: "🦁",
        label: "Clutch King",
        desc: `${Math.round(((closeW[name] || 0) / closeP[name]) * 100)}% in close matches`,
      });
  }

  // 🤝 Best Duo: part of pair with highest win% (≥4 games)
  const pairs = getPairStats(allMatchesArr).filter((p) => p.played >= 4);
  if (pairs.length && pairs[0].players.includes(name))
    badges.push({
      icon: "🤝",
      label: "Best Duo",
      desc: `${pairs[0].winPct}% with ${pairs[0].players.find((p) => p !== name)}`,
    });

  // 🃏 Giant Killer: beaten 2+ players with higher SR
  if (ps) {
    const srMap = {};
    allStats.forEach((p) => {
      srMap[p.name] = p.sr;
    });
    const beatenHigher = new Set();
    allMatchesArr.forEach((m) => {
      const aWon = m.scoreA > m.scoreB;
      const inA = (m.teamA || []).includes(name);
      const inB = (m.teamB || []).includes(name);
      if (!inA && !inB) return;
      const won = (inA && aWon) || (inB && !aWon);
      if (!won) return;
      const opps = inA ? m.teamB || [] : m.teamA || [];
      opps.forEach((opp) => {
        if ((srMap[opp] || 0) > (srMap[name] || 0)) beatenHigher.add(opp);
      });
    });
    if (beatenHigher.size >= 2)
      badges.push({
        icon: "🃏",
        label: "Giant Killer",
        desc: `Beaten ${beatenHigher.size} higher-rated players`,
      });
  }

  return badges;
}

function runMatchSimulator() {
  const a1 = document.getElementById("simA1")?.value;
  const a2 = document.getElementById("simA2")?.value;
  const b1 = document.getElementById("simB1")?.value;
  const b2 = document.getElementById("simB2")?.value;
  const result = document.getElementById("sim-result");
  if (!result) return;

  if (!a1 || !a2 || !b1 || !b2) {
    result.innerHTML =
      '<div class="sub" style="color:var(--red);padding:8px 0">Select all 4 players.</div>';
    return;
  }
  if (new Set([a1, a2, b1, b2]).size < 4) {
    result.innerHTML =
      '<div class="sub" style="color:var(--red);padding:8px 0">All 4 players must be different.</div>';
    return;
  }

  const eloMap = computeElo(allMatches);
  const e = (p) => eloMap[p] || 1000;
  const avgA = (e(a1) + e(a2)) / 2;
  const avgB = (e(b1) + e(b2)) / 2;
  const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
  const expB = 1 - expA;
  const winPctA = Math.round(expA * 100);
  const winPctB = 100 - winPctA;

  const dAwin = Math.round(32 * (1 - expA));
  const dBlose = Math.round(32 * (0 - expB));
  const dAlose = Math.round(32 * (0 - expA));
  const dBwin = Math.round(32 * (1 - expB));

  const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);
  const col = (n) =>
    n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--muted)";

  result.innerHTML = `
    <div class="sim-result-inner">
      <div class="sim-prob-row">
        <span class="sim-prob-val" style="color:var(--green)">${winPctA}%</span>
        <div class="sim-prob-track">
          <div class="sim-prob-fill-a" style="width:${winPctA}%"></div>
          <div class="sim-prob-fill-b" style="width:${winPctB}%"></div>
        </div>
        <span class="sim-prob-val" style="color:var(--red)">${winPctB}%</span>
      </div>
      <div class="sim-outcomes">
        <div class="sim-outcome">
          <div class="sim-outcome-title" style="color:var(--green)">If A wins</div>
          <div class="sim-p-row"><span>${a1}</span><span style="color:${col(dAwin)};font-weight:800">${fmt(dAwin)}</span></div>
          <div class="sim-p-row"><span>${a2}</span><span style="color:${col(dAwin)};font-weight:800">${fmt(dAwin)}</span></div>
          <div class="sim-p-row"><span>${b1}</span><span style="color:${col(dBlose)};font-weight:800">${fmt(dBlose)}</span></div>
          <div class="sim-p-row"><span>${b2}</span><span style="color:${col(dBlose)};font-weight:800">${fmt(dBlose)}</span></div>
        </div>
        <div class="sim-outcome-div"></div>
        <div class="sim-outcome">
          <div class="sim-outcome-title" style="color:var(--red)">If B wins</div>
          <div class="sim-p-row"><span>${a1}</span><span style="color:${col(dAlose)};font-weight:800">${fmt(dAlose)}</span></div>
          <div class="sim-p-row"><span>${a2}</span><span style="color:${col(dAlose)};font-weight:800">${fmt(dAlose)}</span></div>
          <div class="sim-p-row"><span>${b1}</span><span style="color:${col(dBwin)};font-weight:800">${fmt(dBwin)}</span></div>
          <div class="sim-p-row"><span>${b2}</span><span style="color:${col(dBwin)};font-weight:800">${fmt(dBwin)}</span></div>
        </div>
      </div>
    </div>`;
}

function anaSearchInput(q) {
  const res = document.getElementById("ana-search-results");
  const clearBtn = document.getElementById("ana-search-clear");
  if (!res) return;
  if (clearBtn) clearBtn.style.display = q ? "flex" : "none";
  const query = (q || "").trim().toLowerCase();
  if (!query) { res.innerHTML = ""; res.style.display = "none"; return; }

  const items = [];
  document.querySelectorAll(".ana-sec[data-key]").forEach((el) => {
    const key = el.dataset.key;
    const title = el.querySelector(".ana-sec-title-txt")?.textContent?.trim() || key;
    if (title.toLowerCase().includes(query))
      items.push({ type: "section", key, label: title });
  });
  const players = [...new Set(allMatches.flatMap((m) => [...(m.teamA || []), ...(m.teamB || [])]))].sort();
  players.forEach((p) => {
    if (p.toLowerCase().includes(query))
      items.push({ type: "player", key: p, label: p });
  });

  if (!items.length) {
    res.innerHTML = '<div class="ana-search-empty">No results found</div>';
  } else {
    res.innerHTML = items.slice(0, 10).map((item) =>
      `<div class="ana-search-item" onmousedown="anaSearchSelect('${item.type}','${item.key.replace(/'/g, "\\'")}','${item.label.replace(/'/g, "\\'")}')">`+
      `<span class="ana-search-item-icon">${item.type === "section" ? "📋" : "👤"}</span>`+
      `<span class="ana-search-item-label">${item.label}</span>`+
      `<span class="ana-search-item-type">${item.type === "section" ? "Section" : "Player"}</span>`+
      `</div>`
    ).join("");
  }
  res.style.display = "block";
}

function anaSearchSelect(type, key, label) {
  const input = document.getElementById("ana-search-input");
  const res = document.getElementById("ana-search-results");
  if (input) input.value = "";
  if (res) res.style.display = "none";
  const clearBtn = document.getElementById("ana-search-clear");
  if (clearBtn) clearBtn.style.display = "none";
  if (type === "section") {
    const el = document.querySelector(`.ana-sec[data-key="${key}"]`);
    if (!el) return;
    if (el.classList.contains("collapsed")) toggleAnaSection(key);
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    el.style.outline = "1.5px solid rgba(var(--theme-rgb),0.6)";
    el.style.borderRadius = "12px";
    setTimeout(() => { el.style.outline = ""; el.style.borderRadius = ""; }, 1800);
  } else {
    openPlayerDetail(label);
  }
}

function anaSearchClose() {
  const res = document.getElementById("ana-search-results");
  if (res) res.style.display = "none";
}

function anaSearchClear() {
  const input = document.getElementById("ana-search-input");
  if (input) { input.value = ""; input.focus(); }
  const res = document.getElementById("ana-search-results");
  if (res) { res.innerHTML = ""; res.style.display = "none"; }
  const clearBtn = document.getElementById("ana-search-clear");
  if (clearBtn) clearBtn.style.display = "none";
}

function buildEloTimelineHtml(filterKey) {
  filterKey = filterKey || _eloTLFilter || "all";
  _eloTLFilter = filterKey;
  const history = computeEloHistory(allMatches);
  const eloNow = computeElo(allMatches);
  const players = Object.keys(history)
    .filter((p) => (history[p] || []).length >= 2)
    .sort((a, b) => (eloNow[b] || 1000) - (eloNow[a] || 1000));
  if (!players.length)
    return '<div class="sub" style="padding:8px">No ELO data yet.</div>';
  if (!_eloTLPlayer || !history[_eloTLPlayer]) _eloTLPlayer = players[0];
  const name = _eloTLPlayer;
  let pts = [...(history[name] || [])];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const dayOfWeek = now.getDay();
  const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + daysToMon);
  const thisMondayStr = thisMonday.toISOString().slice(0, 10);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastMondayStr = lastMonday.toISOString().slice(0, 10);
  const lastSundayStr = new Date(thisMonday.getTime() - 86400000).toISOString().slice(0, 10);

  if (filterKey === "3m") {
    const c = new Date(now); c.setMonth(c.getMonth() - 3);
    const cs = c.toISOString().slice(0, 10);
    pts = pts.filter((p) => (p.date || "") >= cs);
  } else if (filterKey === "1m") {
    const c = new Date(now); c.setMonth(c.getMonth() - 1);
    const cs = c.toISOString().slice(0, 10);
    pts = pts.filter((p) => (p.date || "") >= cs);
  } else if (filterKey === "1w") {
    const c = new Date(now); c.setDate(c.getDate() - 7);
    const cs = c.toISOString().slice(0, 10);
    pts = pts.filter((p) => (p.date || "") >= cs);
  } else if (filterKey === "thisweek") {
    pts = pts.filter((p) => (p.date || "") >= thisMondayStr);
  } else if (filterKey === "lastweek") {
    pts = pts.filter((p) => (p.date || "") >= lastMondayStr && (p.date || "") <= lastSundayStr);
  } else if (filterKey === "today") {
    pts = pts.filter((p) => p.date === todayStr);
  }
  _eloTLPts = pts;
  const chips = players
    .map(
      (p) =>
        `<button class="elo-tl-chip${p === name ? " active" : ""}" onclick="selectEloTLPlayer('${p.replace(/'/g, "\\'")}')">${p}</button>`,
    )
    .join("");
  const pills = [
    { k: "all", l: "ALL" },
    { k: "3m", l: "3M" },
    { k: "1m", l: "1M" },
    { k: "1w", l: "1W" },
    { k: "thisweek", l: "THIS WK" },
    { k: "lastweek", l: "LAST WK" },
    { k: "today", l: "TODAY" },
  ]
    .map(
      (f) =>
        `<button class="elo-tl-filter${filterKey === f.k ? " active" : ""}" onclick="filterEloTimeline('${f.k}')">${f.l}</button>`,
    )
    .join("");
  let chartHtml = "";
  if (pts.length < 2) {
    chartHtml =
      '<div class="sub" style="padding:16px 0;text-align:center">Not enough data for selected period.</div>';
  } else {
    const W = 320, H = 100, pl = 38, pr = 10, pt = 10, pb = 20;
    const cW = W - pl - pr, cH = H - pt - pb;
    const minE = Math.min(...pts.map((p) => p.elo)) - 15;
    const maxE = Math.max(...pts.map((p) => p.elo)) + 15;
    const eRange = Math.max(1, maxE - minE);
    const toX = (i) => pl + (i / Math.max(pts.length - 1, 1)) * cW;
    const toY = (e) => pt + (1 - (e - minE) / eRange) * cH;
    const col = playerColor(name);
    const gradId = `etgtl_${name.replace(/[^a-zA-Z0-9]/g, "")}`;
    const yLines = [minE + eRange * 0.25, minE + eRange * 0.5, minE + eRange * 0.75]
      .map((ev) => {
        const y = toY(ev);
        return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><text x="${pl - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.3)">${Math.round(ev)}</text>`;
      })
      .join("");
    const polyline = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`).join(" ");
    const area =
      `M${toX(0).toFixed(1)},${(H - pb).toFixed(1)} ` +
      pts.map((p, i) => `L${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`).join(" ") +
      ` L${toX(pts.length - 1).toFixed(1)},${(H - pb).toFixed(1)} Z`;
    const circles = pts
      .map(
        (p, i) =>
          `<circle cx="${toX(i).toFixed(1)}" cy="${toY(p.elo).toFixed(1)}" r="4" fill="${p.won ? "var(--green)" : "var(--red)"}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5" style="cursor:pointer" onclick="showEloMatchDetail(${i})"></circle>`,
      )
      .join("");
    const lastElo = pts[pts.length - 1].elo;
    const startElo = pts[0].elo - pts[0].delta;
    const netChange = lastElo - startElo;
    const netStr = netChange > 0 ? `+${netChange}` : String(netChange);
    const netCol = netChange > 0 ? "var(--green)" : netChange < 0 ? "var(--red)" : "var(--muted)";
    chartHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 6px">
        <div style="font-size:9px;color:var(--muted)">● W &nbsp;● L &nbsp;· ${pts.length} matches</div>
        <div style="font-size:12px;font-weight:800;color:${netCol}">${netStr} ELO</div>
      </div>
      <div style="overflow-x:auto">
        <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible">
          ${yLines}
          <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${col}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="${area}" fill="url(#${gradId})"/>
          <polyline points="${polyline}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          ${circles}
          <text x="${toX(pts.length - 1).toFixed(1)}" y="${(toY(lastElo) - 7).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="900" fill="${col}">${lastElo}</text>
        </svg>
      </div>
      <div id="elo-tl-detail"></div>`;
  }
  return `<div class="ana-card" style="padding:10px 12px">
    <div class="elo-tl-players">${chips}</div>
    <div class="elo-tl-filters">${pills}</div>
    ${chartHtml}
  </div>`;
}

function _rerenderEloTLSection() {
  const el = document.querySelector('.ana-sec[data-key="eloTimeline"] .ana-sec-body');
  if (el) el.innerHTML = buildEloTimelineHtml(_eloTLFilter);
}

function selectEloTLPlayer(name) {
  _eloTLPlayer = name;
  _rerenderEloTLSection();
}

function filterEloTimeline(key) {
  _eloTLFilter = key;
  _rerenderEloTLSection();
}

function showEloMatchDetail(idx) {
  const p = _eloTLPts[idx];
  const d = document.getElementById("elo-tl-detail");
  if (!d || !p) return;
  const dStr = p.delta > 0 ? `+${p.delta}` : String(p.delta);
  const dCol = p.delta > 0 ? "var(--green)" : p.delta < 0 ? "var(--red)" : "var(--muted)";
  d.innerHTML = `<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid ${p.won ? "var(--green)" : "var(--red)"}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;font-weight:700;color:${p.won ? "var(--green)" : "var(--red)"}">${p.won ? "WIN" : "LOSS"}</span>
      <span style="font-size:10px;color:var(--muted)">${fmtDate(p.date)}</span>
    </div>
    <div style="margin-top:3px;font-size:11px">vs <strong>${p.opponent.toUpperCase()}</strong></div>
    <div style="margin-top:3px;display:flex;gap:12px;font-size:11px">
      <span style="color:var(--muted)">Score: <strong style="color:var(--fg)">${p.scoreA}–${p.scoreB}</strong></span>
      <span style="color:var(--muted)">ELO: <strong style="color:var(--fg)">${p.elo}</strong></span>
      <span style="font-weight:700;color:${dCol}">${dStr}</span>
    </div>
  </div>`;
}

function calcEloWinProb() {
  const p1 = document.getElementById("eloProb-p1")?.value;
  const p2 = document.getElementById("eloProb-p2")?.value;
  const result = document.getElementById("elo-prob-result");
  if (!result) return;
  if (!p1 || !p2 || p1 === p2) {
    result.innerHTML = '<div class="sub" style="color:var(--red);padding:4px">Select two different players.</div>';
    return;
  }
  const em = computeElo(allMatches);
  const e1 = em[p1] || 1000;
  const e2 = em[p2] || 1000;
  const prob = 1 / (1 + Math.pow(10, (e2 - e1) / 400));
  const pct1 = Math.round(prob * 100);
  const pct2 = 100 - pct1;
  const col1 = playerColor(p1);
  const col2 = playerColor(p2);
  result.innerHTML = `<div style="margin-top:8px">
    <div style="display:flex;align-items:center;gap:0;margin-bottom:10px;border-radius:6px;overflow:hidden;height:10px">
      <div style="flex:${pct1};background:${col1};height:100%;min-width:4px"></div>
      <div style="flex:${pct2};background:${col2};height:100%;min-width:4px"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:22px;font-weight:900;color:${col1}">${pct1}%</div>
        <div style="font-size:10px;color:var(--muted)">${p1.toUpperCase()}</div>
        <div style="font-size:9px;color:var(--muted)">ELO ${e1}</div>
      </div>
      <div style="font-size:10px;color:var(--muted);padding-top:6px">WIN CHANCE</div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:900;color:${col2}">${pct2}%</div>
        <div style="font-size:10px;color:var(--muted)">${p2.toUpperCase()}</div>
        <div style="font-size:9px;color:var(--muted)">ELO ${e2}</div>
      </div>
    </div>
  </div>`;
}

function renderAnalyticsPage() {
  const container = document.getElementById("analytics-page-content");
  if (!container) return;
  if (!allMatches.length) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;color:var(--muted)">No matches yet.</div>';
    return;
  }

  // ── DATA COLLECTION ────────────────────────────────────
  const stats = {},
    shutoutWins = {},
    shutoutLosses = {};
  const highestMargins = [],
    partnerships = {},
    teamMatchups = {};
  const monthlyStats = {},
    dateCounts = {},
    scoreDist = {},
    rivalryCount = {};
  const closeWins = {},
    closePlayed = {};

  const sortedM = [...allMatches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );

  sortedM.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    const winners = aWon ? m.teamA : m.teamB,
      losers = aWon ? m.teamB : m.teamA;
    const winScore = aWon ? m.scoreA : m.scoreB,
      loseScore = aWon ? m.scoreB : m.scoreA;
    const margin = Math.abs(m.scoreA - m.scoreB);

    [...m.teamA, ...m.teamB].forEach((p) => {
      if (!stats[p])
        stats[p] = {
          name: p,
          wins: 0,
          losses: 0,
          matches: 0,
          streak: 0,
          bestStreak: 0,
          teammates: {},
        };
    });
    winners.forEach((p) => {
      stats[p].wins++;
      stats[p].matches++;
      stats[p].streak++;
      if (stats[p].streak > stats[p].bestStreak)
        stats[p].bestStreak = stats[p].streak;
    });
    losers.forEach((p) => {
      stats[p].losses++;
      stats[p].matches++;
      stats[p].streak = 0;
    });

    if (loseScore === 0) {
      winners.forEach((p) => {
        shutoutWins[p] = (shutoutWins[p] || 0) + 1;
      });
      losers.forEach((p) => {
        shutoutLosses[p] = (shutoutLosses[p] || 0) + 1;
      });
    }
    winners.forEach((p) =>
      highestMargins.push({
        player: p,
        margin,
        score: `${winScore}-${loseScore}`,
      }),
    );

    if (m.teamA.length === 2 && m.teamB.length === 2) {
      const addP = (t, won, ownScore, oppScore) => {
        const key = [...t].sort().join(" & ");
        if (!partnerships[key])
          partnerships[key] = {
            players: [...t].sort(),
            wins: 0,
            played: 0,
            diff: 0,
            gw: 0,
            gt: 0,
          };
        partnerships[key].played++;
        partnerships[key].gw += ownScore;
        partnerships[key].gt += ownScore + oppScore;
        if (won) {
          partnerships[key].wins++;
          partnerships[key].diff += margin;
        } else partnerships[key].diff -= margin;
      };
      addP(m.teamA, aWon, m.scoreA, m.scoreB);
      addP(m.teamB, !aWon, m.scoreB, m.scoreA);
      // Team vs Team matchup tracking
      const tkA = [...m.teamA].sort().join(" & ");
      const tkB = [...m.teamB].sort().join(" & ");
      const mk = [tkA, tkB].sort().join(" vs ");
      if (!teamMatchups[mk])
        teamMatchups[mk] = {
          teamA: [...m.teamA].sort(),
          teamB: [...m.teamB].sort(),
          wins: { [tkA]: 0, [tkB]: 0 },
          played: 0,
        };
      teamMatchups[mk].played++;
      teamMatchups[mk].wins[aWon ? tkA : tkB]++;
    }
    if (m.teamA.length === 2) {
      const [a, b] = m.teamA;
      stats[a].teammates[b] = (stats[a].teammates[b] || 0) + 1;
      stats[b].teammates[a] = (stats[b].teammates[a] || 0) + 1;
    }
    if (m.teamB.length === 2) {
      const [a, b] = m.teamB;
      stats[a].teammates[b] = (stats[a].teammates[b] || 0) + 1;
      stats[b].teammates[a] = (stats[b].teammates[a] || 0) + 1;
    }

    // Monthly win rates
    const mo = (m.date || "").substring(0, 7);
    if (mo) {
      if (!monthlyStats[mo]) monthlyStats[mo] = {};
      m.teamA.forEach((p) => {
        if (!monthlyStats[mo][p]) monthlyStats[mo][p] = { w: 0, m: 0 };
        monthlyStats[mo][p].m++;
        if (aWon) monthlyStats[mo][p].w++;
      });
      m.teamB.forEach((p) => {
        if (!monthlyStats[mo][p]) monthlyStats[mo][p] = { w: 0, m: 0 };
        monthlyStats[mo][p].m++;
        if (!aWon) monthlyStats[mo][p].w++;
      });
    }
    if (m.date) dateCounts[m.date] = (dateCounts[m.date] || 0) + 1;

    const hi = Math.max(m.scoreA, m.scoreB),
      lo = Math.min(m.scoreA, m.scoreB);
    scoreDist[`${hi}-${lo}`] = (scoreDist[`${hi}-${lo}`] || 0) + 1;

    m.teamA.forEach((a) =>
      m.teamB.forEach((b) => {
        const k = [a, b].sort().join("|");
        rivalryCount[k] = (rivalryCount[k] || 0) + 1;
      }),
    );

    if (margin <= 1) {
      winners.forEach((p) => {
        closeWins[p] = (closeWins[p] || 0) + 1;
        closePlayed[p] = (closePlayed[p] || 0) + 1;
      });
      losers.forEach((p) => {
        closePlayed[p] = (closePlayed[p] || 0) + 1;
      });
    }
  });

  // ── ELO ────────────────────────────────────────────────
  const eloMap = computeElo(allMatches);

  // ── DERIVED ────────────────────────────────────────────
  const players = Object.values(stats);
  const mostActive = [...players].sort((a, b) => b.matches - a.matches)[0];
  const topWinRate = [...players]
    .filter((p) => p.matches >= 3)
    .sort((a, b) => b.wins / b.matches - a.wins / a.matches)[0];
  const topStreak = [...players].sort((a, b) => b.bestStreak - a.bestStreak)[0];
  const mostShutoutWinsEntry = Object.entries(shutoutWins).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const maxLosses = Math.max(...Object.values(shutoutLosses), 0);
  const mostShutoutLosses = Object.entries(shutoutLosses)
    .filter(([, v]) => v === maxLosses)
    .map(([k]) => k);
  const biggestWin = [...highestMargins].sort((a, b) => b.margin - a.margin)[0];
  const bestPartnership = Object.values(partnerships)
    .filter((p) => p.played >= 2)
    .sort((a, b) => {
      const winPctDiff = b.wins / b.played - a.wins / a.played;
      if (Math.abs(winPctDiff) > 1e-9) return winPctDiff;
      const playedDiff = b.played - a.played;
      if (playedDiff !== 0) return playedDiff;
      return b.gw / b.gt - a.gw / a.gt;
    })[0];
  const pairLeaderboard = getPairStats().slice(0, 8);
  const playersByMatches = getAllPlayerNamesFromMatches();
  const matrixHtml = buildH2HMatrixCompact(playersByMatches);

  const compList = computeStats(allMatches, computeElo(allMatches));
  const clutchP = Object.keys(closePlayed)
    .filter((p) => closePlayed[p] >= 3)
    .sort(
      (a, b) =>
        (closeWins[b] || 0) / closePlayed[b] -
        (closeWins[a] || 0) / closePlayed[a],
    )[0];
  const clutchRankedAll = Object.keys(closePlayed)
    .filter((p) => closePlayed[p] >= 3)
    .map((p) => ({
      name: p,
      wins: closeWins[p] || 0,
      played: closePlayed[p],
      pct: Math.round(((closeWins[p] || 0) / closePlayed[p]) * 100),
    }))
    .sort((a, b) => b.pct - a.pct || b.played - a.played);
  // grid: Rank | Player | Close W-L | Clutch%
  const clutchGrid = "grid-template-columns:40px 1fr 62px 72px";
  const clutchRankHtml = clutchRankedAll.length
    ? `<div class="lrace-header" style="${clutchGrid}"><span>Rank</span><span>Player</span><span>Close W-L</span><span>Clutch%</span></div>` +
      clutchRankedAll
        .map((p, i) => {
          const col =
            p.pct > 60
              ? "var(--green)"
              : p.pct < 40
                ? "var(--red)"
                : "var(--muted)";
          const lbl = p.pct > 60 ? "CLUTCH" : p.pct < 40 ? "CHOKER" : "NEUTRAL";
          return `<div class="lrace-row" style="${clutchGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.wins}–${p.played - p.wins}</div><div class="lrace-delta" style="color:${col}">${p.pct}% <span style="font-size:9px">${lbl}</span></div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need 3+ close matches per player.</div>';

  // ── CONSISTENCY RANKINGS ─────────────────────────────────
  // grid: Rank | Player | Matches | Consistency
  const conGrid = "grid-template-columns:40px 1fr 56px 86px";
  const consistencyStats = compList
    .filter((p) => p.mp >= 3 && p.consistency !== null)
    .sort((a, b) => a.consistency - b.consistency);
  const consistencyRankHtml = consistencyStats.length
    ? `<div style="font-size:9px;color:var(--muted);margin-bottom:8px">Lower = more consistent (std dev of score margins)</div>` +
      `<div class="lrace-header" style="${conGrid}"><span>Rank</span><span>Player</span><span>Matches</span><span>Consistency</span></div>` +
      consistencyStats
        .map((p, i) => {
          const col =
            p.consistency <= 2
              ? "var(--green)"
              : p.consistency <= 4
                ? "var(--gold)"
                : "var(--red)";
          const lbl =
            p.consistency <= 2
              ? "SOLID"
              : p.consistency <= 4
                ? "STEADY"
                : "ERRATIC";
          return `<div class="lrace-row" style="${conGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.mp}</div><div class="lrace-delta" style="color:${col}">±${p.consistency} <span style="font-size:9px">${lbl}</span></div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need 3+ matches per player.</div>';

  // ── QUALITY WINS (OPPONENT STRENGTH WEIGHTING) ───────────
  const eloMapFull = computeElo(allMatches);
  const qualityWins = {};
  allMatches.forEach((m) => {
    const winners = m.scoreA > m.scoreB ? m.teamA : m.teamB;
    const losers = m.scoreA > m.scoreB ? m.teamB : m.teamA;
    const loserAvgElo =
      losers.reduce((s, p) => s + (eloMapFull[p] || 1000), 0) /
      (losers.length || 1);
    const qualityScore = loserAvgElo / 1000;
    winners.forEach((p) => {
      if (!qualityWins[p]) qualityWins[p] = { total: 0, count: 0 };
      qualityWins[p].total += qualityScore;
      qualityWins[p].count++;
    });
  });
  const qualityRanked = Object.entries(qualityWins)
    .filter(([, v]) => v.count >= 3)
    .map(([name, v]) => ({
      name,
      score: parseFloat((v.total / v.count).toFixed(3)),
      wins: v.count,
    }))
    .sort((a, b) => b.score - a.score);
  // grid: Rank | Player | Wins | Quality
  const qualGrid = "grid-template-columns:40px 1fr 44px 72px";
  const qualityRankHtml = qualityRanked.length
    ? `<div style="font-size:9px;color:var(--muted);margin-bottom:8px">Avg ELO of defeated opponents (normalized to 1000 baseline)</div>` +
      `<div class="lrace-header" style="${qualGrid}"><span>Rank</span><span>Player</span><span>Wins</span><span>Quality</span></div>` +
      qualityRanked
        .map((p, i) => {
          const col =
            p.score > 1.05
              ? "var(--green)"
              : p.score < 0.95
                ? "var(--red)"
                : "var(--muted)";
          const lbl =
            p.score > 1.05 ? "ELITE" : p.score < 0.95 ? "EASY" : "MID";
          return `<div class="lrace-row" style="${qualGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.wins}</div><div class="lrace-delta" style="color:${col}">${p.score.toFixed(2)}x <span style="font-size:9px">${lbl}</span></div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need 3+ wins per player.</div>';

  const destroyer = compList
    .filter((p) => p.mp >= 3)
    .sort((a, b) => b.avgMargin - a.avgMargin)[0];

  const topRivalEntry = Object.entries(rivalryCount).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const [rivalA, rivalB] = topRivalEntry?.[0]?.split("|") || [null, null];
  const rivalry = rivalA && rivalB ? getHeadToHeadStats(rivalA, rivalB) : null;

  const uniqueMonths = Object.keys(monthlyStats).sort();
  const top5 = [...players]
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 5)
    .map((p) => p.name);
  const scoreDistSorted = Object.entries(scoreDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const maxSD = scoreDistSorted[0]?.[1] || 1;

  const closeMatches = sortedM
    .filter((m) => Math.abs(m.scoreA - m.scoreB) <= 1)
    .slice(-5)
    .reverse();

  const pwrMap = {};
  compList.forEach((p) => {
    pwrMap[p.name] = p.mwr;
  });
  const upsets = sortedM
    .map((m) => {
      const aWon = m.scoreA > m.scoreB;
      const wTeam = aWon ? m.teamA : m.teamB,
        lTeam = aWon ? m.teamB : m.teamA;
      const wR =
        wTeam.reduce((s, p) => s + (pwrMap[p] || 0.5), 0) /
        Math.max(wTeam.length, 1);
      const lR =
        lTeam.reduce((s, p) => s + (pwrMap[p] || 0.5), 0) /
        Math.max(lTeam.length, 1);
      return { m, wTeam, lTeam, gap: lR - wR };
    })
    .filter((u) => u.gap > 0.08)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  const { from: wkFrom, to: wkTo } = lastWeekRange();
  const rankAll = compList.reduce((o, p, i) => ({ ...o, [p.name]: i + 1 }), {});
  const _preWkArr = allMatches.filter((m) => (m.date || "") < wkFrom);
  const rank1wk = computeStats(_preWkArr, computeElo(_preWkArr)).reduce(
    (o, p, i) => ({ ...o, [p.name]: i + 1 }),
    {},
  );
  const rankRace = compList.slice(0, 10).map((p) => ({
    name: p.name,
    rAll: rankAll[p.name] || "—",
    r1mo: rank1wk[p.name] || "—",
    delta:
      typeof rank1wk[p.name] === "number" && typeof rankAll[p.name] === "number"
        ? rank1wk[p.name] - rankAll[p.name]
        : null,
  }));

  const formTable = playersByMatches
    .map((name) => {
      const pm = sortedM
        .filter((m) => m.teamA.includes(name) || m.teamB.includes(name))
        .slice(-10);
      if (pm.length < 3) return null;
      let w = 0;
      const dots = pm.map((m) => {
        const won = m.teamA.includes(name)
          ? m.scoreA > m.scoreB
          : m.scoreB > m.scoreA;
        if (won) w++;
        return won ? "W" : "L";
      });
      return {
        name,
        dots,
        pct: Math.round((w / pm.length) * 100),
        n: pm.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);

  const bestPairPerP = compList
    .map((p) => ({ name: p.name, partner: p.bestPartner, wins: p.mw }))
    .filter((p) => p.partner && p.wins >= 1);
  const pairFormData = getPairStats()
    .filter((p) => p.played >= 3)
    .slice(0, 6)
    .map((pair) => {
      const pm = sortedM
        .filter((m) => {
          const ak = [...m.teamA].sort().join(" & "),
            bk = [...m.teamB].sort().join(" & ");
          return ak === pair.key || bk === pair.key;
        })
        .slice(-5);
      const form = pm.map((m) => {
        const won =
          [...m.teamA].sort().join(" & ") === pair.key
            ? m.scoreA > m.scoreB
            : m.scoreB > m.scoreA;
        return won ? "W" : "L";
      });
      return { ...pair, form };
    });

  const sessionMap = {};
  sortedM.forEach((m) => {
    if (!m.date) return;
    if (!sessionMap[m.date])
      sessionMap[m.date] = { matches: [], players: new Set() };
    sessionMap[m.date].matches.push(m);
    [...m.teamA, ...m.teamB].forEach((p) => sessionMap[m.date].players.add(p));
  });
  const sessions = Object.entries(sessionMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
    .map(([date, d]) => {
      const dw = {};
      d.matches.forEach((m) => {
        (m.scoreA > m.scoreB ? m.teamA : m.teamB).forEach((p) => {
          dw[p] = (dw[p] || 0) + 1;
        });
      });
      return {
        date,
        matches: d.matches,
        players: [...d.players],
        mvp: Object.entries(dw).sort((a, b) => b[1] - a[1])[0],
      };
    });

  // ── HTML HELPERS ───────────────────────────────────────
  const card = (badge, name, sub) =>
    `<div class="ana-card"><span class="badge">${badge}</span><div class="name">${name || "—"}</div><div class="sub">${sub}</div></div>`;
  const scard = (icon, title, name, sub) =>
    `<div class="award-card"><div class="award-icon">${icon}</div><div class="award-title">${title}</div><div class="award-name">${name || "—"}</div><div class="award-sub">${sub}</div></div>`;
  const section = (title) => `<div class="ana-section-title">${title}</div>`;
  const fdots = (arr) =>
    arr
      .map(
        (r) =>
          `<span class="fd ${r === "W" ? "fd-w" : "fd-l"}" style="width:14px;height:14px;font-size:7px">${r}</span>`,
      )
      .join("");
  const chartColors = ["#f5c842", "#18d7ff", "#36d47e", "#f04f4f", "#b44dff"];

  // ── WIN RATE CHART ─────────────────────────────────────
  let winChartHtml =
    '<div class="sub" style="padding:8px">Need matches across multiple months.</div>';
  if (uniqueMonths.length >= 2) {
    const W = 300,
      H = 110,
      pl = 32,
      pr = 8,
      pt = 10,
      pb = 18,
      cW = W - pl - pr,
      cH = H - pt - pb;
    const moN = [
      "",
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
    const yL = [0, 50, 100]
      .map((p) => {
        const y = pt + (1 - p / 100) * cH;
        return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><text x="${pl - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.35)">${p}%</text>`;
      })
      .join("");
    const xL = uniqueMonths
      .map((mo, i) => {
        const x = pl + (i / (uniqueMonths.length - 1 || 1)) * cW;
        return `<text x="${x.toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.35)">${moN[parseInt(mo.substring(5))] || mo.substring(5)}</text>`;
      })
      .join("");
    const lines = top5
      .map((pn, ci) => {
        const pts = uniqueMonths
          .map((mo, i) => {
            const d = monthlyStats[mo]?.[pn];
            if (!d || d.m === 0) return null;
            return {
              x: pl + (i / (uniqueMonths.length - 1 || 1)) * cW,
              y: pt + (1 - d.w / d.m) * cH,
            };
          })
          .filter(Boolean);
        if (pts.length < 1) return "";
        const color = chartColors[ci % 5];
        return `<polyline points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${color}"/>`).join("")}`;
      })
      .join("");
    const legend = top5
      .map(
        (p, ci) =>
          `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;color:rgba(255,255,255,0.65)"><span style="display:inline-block;width:10px;height:2px;background:${chartColors[ci % 5]};border-radius:1px"></span>${p.split(" ")[0]}</span>`,
      )
      .join("");
    winChartHtml = `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block">${yL}${lines}${xL}</svg></div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">${legend}</div>`;
  }

  // ── HEATMAP (all-time, clickable) ─────────────────────
  const heatHtml = (() => {
    const MON = [
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
    const DOW = ["M", "T", "W", "T", "F", "S", "S"];

    // Start from Monday of the week containing the first ever match
    const allDs = Object.keys(dateCounts).sort();
    const refDate = allDs.length ? new Date(allDs[0]) : new Date();
    const startDow = (refDate.getDay() + 6) % 7;
    refDate.setDate(refDate.getDate() - startDow);

    const todayD = new Date();
    const hCells = [];
    const cur = new Date(refDate);
    while (cur <= todayD) {
      const ds = cur.toISOString().substring(0, 10);
      hCells.push({ ds, c: dateCounts[ds] || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    while (hCells.length % 7 !== 0) hCells.push({ ds: "", c: 0, pad: true });

    const numWeeks = hCells.length / 7;
    const maxH = Math.max(...hCells.map((c) => c.c), 1);
    const todayStr = todayISO();

    // Month labels (one per column, show when month changes)
    const monthRow = Array.from({ length: numWeeks }, (_, col) => {
      const cell = hCells[col * 7];
      if (!cell?.ds) return `<div></div>`;
      const mo = parseInt(cell.ds.substring(5, 7)) - 1;
      const prev =
        col > 0
          ? parseInt(hCells[(col - 1) * 7]?.ds?.substring(5, 7) || "0") - 1
          : -1;
      return `<div class="hm-mo-lbl">${mo !== prev ? MON[mo] : ""}</div>`;
    }).join("");

    // Grid cells
    const cells = hCells
      .map((c) => {
        if (c.pad) return `<div class="hm-cell hm-pad"></div>`;
        const a = c.c === 0 ? 0 : Math.max(0.18, c.c / maxH);
        const bg =
          c.c === 0
            ? "rgba(255,255,255,0.05)"
            : `rgba(var(--theme-rgb),${a.toFixed(2)})`;
        const isToday = c.ds === todayStr;
        const clickable =
          c.c > 0
            ? `onclick="calDayClick('${c.ds}')" style="background:${bg};cursor:pointer${isToday ? ";outline:1.5px solid rgba(var(--theme-rgb),0.8);outline-offset:-1px" : ""}"`
            : `style="background:${bg}${isToday ? ";outline:1.5px solid rgba(var(--theme-rgb),0.5);outline-offset:-1px" : ""}"`;
        const tip = c.ds + (c.c ? `: ${c.c} match${c.c > 1 ? "es" : ""}` : "");
        return `<div class="hm-cell" ${clickable} title="${tip}"></div>`;
      })
      .join("");

    // Stats bar
    const totalSessions = allDs.length;
    const busiestDay = allDs.reduce(
      (a, b) => (dateCounts[b] > dateCounts[a] ? b : a),
      allDs[0] || "",
    );
    const monthCounts = {};
    allDs.forEach((ds) => {
      const k = ds.substring(0, 7);
      monthCounts[k] = (monthCounts[k] || 0) + dateCounts[ds];
    });
    const busiestMonth = Object.keys(monthCounts).reduce(
      (a, b) => (monthCounts[b] > monthCounts[a] ? b : a),
      Object.keys(monthCounts)[0] || "",
    );
    const busiestMonthLabel = busiestMonth
      ? MON[parseInt(busiestMonth.substring(5, 7)) - 1] +
        " " +
        busiestMonth.substring(0, 4)
      : "—";
    const statsBar = `<div class="hm-stats-row">
      <div class="hm-stat"><div class="hm-stat-val">${totalSessions}</div><div class="hm-stat-lbl">Session Days</div></div>
      <div class="hm-stat-div"></div>
      <div class="hm-stat"><div class="hm-stat-val">${allMatches.length}</div><div class="hm-stat-lbl">Total Matches</div></div>
      <div class="hm-stat-div"></div>
      <div class="hm-stat"><div class="hm-stat-val">${busiestMonthLabel}</div><div class="hm-stat-lbl">Busiest Month</div></div>
      <div class="hm-stat-div"></div>
      <div class="hm-stat"><div class="hm-stat-val">${busiestDay ? fmtDate(busiestDay) : "—"}</div><div class="hm-stat-lbl">Peak Day (${dateCounts[busiestDay] || 0}m)</div></div>
    </div>`;

    return `<div class="hm-outer">
      <div class="hm-scroll">
        <div class="hm-dow-col">${DOW.map((d) => `<div class="hm-dow">${d}</div>`).join("")}</div>
        <div style="flex:1;min-width:0">
          <div class="hm-mo-row" style="grid-template-columns:repeat(${numWeeks},var(--hm-sz))">${monthRow}</div>
          <div class="hm-grid" style="grid-template-columns:repeat(${numWeeks},var(--hm-sz))">${cells}</div>
        </div>
      </div>
      <div class="hm-legend"><span>Less</span><div class="hm-leg-cell" style="background:rgba(255,255,255,0.05)"></div><div class="hm-leg-cell" style="background:rgba(var(--theme-rgb),0.25)"></div><div class="hm-leg-cell" style="background:rgba(var(--theme-rgb),0.6)"></div><div class="hm-leg-cell" style="background:rgba(var(--theme-rgb),1)"></div><span>More</span></div>
    </div>${statsBar}`;
  })();

  // ── SCORE DISTRIBUTION ─────────────────────────────────
  const sdHtml = scoreDistSorted
    .map(
      ([s, c]) =>
        `<div class="sdist-row"><div class="sdist-lbl">${s}</div><div class="sdist-bar-wrap"><div class="sdist-bar" style="width:${((c / maxSD) * 100).toFixed(0)}%"></div></div><div class="sdist-count">${c}</div></div>`,
    )
    .join("");

  // ── FORM TABLE ─────────────────────────────────────────
  const ftHtml =
    formTable
      .map((p, i) => {
        const pc =
          p.pct >= 60
            ? "var(--green)"
            : p.pct <= 40
              ? "var(--red)"
              : "var(--text)";
        return `<div class="ftable-row"><div class="ftable-rank">${i + 1}</div><div class="ftable-name">${p.name}</div><div class="ftable-dots">${fdots(p.dots)}</div><div class="ftable-pct" style="color:${pc}">${p.pct}%</div></div>`;
      })
      .join("") ||
    '<div class="sub" style="padding:8px">Not enough data.</div>';

  // ── LEADERBOARD RACE ───────────────────────────────────
  const lrHtml = rankRace
    .map((p) => {
      const arrow =
        p.delta > 0
          ? `<span style="color:var(--green)">▲${p.delta}</span>`
          : p.delta < 0
            ? `<span style="color:var(--red)">▼${Math.abs(p.delta)}</span>`
            : `<span style="color:var(--muted)">—</span>`;
      return `<div class="lrace-row"><div class="lrace-rank">#${p.rAll}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${typeof p.r1mo === "number" ? `#${p.r1mo}` : "—"}</div><div class="lrace-delta">${arrow}</div></div>`;
    })
    .join("");

  // ── AWARDS ─────────────────────────────────────────────
  const awards = [
    {
      i: "🎯",
      t: "Sharpshooter",
      n: topWinRate?.name,
      s: `${topWinRate ? Math.round((topWinRate.wins / topWinRate.matches) * 100) : 0}% win rate`,
    },
    {
      i: "🛡️",
      t: "The Wall",
      n: mostShutoutWinsEntry?.[0] || "—",
      s: `${mostShutoutWinsEntry?.[1] || 0} shutout wins`,
    },
    {
      i: "💔",
      t: "Glass Jaw",
      n: mostShutoutLosses[0] || "—",
      s: `${maxLosses} shutout losses`,
    },
    {
      i: "👑",
      t: "Dominator",
      n: destroyer?.name,
      s: `+${destroyer?.avgMargin?.toFixed(1) || 0} avg margin`,
    },
    {
      i: "🎲",
      t: "Clutch",
      n: clutchP || "—",
      s: clutchP
        ? `${Math.round(((closeWins[clutchP] || 0) / closePlayed[clutchP]) * 100)}% in close matches`
        : "Needs 3+ close matches",
    },
    {
      i: "🤝",
      t: "Dynamic Duo",
      n: bestPartnership?.players?.join(" & ") || "—",
      s: `${bestPartnership ? Math.round((bestPartnership.wins / bestPartnership.played) * 100) : 0}% win rate together`,
    },
  ];
  const awardsHtml = awards
    .map(
      (a) =>
        `<div class="award-card"><div class="award-icon">${a.i}</div><div class="award-title">${a.t}</div><div class="award-name">${a.n || "—"}</div><div class="award-sub">${a.s}</div></div>`,
    )
    .join("");

  // ── CLOSEST MATCHES ────────────────────────────────────
  const cmHtml = closeMatches.length
    ? closeMatches
        .map(
          (m) =>
            `<div class="ana-card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px"><div><div style="font-size:12px;font-weight:700;text-transform:uppercase">${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")}</div><div class="sub">${fmtDate(m.date)}</div></div><div style="font-size:16px;font-weight:800;color:var(--theme)">${m.scoreA}–${m.scoreB}</div></div>`,
        )
        .join("")
    : '<div class="ana-card"><div class="sub">No close matches yet.</div></div>';

  // ── BIGGEST UPSETS ─────────────────────────────────────
  const upHtml = upsets.length
    ? upsets
        .map(
          (u) =>
            `<div class="ana-card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px"><div><div style="font-size:12px;font-weight:700;text-transform:uppercase">${u.wTeam.join(" & ")} <span style="color:var(--green)">won</span></div><div class="sub" style="text-transform:uppercase">vs ${u.lTeam.join(" & ")} · ${fmtDate(u.m.date)}</div></div><div style="text-align:right"><div style="font-size:14px;font-weight:800;color:var(--text)">${u.m.scoreA}–${u.m.scoreB}</div><div style="font-size:9px;color:var(--red);font-weight:700">+${(u.gap * 100).toFixed(0)}% gap</div></div></div>`,
        )
        .join("")
    : '<div class="ana-card"><div class="sub">No clear upsets found.</div></div>';

  // ── CHEMISTRY ─────────────────────────────────────────
  const chemData = Object.entries(partnerships)
    .filter(([, v]) => v.played >= 2)
    .sort((a, b) => {
      const diff = b[1].wins / b[1].played - a[1].wins / a[1].played;
      return diff !== 0 ? diff : b[1].played - a[1].played;
    })
    .slice(0, 6);
  const chemHtml = chemData.length
    ? chemData
        .map(([, p]) => {
          const pc = Math.round((p.wins / p.played) * 100);
          const col =
            pc >= 60 ? "var(--green)" : pc <= 40 ? "var(--red)" : "var(--text)";
          return `<div class="chem-row"><div class="chem-names">${p.players.join(" & ")}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pc}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pc}%</div><div class="chem-played">${p.played}g</div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need more doubles data.</div>';

  const bpHtml =
    bestPairPerP
      .map(
        (p) =>
          `<div class="bpair-row"><div class="bpair-player">${p.name}</div><div class="bpair-partner">🤝 ${p.partner.name.split(" ")[0]}</div><div class="bpair-pct">${p.partner.pct.toFixed(0)}%</div></div>`,
      )
      .join("") ||
    '<div class="sub" style="padding:8px">Not enough data.</div>';

  // ── PAIR SYNERGY DELTA ────────────────────────────────────
  // For each player, show how much better/worse they perform with each partner vs their baseline
  const overallWinRate = {};
  compList.forEach((p) => {
    overallWinRate[p.name] = p.winPct;
  });
  const synergyRows = [];
  Object.entries(partnerships).forEach(([key, pd]) => {
    if (pd.played < 2) return;
    const [pA, pB] = pd.players;
    const pairPct = (pd.wins / pd.played) * 100;
    if (overallWinRate[pA] !== undefined) {
      synergyRows.push({
        player: pA,
        partner: pB,
        pairPct,
        delta: pairPct - overallWinRate[pA],
        played: pd.played,
      });
    }
    if (overallWinRate[pB] !== undefined) {
      synergyRows.push({
        player: pB,
        partner: pA,
        pairPct,
        delta: pairPct - overallWinRate[pB],
        played: pd.played,
      });
    }
  });
  synergyRows.sort((a, b) => b.delta - a.delta);
  const synergyHtml = synergyRows.length
    ? synergyRows
        .map((r) => {
          const col =
            r.delta > 5
              ? "var(--green)"
              : r.delta < -5
                ? "var(--red)"
                : "var(--muted)";
          const sign = r.delta >= 0 ? "+" : "";
          return `<div class="bpair-row"><div class="bpair-player">${r.player}</div><div class="bpair-partner">+ ${r.partner.split(" ")[0]}</div><div class="bpair-pct" style="color:${col}">${sign}${r.delta.toFixed(0)}%</div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Not enough data.</div>';

  // ── PAIRED H2H ────────────────────────────────────────────
  const pairedH2HRows = Object.entries(teamMatchups)
    .filter(([, v]) => v.played >= 2)
    .sort((a, b) => b[1].played - a[1].played);
  const pairedH2HHtml = pairedH2HRows.length
    ? pairedH2HRows
        .map(([, v]) => {
          const tkA = v.teamA.join(" & ");
          const tkB = v.teamB.join(" & ");
          const wA = v.wins[tkA] || 0;
          const wB = v.wins[tkB] || 0;
          const colA =
            wA > wB ? "var(--green)" : wA < wB ? "var(--red)" : "var(--muted)";
          const colB =
            wB > wA ? "var(--green)" : wB < wA ? "var(--red)" : "var(--muted)";
          return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;margin-bottom:4px">${v.teamA.map((p) => p.split(" ")[0]).join(" & ")} <span style="color:var(--muted)">vs</span> ${v.teamB.map((p) => p.split(" ")[0]).join(" & ")}</div>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:16px;font-weight:900;color:${colA}">${wA}</span>
            <span style="font-size:10px;color:var(--muted)">${v.played}g</span>
            <span style="font-size:16px;font-weight:900;color:${colB}">${wB}</span>
          </div>
        </div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need 2+ head-to-head matches between same pairs.</div>';

  const allPairsRanked = Object.entries(partnerships).sort((a, b) => {
    const diff = b[1].wins / b[1].played - a[1].wins / a[1].played;
    return diff !== 0 ? diff : b[1].played - a[1].played;
  });

  // Compute ELO rank for each pair (avg of the two players' current ELO)
  const pairEloRankMap = new Map();
  const pairAvgEloArr = [...Object.entries(partnerships)].map(([key, p]) => ({
    key,
    avgElo: p.players.reduce((s, n) => s + (eloMap[n] || 1000), 0) / p.players.length,
  }));
  pairAvgEloArr
    .slice()
    .sort((a, b) => b.avgElo - a.avgElo)
    .forEach(({ key }, i) => pairEloRankMap.set(key, i + 1));

  // Pair chemistry score = 60% win% + 40% ELO-normalized
  const _minPairElo = pairAvgEloArr.length ? Math.min(...pairAvgEloArr.map(x => x.avgElo)) : 1000;
  const _maxPairElo = pairAvgEloArr.length ? Math.max(...pairAvgEloArr.map(x => x.avgElo)) : 1000;
  const _pairEloRange = Math.max(1, _maxPairElo - _minPairElo);
  const pairChemMap = new Map();
  pairAvgEloArr.forEach(({ key, avgElo }) => {
    const p = partnerships[key];
    const winComp = p.played ? (p.wins / p.played) * 100 : 0;
    const eloNorm = ((avgElo - _minPairElo) / _pairEloRange) * 100;
    pairChemMap.set(key, Math.round(0.6 * winComp + 0.4 * eloNorm));
  });

  const allPairsHtml = allPairsRanked.length
    ? `<div class="chem-header">
        <div class="chem-rank">RANK</div>
        <div class="chem-elo-rank">ELO</div>
        <div class="chem-names">PAIR</div>
        <div class="chem-wl">W–L</div>
        <div class="chem-bar-wrap"></div>
        <div class="chem-pct">WIN%</div>
        <div class="chem-played">GP</div>
        <div class="pair-chem-badge">⚡</div>
      </div>` +
      allPairsRanked
        .map(([key, p], i) => {
          const pc = Math.round((p.wins / p.played) * 100);
          const col =
            pc >= 60 ? "var(--green)" : pc <= 40 ? "var(--red)" : "var(--text)";
          const escKey = key.replace(/'/g, "\\'");
          const eloRank = pairEloRankMap.get(key);
          const eloRankHtml = eloRank
            ? `<div class="chem-elo-rank" style="color:${eloRank <= 3 ? "var(--accent)" : "var(--muted)"}">#${eloRank}</div>`
            : `<div class="chem-elo-rank">—</div>`;
          const chemScore = pairChemMap.get(key) || 0;
          const chemCol = chemScore >= 70 ? "var(--green)" : chemScore >= 45 ? "var(--text)" : "var(--muted)";
          return `<div class="chem-row" style="cursor:pointer" onclick="openPairDetail('${escKey}')"><div class="chem-rank">#${i + 1}</div>${eloRankHtml}<div class="chem-names">${p.players.join(" & ")}</div><div class="chem-wl">${p.wins}–${p.played - p.wins}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pc}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pc}%</div><div class="chem-played">${p.played}g</div><div class="pair-chem-badge" style="color:${chemCol}">⚡${chemScore}</div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">No pair data.</div>';

  const pfHtml = pairFormData.length
    ? pairFormData
        .map(
          (p) =>
            `<div class="pform-row"><div class="pform-name">${p.key}</div><div class="pform-dots">${fdots(p.form)}</div><div class="pform-stat">${p.winPct}% · ${p.played}g</div></div>`,
        )
        .join("")
    : '<div class="sub" style="padding:8px">Need more pair data.</div>';

  // ── RIVALRY ────────────────────────────────────────────
  let rivalHtml = '<div class="sub" style="padding:8px">Not enough data.</div>';
  if (rivalry && rivalA && rivalB) {
    const tot = rivalry.aWins + rivalry.bWins;
    const aPct = Math.round((rivalry.aWins / tot) * 100);
    const bPct = 100 - aPct;

    // Series leader
    const leader =
      rivalry.aWins > rivalry.bWins
        ? rivalA
        : rivalry.bWins > rivalry.aWins
          ? rivalB
          : null;
    const leaderWins = leader ? Math.max(rivalry.aWins, rivalry.bWins) : null;
    const leaderHtml = leader
      ? `<div class="rival-leader"><span class="rival-leader-name">${leader}</span><span class="rival-leader-lbl">leads ${leaderWins}–${tot - leaderWins}</span></div>`
      : `<div class="rival-leader"><span class="rival-leader-lbl" style="color:var(--muted)">Series tied ${rivalry.aWins}–${rivalry.bWins}</span></div>`;

    // Current run within rivalry
    const chronoMeetings = [...rivalry.matches].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    let runCount = 0,
      runWinner = null;
    for (let i = chronoMeetings.length - 1; i >= 0; i--) {
      const m = chronoMeetings[i];
      const aWon =
        (m.teamA.includes(rivalA) && m.scoreA > m.scoreB) ||
        (m.teamB.includes(rivalA) && m.scoreB > m.scoreA);
      const w = aWon ? rivalA : rivalB;
      if (runWinner === null) {
        runWinner = w;
        runCount = 1;
      } else if (w === runWinner) runCount++;
      else break;
    }
    const runHtml =
      runCount >= 2
        ? `<div class="rival-run">🔥 <strong>${runWinner}</strong> has won the last <strong>${runCount}</strong> in this rivalry</div>`
        : "";

    // W/L dots (last 10, chronological left→right, from rivalA's perspective)
    const dotMeetings = chronoMeetings.slice(-10);
    const dots = dotMeetings
      .map((m) => {
        const aWon =
          (m.teamA.includes(rivalA) && m.scoreA > m.scoreB) ||
          (m.teamB.includes(rivalA) && m.scoreB > m.scoreA);
        return `<span class="rival-dot ${aWon ? "rival-dot-w" : "rival-dot-l"}" title="${aWon ? rivalA : rivalB} won ${m.scoreA}-${m.scoreB}"></span>`;
      })
      .join("");
    const dotsHtml = `<div class="rival-dots-row"><span class="rival-dots-name">${rivalA}</span><div class="rival-dots">${dots}</div><span class="rival-dots-name">${rivalB}</span></div>`;

    // Recent 5 matches
    const recent = [...rivalry.matches]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);
    const recentRows = recent
      .map((m) => {
        const aWon =
          (m.teamA.includes(rivalA) && m.scoreA > m.scoreB) ||
          (m.teamB.includes(rivalA) && m.scoreB > m.scoreA);
        const winScore = Math.max(m.scoreA, m.scoreB);
        const loseScore = Math.min(m.scoreA, m.scoreB);
        return `<div class="rival-match-row"><span class="rival-match-winner" style="color:${aWon ? "var(--green)" : "var(--red)"}">${aWon ? rivalA : rivalB} won</span><span class="rival-match-score">${winScore}–${loseScore} · ${fmtDate(m.date)}</span></div>`;
      })
      .join("");

    rivalHtml = `
      <div class="rivalry-header"><div class="rivalry-player">${rivalA}</div><div class="rivalry-vs">VS</div><div class="rivalry-player">${rivalB}</div></div>
      <div class="rivalry-record">
        <div class="rivalry-stat"><div class="rivalry-val p">${rivalry.aWins}</div><div class="rivalry-lbl">${aPct}%</div></div>
        <div class="rivalry-stat"><div class="rivalry-val m">${tot}</div><div class="rivalry-lbl">Meetings</div></div>
        <div class="rivalry-stat"><div class="rivalry-val n">${rivalry.bWins}</div><div class="rivalry-lbl">${bPct}%</div></div>
      </div>
      ${leaderHtml}
      ${dotsHtml}
      ${runHtml}
      <div class="rival-recent-title">Recent Meetings</div>
      ${recentRows}`;
  }

  // ── SESSIONS ───────────────────────────────────────────
  const sessHtml = sessions.length
    ? sessions
        .map(
          (s) =>
            `<div class="session-card"><div class="session-date">${fmtDate(s.date)}</div><div class="session-stats"><span>${s.matches.length} match${s.matches.length > 1 ? "es" : ""}</span><span>${s.players.length} players</span></div>${s.mvp ? `<div class="session-mvp">🏆 MVP: <strong>${s.mvp[0]}</strong> · ${s.mvp[1]}W</div>` : ""}<div class="session-players">${s.players.map((p) => `<span class="session-chip">${p}</span>`).join("")}</div></div>`,
        )
        .join("")
    : '<div class="sub" style="padding:8px">No sessions yet.</div>';

  // ── H2H DEEP DIVE ──────────────────────────────────────
  const opts = playersByMatches
    .map((p) => `<option value="${p}">${p.toUpperCase()}</option>`)
    .join("");
  const placeholder = `<option value="" disabled selected>Select player</option>`;
  const h2hHtml = `<div class="h2h-form"><div class="h2h-selects h2h-cascade-item"><select id="h2hP1" class="hist-select compact-select" style="flex:1">${placeholder}${opts}</select><span style="color:var(--muted);font-weight:700;font-size:12px;flex-shrink:0">VS</span><select id="h2hP2" class="hist-select compact-select" style="flex:1">${placeholder}${opts}</select></div><button class="btn-go h2h-cascade-item" style="width:100%;margin-top:8px" onclick="renderH2HDeepDive()">Compare</button></div><div id="h2h-result" style="margin-top:8px"></div>`;

  // ── ELO RANKINGS ───────────────────────────────────────
  const { from: wkFromElo } = lastWeekRange();
  const preWkEloMap = computeElo(
    allMatches.filter((m) => (m.date || "") < wkFromElo),
  );
  const eloRanked = Object.entries(eloMap).sort((a, b) => b[1] - a[1]);
  const preWkRanked = Object.entries(preWkEloMap).sort((a, b) => b[1] - a[1]);
  const maxEloVal = eloRanked[0]?.[1] || 1000;
  const minEloVal = eloRanked[eloRanked.length - 1]?.[1] || 1000;
  const eloRange = Math.max(1, maxEloVal - minEloVal);
  const eloPeaks = computeEloPeaks(allMatches);
  const eloHistoryAll = computeEloHistory(allMatches);
  const eloHtml = eloRanked.length
    ? `<div class="ana-card elo-leaderboard-card" style="padding:10px 12px">${eloRanked
        .map(([pname, ev], i) => {
          const change = ev - (preWkEloMap[pname] || 1000);
          const changeStr =
            change > 0
              ? `<span style="color:var(--green)">+${change}</span>`
              : change < 0
                ? `<span style="color:var(--red)">${change}</span>`
                : `<span style="color:var(--muted)">—</span>`;
          const preWkRankIdx = preWkRanked.findIndex(([n]) => n === pname);
          const rankChange = preWkRankIdx >= 0 ? (preWkRankIdx + 1) - (i + 1) : null;
          const rankArrow = rankChange === null ? "" : rankChange > 0
            ? `<span class="elo-rank-arrow elo-rank-up">▲${rankChange}</span>`
            : rankChange < 0
              ? `<span class="elo-rank-arrow elo-rank-down">▼${Math.abs(rankChange)}</span>`
              : `<span class="elo-rank-arrow elo-rank-same">—</span>`;
          const barW = Math.max(5, ((ev - minEloVal) / eloRange) * 100).toFixed(0);
          const col = ev >= 1100 ? "var(--green)" : ev <= 900 ? "var(--red)" : "var(--theme)";
          const peak = eloPeaks[pname] || ev;
          const fromPeak = ev - peak;
          const fromPeakStr = fromPeak === 0
            ? `<span style="color:var(--green);font-size:8px">▲ PEAK</span>`
            : `<span style="color:var(--red);font-size:8px">${fromPeak}</span>`;
          // Last 5 momentum dots
          const pts5 = (eloHistoryAll[pname] || []).slice(-5);
          const dots5 = pts5.map((pt) => `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${pt.won ? "var(--green)" : "var(--red)"};margin-right:1px"></span>`).join("");
          const momDeltas = pts5.map((pt) => pt.delta);
          const momAvg = momDeltas.length ? Math.round(momDeltas.reduce((s, d) => s + d, 0) / momDeltas.length) : 0;
          const momStr = momAvg > 0 ? `<span style="color:var(--green);font-size:8px">↑${momAvg}</span>` : momAvg < 0 ? `<span style="color:var(--red);font-size:8px">↓${Math.abs(momAvg)}</span>` : `<span style="color:var(--muted);font-size:8px">→</span>`;
          return `<div class="elo-row" style="gap:5px;align-items:center">
            <div class="elo-rank-col"><div class="elo-rank">#${i + 1}</div>${rankArrow}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pname}</div>
              <div class="elo-bar-wrap"><div class="elo-bar" style="width:${barW}%;background:${col};animation-delay:${(i * 0.07).toFixed(2)}s"></div></div>
            </div>
            <div style="flex-shrink:0;width:38px;text-align:right">
              <div class="elo-val">${ev}</div>
              <div class="elo-change" style="margin-top:2px">${changeStr}</div>
            </div>
            <div style="flex-shrink:0;width:50px;text-align:right;border-left:1px solid rgba(255,255,255,0.06);padding-left:5px">
              <div style="font-size:7px;color:var(--muted);letter-spacing:0.08em">PEAK</div>
              <div style="font-size:11px;font-weight:800">${peak}</div>
              <div style="margin-top:1px">${fromPeakStr}</div>
            </div>
            <div style="flex-shrink:0;width:44px;text-align:right;border-left:1px solid rgba(255,255,255,0.06);padding-left:5px">
              <div style="font-size:7px;color:var(--muted);letter-spacing:0.08em">L5</div>
              <div style="display:flex;justify-content:flex-end;gap:1px;margin:2px 0">${dots5}</div>
              <div>${momStr}</div>
            </div>
          </div>`;
        })
        .join("")}</div>`
    : '<div class="sub" style="padding:8px">No data yet.</div>';

  // ── ELO WIN PROBABILITY ────────────────────────────────
  const eloWinProbHtml = playersByMatches.length >= 2
    ? `<div class="ana-card" style="padding:10px 12px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:10px">Pick two players to see win probability based on current ELO ratings.</div>
        <div class="h2h-selects" style="margin-bottom:8px">
          <select id="eloProb-p1" class="hist-select compact-select" style="flex:1">${playersByMatches.map((p) => `<option value="${p}">${p.toUpperCase()}</option>`).join("")}</select>
          <span style="color:var(--muted);font-weight:700;font-size:12px;flex-shrink:0">VS</span>
          <select id="eloProb-p2" class="hist-select compact-select" style="flex:1">${playersByMatches.map((p, i) => `<option value="${p}"${i === 1 ? " selected" : ""}>${p.toUpperCase()}</option>`).join("")}</select>
        </div>
        <button class="btn-go" style="width:100%" onclick="calcEloWinProb()">CALCULATE</button>
        <div id="elo-prob-result" style="margin-top:4px"></div>
      </div>`
    : '<div class="sub" style="padding:8px">Need at least 2 players.</div>';

  // ── ELO VOLATILITY ─────────────────────────────────────
  const eloVolatilityHtml = (() => {
    const players = Object.keys(eloHistoryAll).filter((p) => eloHistoryAll[p].length >= 3);
    if (!players.length) return '<div class="sub" style="padding:8px">Need more matches.</div>';
    const rows = players.map((p) => {
      const deltas = eloHistoryAll[p].map((pt) => pt.delta);
      const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
      const stdDev = Math.sqrt(deltas.reduce((s, d) => s + Math.pow(d - mean, 2), 0) / deltas.length);
      return { name: p, stdDev, matches: deltas.length, avgDelta: mean };
    }).sort((a, b) => a.stdDev - b.stdDev);
    const maxStd = rows[rows.length - 1]?.stdDev || 1;
    return `<div class="ana-card" style="padding:10px 12px">
      <div style="font-size:9px;color:var(--muted);margin-bottom:10px">Lower deviation = more consistent ELO swings per match.</div>
      ${rows.map((r, i) => {
        const barW = Math.max(5, (r.stdDev / maxStd) * 100).toFixed(0);
        const label = r.stdDev < 10 ? "🪨 Rock" : r.stdDev < 14 ? "✅ Steady" : r.stdDev < 18 ? "⚡ Variable" : "🎲 Volatile";
        const avgStr = r.avgDelta > 0 ? `+${r.avgDelta.toFixed(1)}` : r.avgDelta.toFixed(1);
        const avgCol = r.avgDelta > 0 ? "var(--green)" : r.avgDelta < 0 ? "var(--red)" : "var(--muted)";
        return `<div class="elo-row">
          <div class="elo-rank">#${i + 1}</div>
          <div class="elo-name">${r.name}</div>
          <div class="elo-bar-wrap"><div class="elo-bar" style="width:${barW}%;background:var(--theme);opacity:0.7"></div></div>
          <div style="font-size:9px;color:var(--muted);min-width:26px;text-align:right">±${r.stdDev.toFixed(0)}</div>
          <div style="font-size:9px;min-width:30px;text-align:right;color:${avgCol}">${avgStr}</div>
          <div style="font-size:8px;color:var(--muted);min-width:56px;text-align:right">${label}</div>
        </div>`;
      }).join("")}
    </div>`;
  })();

  // ── PAIR CHEMISTRY MATRIX ──────────────────────────────
  const pairMatrixPlayers = [
    ...new Set(getPairStats(allMatches).flatMap((p) => p.players)),
  ].sort();
  const pairMatrixHtml = (() => {
    if (pairMatrixPlayers.length < 2)
      return '<div class="sub" style="padding:8px">Need more pair data.</div>';
    const pairLookup = {};
    getPairStats(allMatches).forEach((p) => {
      pairLookup[p.key] = p;
    });
    const colHeaders = pairMatrixPlayers
      .map((p) => `<th class="pvp-th" title="${p}">${getMatrixAlias(p)}</th>`)
      .join("");
    const rows = pairMatrixPlayers
      .map((rowP) => {
        const cells = pairMatrixPlayers
          .map((colP) => {
            if (rowP === colP) return `<td class="pvp-td pvp-self">·</td>`;
            const key = [rowP, colP].sort().join(" & ");
            const pair = pairLookup[key];
            if (!pair || pair.played < 2)
              return `<td class="pvp-td pvp-none">—</td>`;
            const pct = pair.winPct;
            const cls =
              pct > 60 ? "pvp-win" : pct < 40 ? "pvp-loss" : "pvp-even";
            return `<td class="pvp-td ${cls}" title="${getMatrixAlias(rowP)} & ${getMatrixAlias(colP)}: ${pair.wins}W–${pair.played - pair.wins}L">${pct}%</td>`;
          })
          .join("");
        return `<tr><td class="pvp-row-hdr" title="${rowP}">${getMatrixAlias(rowP)}</td>${cells}</tr>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:10px 8px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % as partners. — = fewer than 2 games together.</div><div class="pvp-wrap"><table class="pvp-table"><thead><tr><th class="pvp-corner"></th>${colHeaders}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  })();

  // ── MONTHLY AWARDS ─────────────────────────────────────
  const nowDate = new Date();
  const curMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;
  const monthlyMatchList = allMatches.filter((m) =>
    (m.date || "").startsWith(curMonth),
  );
  const monthlyAwardsHtml = (() => {
    if (monthlyMatchList.length < 2)
      return '<div class="sub" style="padding:8px">Not enough matches this month.</div>';
    const moEloNow = computeElo(allMatches);
    const moEloPre = computeElo(
      allMatches.filter((m) => !(m.date || "").startsWith(curMonth)),
    );
    const moStats = computeStats(monthlyMatchList);
    // Most Improved
    const moGains = moStats
      .map((p) => ({
        name: p.name,
        gain: (moEloNow[p.name] || 1000) - (moEloPre[p.name] || 1000),
      }))
      .sort((a, b) => b.gain - a.gain);
    const mostImproved = moGains[0];
    // Best Duo of Month
    const moPairs = getPairStats(monthlyMatchList)
      .filter((p) => p.played >= 2)
      .sort((a, b) => b.winPct - a.winPct);
    const bestDuoMonth = moPairs[0];
    // Most Consistent: lowest std dev of per-match game%
    const moConsistency = moStats
      .filter((p) => p.mp >= 3)
      .map((p) => {
        const playerMatches = monthlyMatchList.filter((m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
        );
        const gamePcts = playerMatches.map((m) => {
          const inA = (m.teamA || []).includes(p.name);
          const gw = inA ? m.scoreA : m.scoreB;
          const gl = inA ? m.scoreB : m.scoreA;
          return gw + gl > 0 ? gw / (gw + gl) : 0.5;
        });
        const mean = gamePcts.reduce((s, v) => s + v, 0) / gamePcts.length;
        const sd = Math.sqrt(
          gamePcts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
            gamePcts.length,
        );
        return { name: p.name, sd };
      })
      .sort((a, b) => a.sd - b.sd);
    const mostConsistent = moConsistency[0];
    // Most Feared: highest win% with ≥3 matches
    const mostFeared = moStats
      .filter((p) => p.mp >= 3)
      .sort((a, b) => b.winPct - a.winPct)[0];
    // Most Active
    const mostActiveMo = moStats.sort((a, b) => b.mp - a.mp)[0];
    return `<div class="awards-grid">${scard("📈", "Most Improved", mostImproved?.name, mostImproved ? `+${mostImproved.gain} ELO this month` : "—")}${scard("🤝", "Best Duo", bestDuoMonth ? bestDuoMonth.key : null, bestDuoMonth ? `${bestDuoMonth.winPct}% · ${bestDuoMonth.played}g` : "Need ≥2 games")}${scard("🎯", "Most Consistent", mostConsistent?.name, mostConsistent ? `${(mostConsistent.sd * 100).toFixed(1)}% std dev` : "Need ≥3 matches")}${scard("👹", "Most Feared", mostFeared?.name, mostFeared ? `${mostFeared.winPct.toFixed(0)}% win rate` : "Need ≥3 matches")}${scard("🔁", "Most Active", mostActiveMo?.name, mostActiveMo ? `${mostActiveMo.mp} matches this month` : "—")}</div>`;
  })();

  // ── PERSONAL BESTS ─────────────────────────────────────
  const personalBestsHtml = (() => {
    const pbStats = computeStats(allMatches).filter((p) => p.mp >= 3);
    if (!pbStats.length)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const rows = pbStats.map((p) => {
      const playerMs = sortedM.filter((m) =>
        [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
      );
      // Longest win streak ever = bestWinStreak from computeStats
      const longestWS = p.bestWinStreak;
      // Biggest win margin
      let biggestMargin = 0,
        biggestScore = "";
      playerMs.forEach((m) => {
        const inA = (m.teamA || []).includes(p.name);
        const own = inA ? m.scoreA : m.scoreB;
        const opp = inA ? m.scoreB : m.scoreA;
        if (own > opp && own - opp > biggestMargin) {
          biggestMargin = own - opp;
          biggestScore = `${own}-${opp}`;
        }
      });
      // Best session performance (most wins in one day)
      const byDate = {};
      playerMs.forEach((m) => {
        if (!m.date) return;
        if (!byDate[m.date]) byDate[m.date] = { wins: 0, played: 0 };
        byDate[m.date].played++;
        const inA = (m.teamA || []).includes(p.name);
        if ((inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA))
          byDate[m.date].wins++;
      });
      const bestDay = Object.values(byDate).sort(
        (a, b) => b.wins - a.wins || b.played - a.played,
      )[0];
      const mostMatchesDay = Object.entries(byDate).sort(
        (a, b) => b[1].played - a[1].played,
      )[0];
      let mostDayStr = "—";
      if (mostMatchesDay) {
        const [mdDate, mdData] = mostMatchesDay;
        const totalOnDay = sortedM.filter((m) => m.date === mdDate).length;
        mostDayStr = `${mdData.played}/${totalOnDay}`;
      }
      return `<div class="pb-row"><div class="pb-name">${p.name}</div><div class="pb-stat" title="Longest win streak">🔥${longestWS}W</div><div class="pb-stat" title="Biggest win">${biggestScore ? `💥${biggestScore}` : "—"}</div><div class="pb-stat" title="Best day wins">⭐${bestDay ? `${bestDay.wins}W/${bestDay.played}` : "—"}</div><div class="pb-stat" title="Most matches in a day">📅${mostDayStr}</div></div>`;
    });
    return `<div class="ana-card" style="padding:10px 12px"><div class="pb-header"><div class="pb-name">Player</div><div class="pb-stat">Best Streak</div><div class="pb-stat">Best Win</div><div class="pb-stat">Best Day</div><div class="pb-stat">Most/Day</div></div>${rows.join("")}</div>`;
  })();

  // ── SCORE PREDICTION ACCURACY ─────────────────────────
  const predAccHtml = (() => {
    if (allMatches.length < 5)
      return '<div class="sub" style="padding:8px">Need more matches.</div>';
    const sorted2 = [...allMatches].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    const runElo = {};
    let correct = 0,
      total = 0,
      upsets = 0;
    const byMonth = {};
    sorted2.forEach((m) => {
      const allP = [...(m.teamA || []), ...(m.teamB || [])];
      allP.forEach((p) => {
        if (!(p in runElo)) runElo[p] = 1000;
      });
      const avgA =
        m.teamA.reduce((s, p) => s + runElo[p], 0) /
        Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + runElo[p], 0) /
        Math.max(m.teamB.length, 1);
      const aFav = avgA >= avgB;
      const aWon = m.scoreA > m.scoreB;
      const predicted = aFav ? aWon : !aWon;
      if (predicted) correct++;
      else upsets++;
      total++;
      const mo = (m.date || "").slice(0, 7);
      if (mo) {
        if (!byMonth[mo]) byMonth[mo] = { c: 0, t: 0 };
        byMonth[mo].t++;
        if (predicted) byMonth[mo].c++;
      }
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        runElo[p] = (runElo[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        runElo[p] = (runElo[p] || 1000) + dB;
      });
    });
    const pct = Math.round((correct / total) * 100);
    const label =
      pct >= 70 ? "PREDICTABLE" : pct >= 55 ? "MODERATE" : "CHAOTIC";
    const col =
      pct >= 70 ? "var(--green)" : pct >= 55 ? "var(--gold)" : "var(--red)";
    const moHtml = Object.entries(byMonth)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([mo, d]) => {
        const mp = Math.round((d.c / d.t) * 100);
        const mc =
          mp >= 70 ? "var(--green)" : mp >= 55 ? "var(--gold)" : "var(--red)";
        const moName = [
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
        ][parseInt(mo.slice(5)) - 1];
        return `<div class="pred-mo-row"><span class="pred-mo-lbl">${moName} ${mo.slice(0, 4)}</span><div class="pred-mo-bar-wrap"><div class="pred-mo-bar" style="width:${mp}%;background:${mc}"></div></div><span class="pred-mo-pct" style="color:${mc}">${mp}%</span></div>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:28px;font-weight:900;color:${col};line-height:1">${pct}%</div>
          <div style="font-size:9px;color:var(--muted);margin-top:3px;letter-spacing:0.08em">${label}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text);font-weight:700">${correct}/${total} predicted correctly</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${upsets} upsets occurred</div>
        </div>
      </div>
      <div style="height:6px;border-radius:4px;background:rgba(255,255,255,0.07);margin-bottom:14px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:4px;transition:width 0.6s ease"></div>
      </div>
      <div style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.08em;margin-bottom:8px">BY MONTH</div>
      ${moHtml}
    </div>`;
  })();

  // ── MATCH SIMULATOR ────────────────────────────────────
  const simPlayers = computeStats(allMatches)
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b));
  const simOpts = (ph) =>
    `<option value="">${ph}</option>` +
    simPlayers.map((p) => `<option value="${p}">${p}</option>`).join("");
  const simulatorHtml = `
    <div class="ana-card sim-card">
      <div class="sim-teams">
        <div class="sim-team">
          <div class="sim-team-label" style="color:var(--green)">TEAM A</div>
          <select id="simA1" class="sim-sel">${simOpts("Player 1")}</select>
          <select id="simA2" class="sim-sel">${simOpts("Player 2")}</select>
        </div>
        <div class="sim-vs">VS</div>
        <div class="sim-team">
          <div class="sim-team-label" style="color:var(--red)">TEAM B</div>
          <select id="simB1" class="sim-sel">${simOpts("Player 1")}</select>
          <select id="simB2" class="sim-sel">${simOpts("Player 2")}</select>
        </div>
      </div>
      <button class="sim-btn" onclick="runMatchSimulator()">SIMULATE</button>
      <div id="sim-result"></div>
    </div>`;

  // ── MILESTONE HISTORY ──────────────────────────────────
  const milestoneLog = getMilestoneLog();
  const milestoneHtml = (() => {
    if (!milestoneLog.length)
      return '<div class="sub" style="padding:10px 8px">No milestones recorded yet.</div>';
    const rows = milestoneLog
      .map(
        (entry) =>
          `<div class="mlog-row">
        <span class="mlog-icon">${entry.emoji}</span>
        <span class="mlog-msg">${entry.msg}</span>
        <span class="mlog-date">${fmtDate(entry.date)}</span>
      </div>`,
      )
      .join("");
    return `<div class="ana-card mlog-card">${rows}</div>`;
  })();

  // ── RENDER ─────────────────────────────────────────────
  const makeSec = (key, title, body, col) => {
    return `<div class="ana-sec${col ? " collapsed" : ""}" data-key="${key}">
      <div class="ana-section-title ana-sec-hdr" onclick="toggleAnaSection('${key}')">
        <span class="ana-sec-drag-handle"
          onpointerdown="anaHandlePointerDown(event,'${key}')"
          onclick="event.stopPropagation()">⠿</span>
        <span class="ana-sec-chev"></span>
        <span class="ana-sec-title-txt">${title}</span>
      </div>
      <div class="ana-sec-body">${body}</div>
    </div>`;
  };

  const allSecs = [
    { key: "predacc", title: "🔮 Prediction Accuracy", body: predAccHtml },
    { key: "simulator", title: "🎮 Match Simulator", body: simulatorHtml },
    {
      key: "pvp",
      title: "⚔️ Player vs Player Matrix",
      body: `<div class="ana-card" style="padding:10px 8px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % of <strong style="color:var(--accent)">row</strong> vs column. — = never met.</div>${matrixHtml}</div>`,
    },
    {
      key: "awards",
      title: "🏅 Awards Board",
      body: `<div class="awards-grid">${scard("🏃", "Most Active", mostActive?.name, `${mostActive?.matches || 0} matches played`)}${awardsHtml}${scard("🏆", "Best Win Rate", topWinRate?.name, `${topWinRate ? Math.round((topWinRate.wins / topWinRate.matches) * 100) : 0}% (${topWinRate?.wins || 0}W–${topWinRate?.losses || 0}L)`)}${scard("🔥", "Longest Streak", topStreak?.name, `${topStreak?.bestStreak || 0} consecutive wins`)}${scard("⚔️", "Most Dominant", destroyer?.name, `+${destroyer?.avgMargin?.toFixed(1) || 0} avg margin`)}</div>`,
    },
    {
      key: "form",
      title: "⚡ Current Form",
      body: `<div class="ana-card" style="padding:8px 12px"><div class="ftable-header"><span>#</span><span>Player</span><span>Last 10</span><span>Win%</span></div>${ftHtml}</div>`,
    },
    {
      key: "lrace",
      title: "🏎️ Leaderboard Race",
      body: `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header"><span>Rank</span><span>Player</span><span>Last Wk.</span><span>Trend</span></div>${lrHtml}</div>`,
    },
    {
      key: "clutchrank",
      title: "🎯 Clutch Rankings",
      body: `<div class="ana-card" style="padding:8px 12px">${clutchRankHtml}</div>`,
    },
    {
      key: "consistency",
      title: "📐 Consistency Rankings",
      body: `<div class="ana-card" style="padding:8px 12px">${consistencyRankHtml}</div>`,
    },
    {
      key: "qualitywins",
      title: "💎 Quality Wins",
      body: `<div class="ana-card" style="padding:8px 12px">${qualityRankHtml}</div>`,
    },
    ...(uniqueMonths.length >= 2
      ? [
          {
            key: "winrate",
            title: "📈 Win Rate Over Time",
            body: `<div class="ana-card">${winChartHtml}</div>`,
          },
        ]
      : []),
    {
      key: "heatmap",
      title: "📅 Activity Heatmap",
      body: `<div class="ana-card">${heatHtml}</div>`,
    },
    {
      key: "score",
      title: "📊 Score Distribution",
      body: `<div class="ana-card">${sdHtml}</div>`,
    },
    {
      key: "insights",
      title: "🎯 Match Insights",
      body: `<div style="font-size:10px;font-weight:700;color:var(--muted);margin:6px 0 4px;letter-spacing:0.06em">CLOSEST MATCHES</div>${cmHtml}<div style="font-size:10px;font-weight:700;color:var(--muted);margin:10px 0 4px;letter-spacing:0.06em">BIGGEST UPSETS</div>${upHtml}`,
    },
    {
      key: "partnership",
      title: "🤝 Partnership Analytics",
      body: `<div style="font-size:10px;font-weight:700;color:var(--muted);margin:6px 0 4px;letter-spacing:0.06em">CHEMISTRY RANKINGS</div><div class="ana-card" style="padding:10px 12px">${chemHtml}</div><div style="font-size:10px;font-weight:700;color:var(--muted);margin:10px 0 4px;letter-spacing:0.06em">BEST PARTNER PER PLAYER</div><div class="ana-card" style="padding:10px 12px">${bpHtml}</div><div style="font-size:10px;font-weight:700;color:var(--muted);margin:10px 0 4px;letter-spacing:0.06em">SYNERGY DELTA (vs solo avg)</div><div class="ana-card" style="padding:10px 12px"><div style="font-size:9px;color:var(--muted);margin-bottom:6px">How much win% changes when paired with each partner</div>${synergyHtml}</div><div style="font-size:10px;font-weight:700;color:var(--muted);margin:10px 0 4px;letter-spacing:0.06em">PAIR RECENT FORM</div><div class="ana-card" style="padding:10px 12px">${pfHtml}</div>`,
    },
    {
      key: "rivalry",
      title: "🔥 Rivalry Spotlight",
      body: `<div class="ana-card">${rivalHtml}</div>`,
    },
    { key: "session", title: "📋 Session Stats", body: sessHtml },
    {
      key: "shutout",
      title: "🎯 Shutout Records",
      body: `<div class="awards-grid">${scard("🚫", "Most Shutout Wins", mostShutoutWinsEntry?.[0], `${mostShutoutWinsEntry?.[1] || 0} games won X-0`)}${scard("💔", "Most Shutout Losses", mostShutoutLosses.length ? mostShutoutLosses.join(" & ") : null, `${maxLosses} games lost 0-X`)}</div>`,
    },
    {
      key: "pairs",
      title: "🤝 All Pairs",
      body: `<div class="ana-card" style="padding:10px 12px">${allPairsHtml}</div>`,
    },
    {
      key: "pairedh2h",
      title: "⚔️ Paired H2H Records",
      body: `<div class="ana-card" style="padding:8px 12px">${pairedH2HHtml}</div>`,
    },
    { key: "h2hDive", title: "⚔️ H2H Deep Dive", body: h2hHtml },
    { key: "elo", title: "⚡ ELO Rankings", body: eloHtml },
    { key: "eloTimeline", title: "📈 ELO History Chart", body: buildEloTimelineHtml("all") },
    { key: "eloWinProb", title: "🎯 ELO Win Probability", body: eloWinProbHtml },
    { key: "eloVolatility", title: "📊 ELO Volatility / Consistency", body: eloVolatilityHtml },
    {
      key: "pairmatrix",
      title: "🧪 Pair Chemistry Matrix",
      body: pairMatrixHtml,
    },
    {
      key: "monthlyawards",
      title: "🏆 Monthly Awards",
      body: monthlyAwardsHtml,
    },
    {
      key: "personalbests",
      title: "🏅 Personal Bests",
      body: personalBestsHtml,
    },
    { key: "milestones", title: "🎖️ Milestone History", body: milestoneHtml },
    {
      key: "calendar",
      title: "📅 Match Calendar",
      body: `<div id="match-calendar" class="match-calendar"></div>`,
    },
  ];

  const storedOrder = getAnaOrder();
  const validKeys = allSecs.map((s) => s.key);
  const orderedKeys = [
    ...storedOrder.filter((k) => validKeys.includes(k)),
    ...validKeys.filter((k) => !storedOrder.includes(k)),
  ];
  const collapsed = getAnaCollapsed();

  const searchBarHtml = `<div class="ana-search-wrap">
    <div class="ana-search-box">
      <svg class="ana-search-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7.5"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
      </svg>
      <input type="text" id="ana-search-input" class="ana-search-input"
        placeholder="SEARCH SECTIONS OR PLAYERS"
        oninput="anaSearchInput(this.value)"
        onblur="setTimeout(anaSearchClose, 160)"
        autocomplete="off" spellcheck="false">
      <button id="ana-search-clear" class="ana-search-clear" onclick="anaSearchClear()" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="9" height="9"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div id="ana-search-results" class="ana-search-results" style="display:none"></div>
  </div>`;

  container.innerHTML = searchBarHtml + orderedKeys
    .map((key) => {
      const def = allSecs.find((s) => s.key === key);
      if (!def) return "";
      return makeSec(key, def.title, def.body, collapsed.has(key));
    })
    .join("");

  if (!collapsed.has("calendar"))
    requestAnimationFrame(() => renderMatchCalendar());

  // Animate cards and section titles as they scroll into view
  const anaObserver = new IntersectionObserver(
    (entries) => {
      let stagger = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.animationDelay = `${stagger * 60}ms`;
        el.classList.add(
          el.classList.contains("ana-section-title")
            ? "section-anim"
            : "card-anim",
        );
        stagger++;
        anaObserver.unobserve(el);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -20px 0px" },
  );

  container
    .querySelectorAll(
      ".ana-card, .award-card, .awards-grid, .ana-section-title, .pair-stats-card, .h2h-cascade-item",
    )
    .forEach((el) => {
      el.style.opacity = "0";
      anaObserver.observe(el);
    });
}

// Keep showAnalytics as alias for backward compat
function showAnalytics() {
  switchMainTab("analytics");
}

// ── EMAIL BACKUP ───────────────────────────────────────────
const emailConfig = {
  recipientEmail: "ankit.konchady@gmail.com",
  serviceId: "ekta_padel_service_id",
  templateId: "ekta_padel_template_id",
  publicKey: "_DebI6XI8p5DhoR4F",
};
let _emailTimer = null;

function renderEmailStatus() {
  const el = document.getElementById("email-status");
  if (!el) return;
  const last = localStorage.getItem("padel_last_email");
  const today = new Date().toISOString().split("T")[0];
  const sentText =
    last === today
      ? "✅ Sent today"
      : last
        ? `Last sent: ${last}`
        : "Never sent";
  el.innerHTML = `${sentText} &nbsp;·&nbsp; Auto-sends daily at 1 pm`;
}

async function sendBackupEmail(isAuto = false) {
  if (typeof emailjs === "undefined") {
    if (!isAuto) showToast("EmailJS not loaded", "❌");
    return false;
  }
  const { serviceId, templateId, publicKey, recipientEmail } = emailConfig;
  if (!serviceId || !templateId || !publicKey || !recipientEmail) {
    if (!isAuto) showToast("Complete email config first", "⚠️");
    return false;
  }
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const jsonData = JSON.stringify({ allMatches, aliasMap, nameMap }, null, 2);

    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: recipientEmail,
        from_name: "Ekta Padel",
        subject: `Padel Backup — ${todayStr}`,
        send_type: isAuto ? "🤖 Automatic daily backup" : "📤 Manual backup",
        match_count: allMatches.length,
        backup_date: todayStr,
        json_data: jsonData,
      },
      publicKey,
    );

    localStorage.setItem("padel_last_email", todayStr);
    renderEmailStatus();
    if (!isAuto) showToast("Backup email sent!", "📧");
    return true;
  } catch (err) {
    console.error("Backup email error:", err);
    if (!isAuto) showToast("Email failed — check config", "❌");
    return false;
  }
}

function scheduleAutoEmail() {
  if (_emailTimer) {
    clearTimeout(_emailTimer);
    _emailTimer = null;
  }
  if (!emailConfig.serviceId || !emailConfig.recipientEmail) return;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const target = new Date(now);
  target.setHours(13, 0, 0, 0);

  if (localStorage.getItem("padel_last_email") !== today && now >= target) {
    localStorage.setItem("padel_last_email", today); // claim slot before async to prevent multi-tab race
    sendBackupEmail(true).then((ok) => {
      if (!ok) localStorage.removeItem("padel_last_email"); // release on failure so it can retry
      scheduleAutoEmail();
    });
    return;
  }

  if (localStorage.getItem("padel_last_email") === today) {
    target.setDate(target.getDate() + 1);
  }

  _emailTimer = setTimeout(() => {
    sendBackupEmail(true).then(() => scheduleAutoEmail());
  }, target - now);
}

// ── INIT ───────────────────────────────────────────────────
// loadCloudData() orchestrates: cache-first render → Firestore refresh.
// renderHome/renderCompact are called inside it after data is ready.
renderNamesTable();
loadCloudData();
loadScheduledMatches();
scheduleAutoEmail();

// Expose globals
Object.assign(window, {
  goTo,
  goBack,
  switchMainTab,
  switchITab,
  filterMatchTab,
  applyRange,
  onCmpFilter,
  addMatches,
  saveNames,
  loadNames,
  clearMatches,
  clearNames,
  sendBackupEmail,
  exportData,
  exportCSV,
  setAbsenceThreshold,
  renderHome,
  renderCompact,
  setCmpSort,
  renderModernMatches,
  setHistPlayerFilter,
  setHistOutcome,
  setHistMargin,
  setHistPairFilter,
  setHistScorelineFilter,
  setHistSeasonFilter,
  applyHeadToHeadFilter,
  onHeadToHeadInput,
  clearHeadToHeadPlayer,
  clearHeadToHeadFilter,
  populateHistoryPlayerChips,
  populateHistoryAdvancedFilters,
  renderAddMatches,
  refreshManage,
  deleteMatchByIndex,
  editMatchByIndex,
  saveMatchEdit,
  closeMatchEdit,
  openModernAddModal,
  closeModernAddModal,
  saveModernMatch,
  showAnalytics,
  renderAnalyticsPage,
  toggleAnaSection,
  anaHandlePointerDown,
  populatePlayerDropdowns,
  renderNamesTable,
  editNameEntry,
  importData,
  openFabModal,
  openNameAddModal,
  closeNameAddModal,
  saveQuickName,
  previewMatchImport,
  undoLastAdd,
  computeElo,
  computeBadges,
  openPlayerDetail,
  openPairDetail,
  openH2HDetail,
  onHomeFilterChange,
  prefillMatchTADate,
  renderH2HDeepDive,
  selectEloTLPlayer,
  filterEloTimeline,
  showEloMatchDetail,
  calcEloWinProb,
  anaSearchInput,
  anaSearchSelect,
  anaSearchClose,
  anaSearchClear,
  setHistoryDateFilter,
  openPlayerCompare,
  renderCompareSelector,
  triggerCompare,
  playerAvatar,
  playerColor,
  playerInitials,
  openShareCard,
  openWeeklyDigest,
  openSummaryScreenshot,
  closeSnapshot,
  openScheduleModal,
  closeScheduleModal,
  saveScheduled,
  deleteScheduled,
  quickRematch,
  runMatchSimulator,
  toggleMatchCalendar,
  toggleMatchesSection,
  calNav,
  calDayClick,
  showToast,
  toggleHamburgerMenu,
  openMatchIntro,
  closeMatchIntro,
});

function setHistoryDateFilter(value) {
  filterMatchTab(value || "all");
}

function isMatchWithinDateFilter(match, filterValue) {
  if (!filterValue || filterValue === "all") return true;

  const now = new Date();
  const matchDate = new Date(match.date || match.createdAt || Date.now());

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  if (filterValue === "today") {
    return matchDate >= startOfToday;
  }

  if (filterValue === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return matchDate >= weekAgo;
  }

  if (filterValue === "weekend") {
    const day = matchDate.getDay();
    return day === 0 || day === 6;
  }

  if (filterValue === "month") {
    return (
      matchDate.getMonth() === now.getMonth() &&
      matchDate.getFullYear() === now.getFullYear()
    );
  }

  if (filterValue === "lastweek") {
    const lwr = lastWeekRange();
    return match.date >= lwr.from && match.date <= lwr.to;
  }

  return true;
}

// ── MATCH INTRO OVERLAY ────────────────────────────────────
function openMatchIntro(idx) {
  const m = allMatches[idx];
  if (!m) return;

  const priorElo = computeElo(allMatches.slice(0, idx));
  const afterElo  = computeElo(allMatches.slice(0, idx + 1));
  const aWon = m.scoreA > m.scoreB;

  // Pre-match individual and pair ranks
  const indivRanked = Object.entries(priorElo).sort((a, b) => b[1] - a[1]);
  const allPairs    = getPairStats();
  const pairsByElo  = allPairs
    .map((p) => ({ key: p.key, avg: p.players.reduce((s, n) => s + (priorElo[n] || 1000), 0) / p.players.length }))
    .sort((a, b) => b.avg - a.avg);

  const mkRankLabel = (players) => {
    if (players.length >= 2) {
      const key = getPairKey(players);
      const i   = pairsByElo.findIndex((p) => p.key === key);
      return i >= 0 ? `PAIR #${i + 1}` : "";
    }
    const i = indivRanked.findIndex(([n]) => n === players[0]);
    return i >= 0 ? `#${i + 1}` : "";
  };

  const avgElo = (players) =>
    Math.round(players.reduce((s, p) => s + (priorElo[p] || 1000), 0) / Math.max(players.length, 1));

  const nameA = m.teamA.map((p) => normPlayer(p)).join(" & ");
  const nameB = m.teamB.map((p) => normPlayer(p)).join(" & ");

  document.getElementById("mio-date-bar").textContent = fmtDate(m.date).toUpperCase();

  const rankA = mkRankLabel(m.teamA);
  const rankB = mkRankLabel(m.teamB);
  const rankAEl = document.getElementById("mio-rank-a");
  const rankBEl = document.getElementById("mio-rank-b");
  rankAEl.textContent = rankA;
  rankAEl.style.visibility = rankA ? "visible" : "hidden";
  rankBEl.textContent = rankB;
  rankBEl.style.visibility = rankB ? "visible" : "hidden";

  document.getElementById("mio-name-a").innerHTML = nameA.replace(" & ", "<br>& ");
  document.getElementById("mio-name-b").innerHTML = nameB.replace(" & ", "<br>& ");
  document.getElementById("mio-elo-a").textContent = `ELO ${avgElo(m.teamA)}`;
  document.getElementById("mio-elo-b").textContent = `ELO ${avgElo(m.teamB)}`;

  const scoreAEl = document.getElementById("mio-score-a");
  const scoreBEl = document.getElementById("mio-score-b");
  scoreAEl.textContent = "0";
  scoreBEl.textContent = "0";
  scoreAEl.className = "mio-score-num" + (aWon ? " win" : "");
  scoreBEl.className = "mio-score-num" + (!aWon ? " win" : "");

  const winner = aWon ? nameA : nameB;
  document.getElementById("mio-result-line").textContent = `${winner.toUpperCase()} WIN`;

  // ELO delta pills
  const deltaPills = [...m.teamA, ...m.teamB]
    .map((p) => {
      const delta = (afterElo[p] || 1000) - (priorElo[p] || 1000);
      const sign = delta >= 0 ? "+" : "";
      const cls  = delta >= 0 ? "gain" : "loss";
      return `<span class="mio-delta-pill ${cls}">${normPlayer(p)} ${sign}${delta}</span>`;
    })
    .join("");
  document.getElementById("mio-elo-deltas").innerHTML = deltaPills;

  // Event badges
  const badges = [];
  if (isFireMatch(m))       badges.push(`<span class="event-badge fire">🔥 FIRE</span>`);
  if (isDominatingMatch(m)) badges.push(`<span class="event-badge dominate">💀 DOMINATING</span>`);
  if (isZeroMatch(m))       badges.push(`<span class="event-badge zero">😂 ZERO</span>`);
  document.getElementById("mio-badges").innerHTML = badges.join("");

  // Show overlay
  const overlay = document.getElementById("match-intro-overlay");
  overlay.classList.remove("active");
  void overlay.offsetWidth;
  overlay.classList.add("active");

  // Animate scores in after panels slide in
  const animScore = (el, final, delay) =>
    setTimeout(() => {
      let cur = 0;
      const tick = () => {
        cur = Math.min(cur + 1, final);
        el.textContent = cur;
        if (cur < final) setTimeout(tick, 110);
      };
      tick();
    }, delay);
  animScore(scoreAEl, m.scoreA, 480);
  animScore(scoreBEl, m.scoreB, 480);
}

function closeMatchIntro() {
  document.getElementById("match-intro-overlay").classList.remove("active");
}

// Delegated click: tap any match card (not admin buttons) to open intro
document.addEventListener("click", (e) => {
  const card = e.target.closest(".match-card");
  if (!card) return;
  if (e.target.closest("button, .swipe-delete-reveal")) return;
  const idx = parseInt(card.dataset.matchIdx, 10);
  if (!isNaN(idx)) openMatchIntro(idx);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMatchIntro();
});
