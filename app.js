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

// ── STATE ──────────────────────────────────────────────────
let allMatches = [];
let nameMap = {};
let aliasMap = {};
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
let prevPage = "home";
let lastMatchSnapshot = null;
window.isAdmin = false;

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
  if (id === "manage") refreshManage();
  if (id === "names") renderNamesTable();
  if (id === "matches") prefillMatchTADate();
}

function refreshManage() {
  const days = new Set(allMatches.map((m) => m.date)).size;
  document.getElementById("manageInfo").innerHTML =
    `Matches: <strong>${allMatches.length}</strong><br>Days: <strong>${days}</strong><br>Players mapped: <strong>${Object.keys(aliasMap).length}</strong>`;
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
  const d = new Date(), day = d.getDay();
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
      if (from && m.date < from) return false;
      if (to && m.date > to) return false;
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
      const sr = (p.name in eloMap) ? eloToSr(eloMap[p.name]) : mwr * 5 + gwr * 3 + act * 2;

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
        if (pct > bestPPct) {
          bestPPct = pct;
          bestPartner = { name: partner, pct, played };
        }
        if (pct < worstPPct) {
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
  const stats = computeStats(allMatches, computeElo(allMatches)).find((p) => p.name === name);
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
    lastMatchSnapshot = [...allMatches];
    allMatches.push(...parsed);
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

  const THRESHOLD = 7; // days
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
    const s = computeStats(window, computeElo(window)).find((p) => p.name === playerName);
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
      const summaryHtml = buildHistorySummary(filtered);
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
        buildHistorySummary(filtered);
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
      const teamARaw = (m.teamA || []).join(" & ");
      const teamBRaw = (m.teamB || []).join(" & ");
      // Add 😭 to whichever team lost with 0 games
      const teamALabel = aZero && bWon ? teamARaw + " 😭" : teamARaw;
      const teamBLabel = bZero && aWon ? teamBRaw + " 😭" : teamBRaw;

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
      const total = m.scoreA + m.scoreB || 1;
      const winnerScore = Math.max(m.scoreA, m.scoreB);
      const momentumPct = Math.round((winnerScore / total) * 100);
      const momentumSide = aWon ? teamALabel : teamBLabel;

      return `
              <div class="match-card${isFire ? " fire-card" : ""}${isDominating ? " dominate-card" : ""}${isZero ? " zero-card" : ""}" style="animation-delay: ${delay}s;">
                <div class="match-top">
                  <span class="match-date">📅 ${fmtDate(m.date)}</span>
                  <span class="match-tag">${diff} game${diff === 1 ? "" : "s"} gap</span>
                </div>
                <div class="match-score-row" style="margin-top:10px">
                  <div class="team-block">
                    <div class="team-name ${aWon ? "winner" : ""}">${aWon ? "👑 " : ""}${teamALabel}</div>
                    <div class="team-score ${aWon ? "win" : ""}">${m.scoreA}</div>
                  </div>
                  <div class="vs-text">VS</div>
                  <div class="team-block">
                    <div class="team-name ${bWon ? "winner" : ""}">${bWon ? "👑 " : ""}${teamBLabel}</div>
                    <div class="team-score ${bWon ? "win" : ""}">${m.scoreB}</div>
                  </div>
                </div>
                ${badges.length ? `<div class="match-event-strip">${badges.join("")}</div>` : ""}
                <div class="match-card-momentum">
                  <div class="momentum-label"><span>${momentumSide.toUpperCase()} Momentum</span><span>${momentumPct}%</span></div>
                  <div class="momentum-bar"><div class="momentum-fill" style="width:${momentumPct}%"></div></div>
                </div>
                <div class="match-footer" style="margin-top:10px">
                  ${
                    showAdmin && window.isAdmin
                      ? `<div class="match-actions">
                    <button class="action-btn edit-btn" onclick="editMatchByIndex(${realIdx})">✏ Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteMatchByIndex(${realIdx})">🗑 Del</button>
                  </div>`
                      : `<div></div>`
                  }
                </div>
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
  if (f === "range") dr.classList.add("show");
  else dr.classList.remove("show");
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
                  <div class="motd-score win">${wScore}</div>
                </div>
                <div class="motd-vs">VS</div>
                <div class="motd-team">
                  <div class="motd-name">${loser}</div>
                  <div class="motd-score">${lScore}</div>
                </div>
              </div>
              <div class="motd-sub">${motdSub}</div>
            </div>`;

  // ── BIGGEST UPSET: lower-ranked pair beats higher-ranked pair ──
  let upsetHtml = "";
  const priorStats = computeStats(
    allMatches.filter((m) => m.date < latestDate),
  );
  if (priorStats.length >= 2) {
    const rankMap = {};
    priorStats.forEach((p, i) => {
      rankMap[p.name] = i + 1;
    });

    let bestUpset = null,
      bestGap = 0;
    sessionMatches.forEach((m) => {
      const winTeam = m.scoreA > m.scoreB ? m.teamA : m.teamB;
      const loseTeam = m.scoreA > m.scoreB ? m.teamB : m.teamA;
      const winRanks = winTeam.map((p) => rankMap[p]).filter((r) => r != null);
      const loseRanks = loseTeam
        .map((p) => rankMap[p])
        .filter((r) => r != null);
      if (!winRanks.length || !loseRanks.length) return;
      const avgWin = winRanks.reduce((a, b) => a + b, 0) / winRanks.length;
      const avgLose = loseRanks.reduce((a, b) => a + b, 0) / loseRanks.length;
      // Upset = winner had a worse (higher number) rank than loser
      const gap = avgWin - avgLose;
      if (gap > 0 && gap > bestGap) {
        bestGap = gap;
        bestUpset = {
          m,
          winTeam,
          loseTeam,
          avgWin: Math.round(avgWin),
          avgLose: Math.round(avgLose),
        };
      }
    });

    if (bestUpset) {
      const { m: um, winTeam, loseTeam, avgWin, avgLose } = bestUpset;
      const uWin = um.scoreA > um.scoreB ? um.scoreA : um.scoreB;
      const uLose = um.scoreA > um.scoreB ? um.scoreB : um.scoreA;
      upsetHtml = `<div class="motd-card upset-card">
                  <div class="motd-header">
                    <span class="motd-label upset-label">🚨 BIGGEST UPSET</span>
                    <span class="motd-date">📅 ${fmtDate(latestDate)}</span>
                  </div>
                  <div class="motd-teams">
                    <div class="motd-team winner">
                      <div class="motd-name">👑 ${winTeam.join(" & ")}</div>
                      <div class="motd-score win">${uWin}</div>
                      <div class="upset-rank">Ranked #${avgWin}</div>
                    </div>
                    <div class="motd-vs">VS</div>
                    <div class="motd-team">
                      <div class="motd-name">${loseTeam.join(" & ")}</div>
                      <div class="motd-score">${uLose}</div>
                      <div class="upset-rank">#${avgLose} expected to win</div>
                    </div>
                  </div>
                  <div class="motd-sub">Lower-ranked team pulled off a shock win 😤</div>
                </div>`;
    }
  }

  return motdHtml + upsetHtml;
}

// ── SESSION SUMMARY CARD ───────────────────────────────────
function buildSessionSummary() {
  if (!allMatches.length) return "";
  const latestDate = allMatches.reduce(
    (max, m) => (m.date > max ? m.date : max),
    "",
  );
  const sessionMatches = allMatches.filter((m) => m.date === latestDate);
  if (!sessionMatches.length) return "";

  const playerSet = new Set();
  sessionMatches.forEach((m) => {
    [...m.teamA, ...m.teamB].forEach((p) => playerSet.add(p));
  });
  const totalGames = sessionMatches.reduce(
    (s, m) => s + m.scoreA + m.scoreB,
    0,
  );

  // Top performer: best win rate in session, tie-break by game diff
  const sessionStats = computeStats(sessionMatches);
  const top = sessionStats[0];

  // Man of the Match: most wins in session; tie-break by game diff
  const motmWins = {}, motmDiff = {};
  sessionMatches.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    const margin = m.scoreA - m.scoreB;
    [...(m.teamA || [])].forEach((p) => {
      motmWins[p] = (motmWins[p] || 0) + (aWon ? 1 : 0);
      motmDiff[p] = (motmDiff[p] || 0) + margin;
    });
    [...(m.teamB || [])].forEach((p) => {
      motmWins[p] = (motmWins[p] || 0) + (aWon ? 0 : 1);
      motmDiff[p] = (motmDiff[p] || 0) - margin;
    });
  });
  const motmPlayer = Object.keys(motmWins).sort((a, b) => (motmWins[b] - motmWins[a]) || (motmDiff[b] - motmDiff[a]))[0];
  const motmHtml = motmPlayer
    ? `<div class="ss-motm">🏅 MOTM: <strong>${motmPlayer}</strong> (${motmWins[motmPlayer]}w ${motmDiff[motmPlayer] >= 0 ? "+" : ""}${motmDiff[motmPlayer]}d)</div>`
    : "";

  // Closest game
  const closest = [...sessionMatches].sort(
    (a, b) => Math.abs(a.scoreA - a.scoreB) - Math.abs(b.scoreA - b.scoreB),
  )[0];
  const closestScore = `${Math.max(closest.scoreA, closest.scoreB)}-${Math.min(closest.scoreA, closest.scoreB)}`;

  // Format date nicely
  const dateLabel = fmtDate(latestDate);

  return `<div class="session-summary-card">
              <div class="ss-header">
                <span class="ss-label">📋 SESSION RECAP</span>
                <span class="ss-date">${dateLabel}</span>
              </div>
              <div class="ss-stats">
                <div class="ss-stat">
                  <div class="ss-val">${sessionMatches.length}</div>
                  <div class="ss-lbl">Matches</div>
                </div>
                <div class="ss-stat">
                  <div class="ss-val">${playerSet.size}</div>
                  <div class="ss-lbl">Players</div>
                </div>
                <div class="ss-stat">
                  <div class="ss-val">${totalGames}</div>
                  <div class="ss-lbl">Total Games</div>
                </div>
                <div class="ss-stat">
                  <div class="ss-val">${closestScore}</div>
                  <div class="ss-lbl">Closest Score</div>
                </div>
              </div>
              ${motmHtml}
              ${
                top
                  ? `<div class="ss-top">
                <span class="ss-top-label">⭐ Top Performer</span>
                <span class="ss-top-name">${top.name}</span>
                <span class="ss-top-rec">${top.mw}W–${top.ml}L &nbsp;·&nbsp; ${top.winPct.toFixed(0)}% win rate</span>
              </div>`
                  : ""
              }
            </div>`;
}

function buildHistorySummary(matches) {
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
  const d = () => { const v = delay; delay += 65; return v; };
  const podiumHtml = top3
    .map(
      (p, i) =>
        `<div class="hsum-row hsum-cascade" style="animation-delay:${d()}ms">
            <span class="hsum-medal">${medals[i]}</span>
            <span class="hsum-pname">${p.name}</span>
            <span class="hsum-rec">${p.mw}W–${p.ml}L</span>
            <span class="hsum-pct" style="color:${medalColors[i]}">${p.winPct.toFixed(0)}%</span>
            <span class="hsum-sr">${p.sr.toFixed(2)}/10 SR</span>
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
          ${top3.length ? `<div class="hsum-section-lbl">Top Performers</div><div class="hsum-podium">${podiumHtml}</div>` : ""}
          ${highlights.length ? `<div class="hsum-section-lbl">AWARDS</div><div class="hsum-highlights">${highlights.join("")}</div>` : ""}
        </div>`;
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
    histPlayerFilter ||
    histPairFilter ||
    histOutcomeFilter !== "all" ||
    histMarginFilter !== "all" ||
    histScorelineFilter ||
    histSeasonFilter ||
    h2hFilterA ||
    h2hFilterB;
  const motdHtml = isFiltered ? "" : buildMatchOfTheDay();
  const sessionSummaryHtml = isFiltered ? "" : buildSessionSummary();
  const histList = document.getElementById("modern-match-list");
  histList.innerHTML = "";

  // Parse all content into a temp container
  const tmpAll = document.createElement("div");
  tmpAll.innerHTML =
    sessionSummaryHtml + motdHtml + summary + buildMatchCards(matches, true);

  // Collect feature cards first, then match cards
  const featureCards = Array.from(
    tmpAll.querySelectorAll(
      ".session-summary-card, .motd-card, .upset-card, .thriller-card, .pair-stats-card",
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
    }, i * 100);
  });

  if (instant.length) {
    setTimeout(() => {
      instant.forEach((el) => {
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
  document.getElementById("add-match-list").innerHTML = buildMatchCards(
    matches,
    true,
  );
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
function editMatchByIndex(i) {
  const m = allMatches[i];
  const a = prompt("Team A score", m.scoreA);
  if (a === null) return;
  const b = prompt("Team B score", m.scoreB);
  if (b === null) return;
  const sa = parseInt(a),
    sb = parseInt(b);
  if (isNaN(sa) || isNaN(sb) || sa === sb) {
    alert("Invalid scores");
    return;
  }
  m.scoreA = sa;
  m.scoreB = sb;
  saveCloudData();
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
function closeModernAddModal() {
  document.getElementById("modern-add-modal").classList.remove("show");
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
  if (!p1a || !p2a || !p1b || !p2b || isNaN(sA) || isNaN(sB) || sA === sB) {
    alert("Invalid match data");
    return;
  }
  const teamA = [p1a, p2a];
  const teamB = [p1b, p2b];
  lastMatchSnapshot = [...allMatches];
  allMatches.push({ teamA, teamB, scoreA: sA, scoreB: sB, date });
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

  const connectionsHtml =
    bestPartnerHtml || worstPartnerHtml || nemesisHtml || favOppHtml
      ? `<div class="ana-card">
              <span class="badge">Connections</span>
              <div class="det-conn-list">${bestPartnerHtml}${worstPartnerHtml}${nemesisHtml}${favOppHtml}</div>
            </div>`
      : "";

  // ELO
  const eloMap = computeElo(allMatches);
  const playerElo = eloMap[name] || 1000;
  const eloChange = playerElo - 1000;
  const eloChangeStr = eloChange > 0 ? `+${eloChange}` : `${eloChange}`;
  const eloChangeCol = eloChange > 0 ? "var(--green)" : eloChange < 0 ? "var(--red)" : "var(--muted)";

  // Badges
  const badges = computeBadges(name, s, eloMap, allMatches);
  const badgesHtml = badges.length
    ? `<div class="ana-card"><span class="badge">Achievements</span><div class="badge-chips">${badges.map((b) => `<div class="badge-chip" title="${b.desc}"><span>${b.icon}</span><span class="badge-chip-lbl">${b.label}</span></div>`).join("")}</div></div>`
    : "";

  // Clutch stats
  const playerMatchesForClutch = allMatches.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(name));
  let closePlayed = 0, closeWins = 0;
  playerMatchesForClutch.forEach((m) => {
    if (Math.abs(m.scoreA - m.scoreB) > 1) return;
    const inA = (m.teamA || []).includes(name);
    const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    closePlayed++;
    if (won) closeWins++;
  });
  const clutchPct = closePlayed > 0 ? (closeWins / closePlayed) * 100 : 0;
  const clutchLabel = closePlayed >= 3 ? (clutchPct > 60 ? `<span style="color:var(--green);font-weight:800">CLUTCH</span>` : clutchPct < 40 ? `<span style="color:var(--red);font-weight:800">CHOKER</span>` : `<span style="color:var(--muted);font-weight:800">NEUTRAL</span>`) : "";
  const clutchHtml = closePlayed >= 3
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
  const raceDeltaStr = raceDelta === null ? "—" : raceDelta > 0 ? `▲${raceDelta}` : raceDelta < 0 ? `▼${Math.abs(raceDelta)}` : "—";
  const raceDeltaColor = raceDelta > 0 ? "var(--green)" : raceDelta < 0 ? "var(--red)" : "var(--muted)";
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
                <div class="analytics-title">${name}</div>
                <button class="analytics-close" onclick="document.getElementById('player-detail-modal').remove()">✕</button>
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
                  ${badges.length ? `<div class="badge-chips" style="margin-top:12px">${badges.map((b) => `<div class="badge-chip" title="${b.desc}"><span>${b.icon}</span><span class="badge-chip-lbl">${b.label}</span></div>`).join("")}</div>` : ""}
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

                <div class="ana-card">
                  <span class="badge">Score Dominance</span>
                  <div class="det-streak-row">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:${marginColor}">${marginVal}</div>
                      <div class="sub">Avg Margin</div>
                    </div>
                    <div class="det-streak-div"></div>
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

                ${connectionsHtml}

                ${clutchHtml}

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

  // Game-level stats
  let aGW = 0,
    bGW = 0,
    aFire = 0,
    bFire = 0,
    aShut = 0,
    bShut = 0;
  let aStreak = 0,
    bStreak = 0,
    aCurStreak = 0,
    bCurStreak = 0,
    aCurType = null,
    bCurType = null;
  const sorted = [...h2h.matches].sort((x, y) =>
    (x.date || "").localeCompare(y.date || ""),
  );
  sorted.forEach((m) => {
    const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
    const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    const aS = aInA ? m.scoreA : m.scoreB;
    const bS = aInA ? m.scoreB : m.scoreA;
    aGW += aS;
    bGW += bS;
    if (aS >= 6) aFire++;
    if (bS >= 6) bFire++;
    if (bS === 0) aShut++;
    if (aS === 0) bShut++;
    if (aWon) {
      aCurType === "w" ? aCurStreak++ : ((aCurType = "w"), (aCurStreak = 1));
      bCurStreak = 0;
      bCurType = null;
    } else {
      bCurType === "w" ? bCurStreak++ : ((bCurType = "w"), (bCurStreak = 1));
      aCurStreak = 0;
      aCurType = null;
    }
    aStreak = Math.max(aStreak, aCurStreak);
    bStreak = Math.max(bStreak, bCurStreak);
  });
  const aGPct = Math.round((aGW / (aGW + bGW || 1)) * 100);
  const recentRows = [...h2h.matches]
    .sort((x, y) => (y.date || "").localeCompare(x.date || ""))
    .slice(0, 8)
    .map((m) => {
      const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
      const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const sa = aInA ? m.scoreA : m.scoreB,
        sb = aInA ? m.scoreB : m.scoreA;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:${aWon ? "var(--green)" : "var(--red)"}">
                ${aWon ? a.split(" ")[0] : b.split(" ")[0]} won
              </span>
              <span style="font-size:12px;font-weight:800;color:var(--text)">${sa}–${sb}</span>
              <span style="font-size:10px;color:var(--muted)">${fmtDate(m.date)}</span>
            </div>`;
    })
    .join("");
  const html = `<div id="h2h-detail-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;overflow:auto;padding:20px" onclick="if(event.target===this)this.remove()">
          <div class="ov-card" style="max-width:480px;margin:0 auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:0.1em">⚔️ H2H DEEP DIVE</div>
              <button onclick="document.getElementById('h2h-detail-modal').remove()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer">✕</button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div style="font-size:18px;font-weight:900;text-transform:uppercase;color:${aCol}">${a}</div>
              <div style="font-size:12px;color:var(--muted);font-weight:700">VS</div>
              <div style="font-size:18px;font-weight:900;text-transform:uppercase;color:${bCol};text-align:right">${b}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
              <div style="font-size:36px;font-weight:900;color:${aCol}">${h2h.aWins}</div>
              <div style="flex:1;height:8px;border-radius:6px;background:rgba(255,255,255,0.06);overflow:hidden;display:flex">
                <div style="width:${aWinPct}%;background:${aCol}"></div>
              </div>
              <div style="font-size:36px;font-weight:900;color:${bCol};text-align:right">${h2h.bWins}</div>
            </div>
            <div class="ov-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">
              <div class="ov-cell"><div class="ov-val">${total}</div><div class="ov-lbl">Played</div></div>
              <div class="ov-cell"><div class="ov-val" style="color:${aCol}">${aWinPct}%</div><div class="ov-lbl">${a.split(" ")[0]} Win%</div></div>
              <div class="ov-cell"><div class="ov-val ${h2h.diff >= 0 ? "p" : "n"}">${diffStr}</div><div class="ov-lbl">Game Diff</div></div>
              <div class="ov-cell"><div class="ov-val">${aGPct}%</div><div class="ov-lbl">Game%</div></div>
            </div>
            <div class="ov-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">
              <div class="ov-cell"><div class="ov-val p">${aGW}</div><div class="ov-lbl">${a.split(" ")[0]} GW</div></div>
              <div class="ov-cell"><div class="ov-val n">${bGW}</div><div class="ov-lbl">${b.split(" ")[0]} GW</div></div>
              <div class="ov-cell"><div class="ov-val" style="color:var(--green)">${aShut}</div><div class="ov-lbl">${a.split(" ")[0]} Shutout</div></div>
              <div class="ov-cell"><div class="ov-val" style="color:var(--green)">${bShut}</div><div class="ov-lbl">${b.split(" ")[0]} Shutout</div></div>
            </div>
            <div class="ov-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:14px">
              <div class="ov-cell"><div class="ov-val" style="color:var(--accent)">${aStreak}</div><div class="ov-lbl">${a.split(" ")[0]} Best Streak</div></div>
              <div class="ov-cell"><div class="ov-val" style="color:var(--accent)">${bStreak}</div><div class="ov-lbl">${b.split(" ")[0]} Best Streak</div></div>
            </div>
            <div style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Recent Matches</div>
            <div style="font-size:11px">${recentRows || '<div style="color:var(--muted);padding:8px">No matches yet.</div>'}</div>
          </div>
        </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
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
  const p1Pct = Math.round((h2h.aWins / total) * 100);
  const recent = [...h2h.matches]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);
  result.innerHTML = `
          <div class="rivalry-header" style="margin-top:12px">
            <div class="rivalry-player">${p1}</div>
            <div class="rivalry-vs">VS</div>
            <div class="rivalry-player">${p2}</div>
          </div>
          <div class="rivalry-record">
            <div class="rivalry-stat"><div class="rivalry-val p">${h2h.aWins}</div><div class="rivalry-lbl">${p1Pct}%</div></div>
            <div class="rivalry-stat"><div class="rivalry-val m">${total}</div><div class="rivalry-lbl">Meetings</div></div>
            <div class="rivalry-stat"><div class="rivalry-val n">${h2h.bWins}</div><div class="rivalry-lbl">${100 - p1Pct}%</div></div>
          </div>
          ${recent
            .map((m) => {
              const p1InA = m.teamA.includes(p1);
              const p1Won = p1InA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
              return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="font-size:12px;font-weight:700;color:${p1Won ? "var(--green)" : "var(--red)"}">${p1Won ? p1 : p2} won</span>
              <span style="font-size:11px;color:var(--muted)">${m.scoreA}–${m.scoreB} · ${fmtDate(m.date)}</span>
            </div>`;
            })
            .join("")}`;
}

// ── ANALYTICS SECTION STATE ────────────────────────────────
const ANA_ORDER_KEY = "ekta_ana_order";
const ANA_COL_KEY = "ekta_ana_col";
function getAnaOrder() { try { return JSON.parse(localStorage.getItem(ANA_ORDER_KEY)) || []; } catch(e) { return []; } }
function saveAnaOrder(a) { localStorage.setItem(ANA_ORDER_KEY, JSON.stringify(a)); }
function getAnaCollapsed() { try { return new Set(JSON.parse(localStorage.getItem(ANA_COL_KEY)) || []); } catch(e) { return new Set(); } }
function saveAnaCollapsed(s) { localStorage.setItem(ANA_COL_KEY, JSON.stringify([...s])); }

function toggleAnaSection(key) {
  const el = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (!el) return;
  el.classList.toggle("collapsed");
  const col = getAnaCollapsed();
  el.classList.contains("collapsed") ? col.add(key) : col.delete(key);
  saveAnaCollapsed(col);
}

let _anaDragKey = null;
let _anaClone = null;
let _anaDragOffsetY = 0;

function _reRenderAnalytics() {
  const sc = document.querySelector("#pg-analytics .page-body-scroll");
  const top = sc?.scrollTop || 0;
  renderAnalyticsPage();
  requestAnimationFrame(() => { if (sc) sc.scrollTop = top; });
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
    position: "fixed", top: rect.top + "px", left: rect.left + "px",
    width: rect.width + "px", zIndex: 9999, opacity: "0.85",
    pointerEvents: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    borderRadius: "8px", background: "var(--surface2)",
  });
  document.body.appendChild(_anaClone);
  sec.classList.add("ana-sec-dragging");

  document.addEventListener("pointermove", _anaOnMove);
  document.addEventListener("pointerup", _anaOnUp);
}

function _anaOnMove(e) {
  if (!_anaClone) return;
  _anaClone.style.top = (e.clientY - _anaDragOffsetY) + "px";

  document.querySelectorAll(".ana-sec-drop-above, .ana-sec-drop-below")
    .forEach((el) => el.classList.remove("ana-sec-drop-above", "ana-sec-drop-below"));

  const container = document.getElementById("analytics-page-content");
  if (!container) return;
  for (const sec of container.querySelectorAll(".ana-sec")) {
    if (sec.dataset.key === _anaDragKey) continue;
    const r = sec.getBoundingClientRect();
    if (e.clientY >= r.top && e.clientY <= r.bottom) {
      sec.classList.add(e.clientY < r.top + r.height / 2 ? "ana-sec-drop-above" : "ana-sec-drop-below");
      break;
    }
  }
}

function _anaOnUp(e) {
  document.removeEventListener("pointermove", _anaOnMove);
  document.removeEventListener("pointerup", _anaOnUp);
  if (_anaClone) { _anaClone.remove(); _anaClone = null; }

  const dragged = document.querySelector(`.ana-sec[data-key="${_anaDragKey}"]`);
  if (dragged) dragged.classList.remove("ana-sec-dragging");

  const above = document.querySelector(".ana-sec-drop-above");
  const below = document.querySelector(".ana-sec-drop-below");
  const target = above || below;
  document.querySelectorAll(".ana-sec-drop-above, .ana-sec-drop-below")
    .forEach((el) => el.classList.remove("ana-sec-drop-above", "ana-sec-drop-below"));

  if (target && _anaDragKey) {
    const container = document.getElementById("analytics-page-content");
    const secs = [...container.querySelectorAll(".ana-sec")].map((el) => el.dataset.key);
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
  const g = (n) => { if (!(n in elo)) elo[n] = 1000; };
  const sorted = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  sorted.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    [...m.teamA, ...m.teamB].forEach(g);
    const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const expB = 1 - expA;
    const deltaA = 32 * ((aWon ? 1 : 0) - expA);
    const deltaB = 32 * ((aWon ? 0 : 1) - expB);
    m.teamA.forEach((p) => { elo[p] = Math.round(elo[p] + deltaA); });
    m.teamB.forEach((p) => { elo[p] = Math.round(elo[p] + deltaB); });
  });
  return elo;
}

function computeBadges(name, stats, eloMap, allMatchesArr) {
  const badges = [];
  const allStats = computeStats(allMatchesArr);
  const sr = allStats;

  // 👑 King: ranked #1 by SR
  if (sr.length && sr[0].name === name) badges.push({ icon: "👑", label: "King", desc: "Ranked #1 overall" });

  // 🔥 On Fire / 🧊 Ice Cold
  const ps = allStats.find((p) => p.name === name);
  if (ps) {
    if (ps.curType === "W" && ps.curStreak >= 5) badges.push({ icon: "🔥", label: "On Fire", desc: `${ps.curStreak} match win streak` });
    if (ps.curType === "L" && ps.curStreak >= 5) badges.push({ icon: "🧊", label: "Ice Cold", desc: `${ps.curStreak} match loss streak` });
  }

  // 💪 Ironman: most matches played
  const maxMp = Math.max(...allStats.map((p) => p.mp));
  if (ps && ps.mp === maxMp && maxMp > 0) badges.push({ icon: "💪", label: "Ironman", desc: `Most matches played (${maxMp})` });

  // 🎯 Sniper: won 2+ matches in a session without conceding any games
  const sessionDates = [...new Set(allMatchesArr.map((m) => m.date).filter(Boolean))];
  for (const date of sessionDates) {
    const sm = allMatchesArr.filter((m) => m.date === date && ([...(m.teamA || []), ...(m.teamB || [])].includes(name)));
    let shutoutWins = 0;
    sm.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const own = inA ? m.scoreA : m.scoreB;
      const opp = inA ? m.scoreB : m.scoreA;
      if (own > opp && opp === 0) shutoutWins++;
    });
    if (shutoutWins >= 2) { badges.push({ icon: "🎯", label: "Sniper", desc: "Won 2+ matches X-0 in one session" }); break; }
  }

  // 🧗 Climber: biggest positive ELO gain this week
  const { from: wkFrom } = lastWeekRange();
  const preWkElo = computeElo(allMatchesArr.filter((m) => (m.date || "") < wkFrom));
  const eloGains = allStats.map((p) => ({ name: p.name, gain: (eloMap[p.name] || 1000) - (preWkElo[p.name] || 1000) }));
  const topGainer = eloGains.sort((a, b) => b.gain - a.gain)[0];
  if (topGainer && topGainer.name === name && topGainer.gain > 0) badges.push({ icon: "🧗", label: "Climber", desc: `+${topGainer.gain} ELO this week` });

  // 🦁 Clutch King: best win% in close matches (margin <= 1) with ≥3 close games
  const closeW = {}, closeP = {};
  allMatchesArr.forEach((m) => {
    if (Math.abs(m.scoreA - m.scoreB) > 1) return;
    const aWon = m.scoreA > m.scoreB;
    [...(m.teamA || [])].forEach((p) => { closeP[p] = (closeP[p] || 0) + 1; if (aWon) closeW[p] = (closeW[p] || 0) + 1; });
    [...(m.teamB || [])].forEach((p) => { closeP[p] = (closeP[p] || 0) + 1; if (!aWon) closeW[p] = (closeW[p] || 0) + 1; });
  });
  const clutchPlayers = Object.keys(closeP).filter((p) => closeP[p] >= 3);
  if (clutchPlayers.length) {
    const best = clutchPlayers.sort((a, b) => (closeW[b] || 0) / closeP[b] - (closeW[a] || 0) / closeP[a])[0];
    if (best === name) badges.push({ icon: "🦁", label: "Clutch King", desc: `${Math.round(((closeW[name] || 0) / closeP[name]) * 100)}% in close matches` });
  }

  // 🤝 Best Duo: part of pair with highest win% (≥4 games)
  const pairs = getPairStats(allMatchesArr).filter((p) => p.played >= 4);
  if (pairs.length && pairs[0].players.includes(name)) badges.push({ icon: "🤝", label: "Best Duo", desc: `${pairs[0].winPct}% with ${pairs[0].players.find((p) => p !== name)}` });

  // 🃏 Giant Killer: beaten 2+ players with higher SR
  if (ps) {
    const srMap = {};
    allStats.forEach((p) => { srMap[p.name] = p.sr; });
    const beatenHigher = new Set();
    allMatchesArr.forEach((m) => {
      const aWon = m.scoreA > m.scoreB;
      const inA = (m.teamA || []).includes(name);
      const inB = (m.teamB || []).includes(name);
      if (!inA && !inB) return;
      const won = (inA && aWon) || (inB && !aWon);
      if (!won) return;
      const opps = inA ? (m.teamB || []) : (m.teamA || []);
      opps.forEach((opp) => { if ((srMap[opp] || 0) > (srMap[name] || 0)) beatenHigher.add(opp); });
    });
    if (beatenHigher.size >= 2) badges.push({ icon: "🃏", label: "Giant Killer", desc: `Beaten ${beatenHigher.size} higher-rated players` });
  }

  return badges;
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
    partnerships = {};
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
  const rank1wk = computeStats(_preWkArr, computeElo(_preWkArr)).reduce((o, p, i) => ({ ...o, [p.name]: i + 1 }), {});
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

  // ── HEATMAP ────────────────────────────────────────────
  const hCells = [];
  for (let i = 111; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().substring(0, 10);
    hCells.push({ ds, c: dateCounts[ds] || 0 });
  }
  const maxH = Math.max(...hCells.map((c) => c.c), 1);
  const hmMonthLabels = (() => {
    const moN = [
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
    // With column-major flow, column k = cells k*7 … k*7+6 (one week per column)
    return `<div style="display:grid;grid-template-columns:repeat(16,1fr);gap:3px;margin-bottom:3px">${Array.from(
      { length: 16 },
      (_, col) => {
        const first = hCells[col * 7];
        if (!first) return "<div></div>";
        const mo = parseInt(first.ds.substring(5, 7)) - 1;
        const prev =
          col > 0
            ? parseInt(hCells[(col - 1) * 7]?.ds.substring(5, 7) || "0") - 1
            : -1;
        return `<div style="font-size:7px;color:var(--muted);white-space:nowrap;overflow:hidden">${mo !== prev ? moN[mo] : ""}</div>`;
      },
    ).join("")}</div>`;
  })();
  const heatHtml = `<div style="font-size:9px;color:var(--muted);margin-bottom:4px">Match activity — last 112 days</div>${hmMonthLabels}<div class="hm-grid">${hCells
    .map((c) => {
      const a = c.c === 0 ? 0 : Math.max(0.2, c.c / maxH);
      const bg =
        c.c === 0
          ? "rgba(255,255,255,0.04)"
          : `rgba(var(--theme-rgb),${a.toFixed(2)})`;
      return `<div class="hm-cell" style="background:${bg}" title="${c.ds}${c.c ? ": " + c.c + " match" + (c.c > 1 ? "es" : "") : ""}"></div>`;
    })
    .join(
      "",
    )}</div><div style="display:flex;align-items:center;gap:5px;margin-top:6px;font-size:9px;color:var(--muted)"><span>Less</span><div style="width:10px;height:10px;border-radius:2px;background:rgba(255,255,255,0.04)"></div><div style="width:10px;height:10px;border-radius:2px;background:rgba(var(--theme-rgb),0.3)"></div><div style="width:10px;height:10px;border-radius:2px;background:rgba(var(--theme-rgb),0.7)"></div><div style="width:10px;height:10px;border-radius:2px;background:rgba(var(--theme-rgb),1)"></div><span>More</span></div>`;

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
      i: "🏋️",
      t: "Iron Man",
      n: mostActive?.name,
      s: `${mostActive?.matches || 0} matches played`,
    },
    {
      i: "🎯",
      t: "Sharpshooter",
      n: topWinRate?.name,
      s: `${topWinRate ? Math.round((topWinRate.wins / topWinRate.matches) * 100) : 0}% win rate`,
    },
    {
      i: "🔥",
      t: "On Fire",
      n: topStreak?.name,
      s: `${topStreak?.bestStreak || 0} win streak`,
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
      .slice(0, 8)
      .map(
        (p) =>
          `<div class="bpair-row"><div class="bpair-player">${p.name}</div><div class="bpair-partner">🤝 ${p.partner.name.split(" ")[0]}</div><div class="bpair-pct">${p.partner.pct.toFixed(0)}%</div></div>`,
      )
      .join("") ||
    '<div class="sub" style="padding:8px">Not enough data.</div>';

  const allPairsRanked = Object.entries(partnerships).sort((a, b) => {
    const diff = b[1].wins / b[1].played - a[1].wins / a[1].played;
    return diff !== 0 ? diff : b[1].played - a[1].played;
  });
  const allPairsHtml = allPairsRanked.length
    ? allPairsRanked
        .map(([key, p], i) => {
          const pc = Math.round((p.wins / p.played) * 100);
          const col =
            pc >= 60 ? "var(--green)" : pc <= 40 ? "var(--red)" : "var(--text)";
          const escKey = key.replace(/'/g, "\\'");
          return `<div class="chem-row" style="cursor:pointer" onclick="openPairDetail('${escKey}')"><div class="chem-rank">#${i + 1}</div><div class="chem-names">${p.players.join(" & ")}</div><div class="chem-wl">${p.wins}–${p.played - p.wins}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pc}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pc}%</div><div class="chem-played">${p.played}g</div></div>`;
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
    const recent = [...rivalry.matches]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);
    rivalHtml = `<div class="rivalry-header"><div class="rivalry-player">${rivalA}</div><div class="rivalry-vs">VS</div><div class="rivalry-player">${rivalB}</div></div>
          <div class="rivalry-record"><div class="rivalry-stat"><div class="rivalry-val p">${rivalry.aWins}</div><div class="rivalry-lbl">${Math.round((rivalry.aWins / tot) * 100)}%</div></div><div class="rivalry-stat"><div class="rivalry-val m">${tot}</div><div class="rivalry-lbl">Meetings</div></div><div class="rivalry-stat"><div class="rivalry-val n">${rivalry.bWins}</div><div class="rivalry-lbl">${Math.round((rivalry.bWins / tot) * 100)}%</div></div></div>
          ${recent
            .map((m) => {
              const p1Won =
                (m.teamA.includes(rivalA) && m.scoreA > m.scoreB) ||
                (m.teamB.includes(rivalA) && m.scoreB > m.scoreA);
              return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="font-size:12px;font-weight:700;color:var(--text)">${p1Won ? rivalA : rivalB} won</span><span style="font-size:11px;color:var(--muted)">${m.scoreA}–${m.scoreB} · ${fmtDate(m.date)}</span></div>`;
            })
            .join("")}`;
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
  const h2hHtml = `<div class="h2h-form"><div class="h2h-selects"><select id="h2hP1" class="hist-select compact-select" style="flex:1">${opts}</select><span style="color:var(--muted);font-weight:700;font-size:12px;flex-shrink:0">VS</span><select id="h2hP2" class="hist-select compact-select" style="flex:1">${opts}</select></div><button class="btn-go" style="width:100%;margin-top:8px" onclick="renderH2HDeepDive()">Compare</button></div><div id="h2h-result" style="margin-top:8px"></div>`;

  // ── ELO RANKINGS ───────────────────────────────────────
  const { from: wkFromElo } = lastWeekRange();
  const preWkEloMap = computeElo(allMatches.filter((m) => (m.date || "") < wkFromElo));
  const eloRanked = Object.entries(eloMap).sort((a, b) => b[1] - a[1]);
  const maxEloVal = eloRanked[0]?.[1] || 1000;
  const minEloVal = eloRanked[eloRanked.length - 1]?.[1] || 1000;
  const eloRange = Math.max(1, maxEloVal - minEloVal);
  const eloHtml = eloRanked.length
    ? `<div class="ana-card" style="padding:10px 12px">${eloRanked.map(([pname, ev], i) => {
        const change = ev - (preWkEloMap[pname] || 1000);
        const changeStr = change > 0 ? `<span style="color:var(--green)">+${change}</span>` : change < 0 ? `<span style="color:var(--red)">${change}</span>` : `<span style="color:var(--muted)">—</span>`;
        const barW = Math.max(5, ((ev - minEloVal) / eloRange) * 100).toFixed(0);
        const col = ev >= 1100 ? "var(--green)" : ev <= 900 ? "var(--red)" : "var(--theme)";
        return `<div class="elo-row"><div class="elo-rank">#${i + 1}</div><div class="elo-name">${pname}</div><div class="elo-bar-wrap"><div class="elo-bar" style="width:${barW}%;background:${col}"></div></div><div class="elo-val">${ev}</div><div class="elo-change">${changeStr}</div></div>`;
      }).join("")}</div>`
    : '<div class="sub" style="padding:8px">No data yet.</div>';

  // ── PAIR CHEMISTRY MATRIX ──────────────────────────────
  const pairMatrixPlayers = [...new Set(getPairStats(allMatches).flatMap((p) => p.players))].sort();
  const pairMatrixHtml = (() => {
    if (pairMatrixPlayers.length < 2) return '<div class="sub" style="padding:8px">Need more pair data.</div>';
    const pairLookup = {};
    getPairStats(allMatches).forEach((p) => { pairLookup[p.key] = p; });
    const colHeaders = pairMatrixPlayers.map((p) => `<th class="pvp-th" title="${p}">${p.split(" ")[0]}</th>`).join("");
    const rows = pairMatrixPlayers.map((rowP) => {
      const cells = pairMatrixPlayers.map((colP) => {
        if (rowP === colP) return `<td class="pvp-td pvp-self">·</td>`;
        const key = [rowP, colP].sort().join(" & ");
        const pair = pairLookup[key];
        if (!pair || pair.played < 2) return `<td class="pvp-td pvp-none">—</td>`;
        const pct = pair.winPct;
        const cls = pct > 60 ? "pvp-win" : pct < 40 ? "pvp-loss" : "pvp-even";
        return `<td class="pvp-td ${cls}" title="${rowP.split(" ")[0]} & ${colP.split(" ")[0]}: ${pair.wins}W–${pair.played - pair.wins}L">${pct}%</td>`;
      }).join("");
      return `<tr><td class="pvp-row-hdr" title="${rowP}">${rowP.split(" ")[0]}</td>${cells}</tr>`;
    }).join("");
    return `<div class="ana-card" style="padding:10px 8px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % as partners. — = fewer than 2 games together.</div><div class="pvp-wrap"><table class="pvp-table"><thead><tr><th class="pvp-corner"></th>${colHeaders}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  })();

  // ── MONTHLY AWARDS ─────────────────────────────────────
  const nowDate = new Date();
  const curMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;
  const monthlyMatchList = allMatches.filter((m) => (m.date || "").startsWith(curMonth));
  const monthlyAwardsHtml = (() => {
    if (monthlyMatchList.length < 2) return '<div class="sub" style="padding:8px">Not enough matches this month.</div>';
    const moEloNow = computeElo(allMatches);
    const moEloPre = computeElo(allMatches.filter((m) => !(m.date || "").startsWith(curMonth)));
    const moStats = computeStats(monthlyMatchList);
    // Most Improved
    const moGains = moStats.map((p) => ({ name: p.name, gain: (moEloNow[p.name] || 1000) - (moEloPre[p.name] || 1000) })).sort((a, b) => b.gain - a.gain);
    const mostImproved = moGains[0];
    // Best Duo of Month
    const moPairs = getPairStats(monthlyMatchList).filter((p) => p.played >= 2).sort((a, b) => b.winPct - a.winPct);
    const bestDuoMonth = moPairs[0];
    // Most Consistent: lowest std dev of per-match game%
    const moConsistency = moStats.filter((p) => p.mp >= 3).map((p) => {
      const playerMatches = monthlyMatchList.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(p.name));
      const gamePcts = playerMatches.map((m) => {
        const inA = (m.teamA || []).includes(p.name);
        const gw = inA ? m.scoreA : m.scoreB;
        const gl = inA ? m.scoreB : m.scoreA;
        return (gw + gl) > 0 ? gw / (gw + gl) : 0.5;
      });
      const mean = gamePcts.reduce((s, v) => s + v, 0) / gamePcts.length;
      const sd = Math.sqrt(gamePcts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / gamePcts.length);
      return { name: p.name, sd };
    }).sort((a, b) => a.sd - b.sd);
    const mostConsistent = moConsistency[0];
    // Most Feared: highest win% with ≥3 matches
    const mostFeared = moStats.filter((p) => p.mp >= 3).sort((a, b) => b.winPct - a.winPct)[0];
    // Most Active
    const mostActiveMo = moStats.sort((a, b) => b.mp - a.mp)[0];
    return `<div class="awards-grid">${scard("📈", "Most Improved", mostImproved?.name, mostImproved ? `+${mostImproved.gain} ELO this month` : "—")}${scard("🤝", "Best Duo", bestDuoMonth ? bestDuoMonth.key : null, bestDuoMonth ? `${bestDuoMonth.winPct}% · ${bestDuoMonth.played}g` : "Need ≥2 games")}${scard("🎯", "Most Consistent", mostConsistent?.name, mostConsistent ? `${(mostConsistent.sd * 100).toFixed(1)}% std dev` : "Need ≥3 matches")}${scard("👹", "Most Feared", mostFeared?.name, mostFeared ? `${mostFeared.winPct.toFixed(0)}% win rate` : "Need ≥3 matches")}${scard("🔁", "Most Active", mostActiveMo?.name, mostActiveMo ? `${mostActiveMo.mp} matches this month` : "—")}</div>`;
  })();

  // ── PERSONAL BESTS ─────────────────────────────────────
  const personalBestsHtml = (() => {
    const pbStats = computeStats(allMatches).filter((p) => p.mp >= 3);
    if (!pbStats.length) return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const rows = pbStats.map((p) => {
      const playerMs = sortedM.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(p.name));
      // Longest win streak ever = bestWinStreak from computeStats
      const longestWS = p.bestWinStreak;
      // Biggest win margin
      let biggestMargin = 0, biggestScore = "";
      playerMs.forEach((m) => {
        const inA = (m.teamA || []).includes(p.name);
        const own = inA ? m.scoreA : m.scoreB;
        const opp = inA ? m.scoreB : m.scoreA;
        if (own > opp && (own - opp) > biggestMargin) { biggestMargin = own - opp; biggestScore = `${own}-${opp}`; }
      });
      // Best session performance (most wins in one day)
      const byDate = {};
      playerMs.forEach((m) => {
        if (!m.date) return;
        if (!byDate[m.date]) byDate[m.date] = { wins: 0, played: 0 };
        byDate[m.date].played++;
        const inA = (m.teamA || []).includes(p.name);
        if ((inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA)) byDate[m.date].wins++;
      });
      const bestDay = Object.values(byDate).sort((a, b) => b.wins - a.wins || b.played - a.played)[0];
      const mostMatchesDay = Object.entries(byDate).sort((a, b) => b[1].played - a[1].played)[0];
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
    { key: "pvp", title: "⚔️ Player vs Player Matrix", body: `<div class="ana-card" style="padding:10px 8px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % of <strong style="color:var(--accent)">row</strong> vs column. — = never met.</div>${matrixHtml}</div>` },
    { key: "awards", title: "🏅 Awards Board", body: `<div class="awards-grid">${awardsHtml}</div>` },
    { key: "form", title: "⚡ Current Form", body: `<div class="ana-card" style="padding:8px 12px"><div class="ftable-header"><span>#</span><span>Player</span><span>Last 10</span><span>Win%</span></div>${ftHtml}</div>` },
    { key: "lrace", title: "🏎️ Leaderboard Race", body: `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header"><span>Rank</span><span>Player</span><span>Last Wk.</span><span>Trend</span></div>${lrHtml}</div>` },
    ...(uniqueMonths.length >= 2 ? [{ key: "winrate", title: "📈 Win Rate Over Time", body: `<div class="ana-card">${winChartHtml}</div>` }] : []),
    { key: "heatmap", title: "📅 Activity Heatmap", body: `<div class="ana-card">${heatHtml}</div>` },
    { key: "score", title: "📊 Score Distribution", body: `<div class="ana-card">${sdHtml}</div>` },
    { key: "insights", title: "🎯 Match Insights", body: `<div style="font-size:10px;font-weight:700;color:var(--muted);margin:6px 0 4px;letter-spacing:0.06em">CLOSEST MATCHES</div>${cmHtml}<div style="font-size:10px;font-weight:700;color:var(--muted);margin:10px 0 4px;letter-spacing:0.06em">BIGGEST UPSETS</div>${upHtml}` },
    { key: "partnership", title: "🤝 Partnership Analytics", body: `<div style="font-size:10px;font-weight:700;color:var(--muted);margin:6px 0 4px;letter-spacing:0.06em">CHEMISTRY RANKINGS</div><div class="ana-card" style="padding:10px 12px">${chemHtml}</div><div style="font-size:10px;font-weight:700;color:var(--muted);margin:10px 0 4px;letter-spacing:0.06em">BEST PARTNER PER PLAYER</div><div class="ana-card" style="padding:10px 12px">${bpHtml}</div><div style="font-size:10px;font-weight:700;color:var(--muted);margin:10px 0 4px;letter-spacing:0.06em">PAIR RECENT FORM</div><div class="ana-card" style="padding:10px 12px">${pfHtml}</div>` },
    { key: "rivalry", title: "🔥 Rivalry Spotlight", body: `<div class="ana-card">${rivalHtml}</div>` },
    { key: "session", title: "📋 Session Stats", body: sessHtml },
    { key: "shutout", title: "🎯 Shutout Records", body: `<div class="awards-grid">${scard("🚫","Most Shutout Wins",mostShutoutWinsEntry?.[0],`${mostShutoutWinsEntry?.[1]||0} games won X-0`)}${scard("💔","Most Shutout Losses",mostShutoutLosses.length?mostShutoutLosses.join(" & "):null,`${maxLosses} games lost 0-X`)}</div>` },
    { key: "core", title: "🏃 Core Stats", body: `<div class="awards-grid">${scard("🏃","Most Active",mostActive?.name,`${mostActive?.matches||0} matches played`)}${scard("🏆","Best Win Rate",topWinRate?.name,`${topWinRate?Math.round((topWinRate.wins/topWinRate.matches)*100):0}% (${topWinRate?.wins||0}W–${topWinRate?.losses||0}L)`)}${scard("🔥","Longest Streak",topStreak?.name,`${topStreak?.bestStreak||0} consecutive wins`)}${scard("⚔️","Most Dominant",destroyer?.name,`+${destroyer?.avgMargin?.toFixed(1)||0} avg margin`)}</div>` },
    { key: "pairs", title: "🤝 All Pairs", body: `<div class="ana-card" style="padding:10px 12px">${allPairsHtml}</div>` },
    { key: "elo", title: "⚡ ELO Rankings", body: eloHtml },
    { key: "pairmatrix", title: "🧪 Pair Chemistry Matrix", body: pairMatrixHtml },
    { key: "monthlyawards", title: "🏆 Monthly Awards", body: monthlyAwardsHtml },
    { key: "personalbests", title: "🏅 Personal Bests", body: personalBestsHtml },
  ];

  const storedOrder = getAnaOrder();
  const validKeys = allSecs.map((s) => s.key);
  const orderedKeys = [
    ...storedOrder.filter((k) => validKeys.includes(k)),
    ...validKeys.filter((k) => !storedOrder.includes(k)),
  ];
  const collapsed = getAnaCollapsed();

  container.innerHTML = orderedKeys
    .map((key) => {
      const def = allSecs.find((s) => s.key === key);
      if (!def) return "";
      return makeSec(key, def.title, def.body, collapsed.has(key));
    })
    .join("");

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
      ".ana-card, .award-card, .awards-grid, .ana-section-title, .pair-stats-card",
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

// ── INIT ───────────────────────────────────────────────────
// loadCloudData() orchestrates: cache-first render → Firestore refresh.
// renderHome/renderCompact are called inside it after data is ready.
renderNamesTable();
loadCloudData();

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
  exportData,
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
  setHistoryDateFilter,
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
