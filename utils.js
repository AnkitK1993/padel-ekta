/* ══════════════════════════════════════ */

// ── ERROR LOGGER ──────────────────────────────────────────
// Captures uncaught errors + promise rejections into a capped localStorage
// ring buffer so a solo maintainer can see real-world breakage instead of
// "it broke once". Loaded first (classic script) so it catches early errors.
// app.js installs an optional Firestore mirror via window.__onAppError.
(function () {
  const KEY = "padel_errlog";
  const MAX = 50;
  function read() {
    try {
      const a = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function record(entry) {
    try {
      const log = read();
      // de-dupe consecutive identical messages, just bump count + time
      const last = log[log.length - 1];
      if (last && last.msg === entry.msg && last.stack === entry.stack) {
        last.n = (last.n || 1) + 1;
        last.ts = entry.ts;
      } else {
        log.push(entry);
        while (log.length > MAX) log.shift();
      }
      localStorage.setItem(KEY, JSON.stringify(log));
    } catch (e) {}
    try {
      if (typeof window.__onAppError === "function") window.__onAppError(entry);
    } catch (e) {}
  }
  window.addEventListener("error", function (e) {
    record({
      ts: Date.now(),
      msg: String(e.message || e.error || "error"),
      src: (e.filename || "") + ":" + (e.lineno || "") + ":" + (e.colno || ""),
      stack: (e.error && e.error.stack ? String(e.error.stack) : "").slice(0, 1200),
      ua: navigator.userAgent,
    });
  });
  window.addEventListener("unhandledrejection", function (e) {
    const r = e.reason;
    record({
      ts: Date.now(),
      msg: "unhandledrejection: " + String((r && r.message) || r),
      src: "",
      stack: (r && r.stack ? String(r.stack) : "").slice(0, 1200),
      ua: navigator.userAgent,
    });
  });
  window.getErrorLog = read;
  window.clearErrorLog = function () {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  };
})();

/* ══════════════════════════════════════ */

(function () {
        window.__analyticsRendered = false;

        function debounce(fn, wait) {
          let t;
          return function () {
            clearTimeout(t);
            t = setTimeout(fn, wait);
          };
        }

        function safeAnalyticsRender() {
          if (window.__analyticsRendered) return;

          const analyticsRoot =
            document.querySelector("#analytics") ||
            document.querySelector(".analytics-page");

          if (!analyticsRoot) return;

          if (analyticsRoot.querySelector(".analytics-premium-wrapper")) {
            window.__analyticsRendered = true;
            return;
          }

          window.__analyticsRendered = true;
        }

        function optimizeTabs() {
          const tabs = document.querySelectorAll(
            ".tbb,.bottom-nav-item,.tab-item",
          );

          tabs.forEach((tab) => {
            if (tab.dataset.optimized) return;

            tab.dataset.optimized = "1";

            tab.addEventListener(
              "click",
              debounce(() => {
                // cancel heavy animations during rapid switching
                document.body.classList.add("tab-switching");

                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    document.body.classList.remove("tab-switching");
                  });
                });
              }, 80),
              { passive: true },
            );
          });
        }

        document.addEventListener(
          "visibilitychange",
          () => {
            if (document.hidden) {
              document.body.classList.add("paused-animations");
            } else {
              document.body.classList.remove("paused-animations");
            }
          },
          { passive: true },
        );

        const perfStyle = document.createElement("style");
        perfStyle.innerHTML = `
body.tab-switching *{
  animation-duration:0s !important;
  transition-duration:0s !important;
}

body.paused-animations *{
  animation-play-state:paused !important;
}
`;

        document.head.appendChild(perfStyle);

        window.addEventListener(
          "load",
          () => {
            safeAnalyticsRender();
            optimizeTabs();
          },
          { passive: true },
        );

        document.addEventListener(
          "DOMContentLoaded",
          () => {
            safeAnalyticsRender();
            optimizeTabs();
          },
          { passive: true },
        );
      })();

/* ══════════════════════════════════════ */

(function () {
        const CACHE_KEY = "padel_cache_v5";
        // Long TTL: this is an offline-first mirror of the cloud (the source of
        // truth), so expiring it only ever hurts offline cold-starts. 90 days
        // just guards against truly ancient data lingering forever.
        const CACHE_TTL = 1000 * 60 * 60 * 24 * 90;
        const mem = {};
        window.appCache = {
          save: function (matches, players, playerAliasMap, nextPlayerId) {
            try {
              var p = {
                ts: Date.now(),
                matches: matches,
                players: players,
                playerAliasMap: playerAliasMap,
                nextPlayerId: nextPlayerId,
              };
              localStorage.setItem(CACHE_KEY, JSON.stringify(p));
              mem.data = p;
            } catch (e) {}
          },
          load: function () {
            if (mem.data) {
              if (Date.now() - mem.data.ts <= CACHE_TTL) return mem.data;
              mem.data = null;
            }
            try {
              var raw = localStorage.getItem(CACHE_KEY);
              if (!raw) return null;
              var p = JSON.parse(raw);
              if (Date.now() - p.ts > CACHE_TTL) {
                localStorage.removeItem(CACHE_KEY);
                mem.data = null;
                return null;
              }
              mem.data = p;
              return p;
            } catch (e) {
              return null;
            }
          },
        };
      })();

/* ══════════════════════════════════════ */

(function () {
        // dismissSplash can be called from anywhere, multiple times safely
        window._splashDismissed = false;
        window.dismissSplash = function (status) {
          if (window._splashDismissed) return;
          window._splashDismissed = true;
          var splash = document.getElementById("app-splash");
          if (!splash) return;
          if (status) {
            var el = document.getElementById("splash-status");
            if (el) el.textContent = status;
          }
          splash.style.transition = "opacity 0.3s ease";
          splash.style.opacity = "0";
          setTimeout(function () {
            splash.style.display = "none";
            document.body.classList.add("splash-done");
            if (typeof renderHome === "function") renderHome();
          }, 320);
        };

        // Hard fallback: dismiss splash after 8s if data never loads (e.g. offline)
        document.addEventListener("DOMContentLoaded", function () {
          setTimeout(function () {
            window.dismissSplash("Ready");
          }, 8000);
        });
      })();

/* ══════════════════════════════════════ */

// ── THEME SWITCHER (plain script — must be global for onclick) ──
      var THEMES = [
        { name: "Cyberpunk", hex: "#ff00d4", r: 255, g: 0, b: 212 },
        { name: "Holo HUD", hex: "#5cd0ff", r: 92, g: 208, b: 255, mode: "holo" },
        { name: "Royal Gold", hex: "#fbbf24", r: 251, g: 191, b: 36, mode: "royal-gold" },
        { name: "Midnight OLED", hex: "#00c8ff", r: 0, g: 200, b: 255, mode: "midnight-oled" },
        { name: "Emerald Lux", hex: "#2ee6a0", r: 46, g: 230, b: 160, mode: "emerald-lux" },
        { name: "Crimson Royale", hex: "#ff3b63", r: 255, g: 59, b: 99, mode: "crimson-royale" },
        { name: "Amethyst Haze", hex: "#b06cff", r: 176, g: 108, b: 255, mode: "amethyst" },
      ];
      window.THEMES = THEMES;
      var _themeIdx = 0;

      function applyTheme(t) {
        var root = document.documentElement;
        root.style.setProperty("--theme", t.hex);
        root.style.setProperty("--theme-rgb", t.r + ", " + t.g + ", " + t.b);
        root.style.setProperty(
          "--theme2",
          "rgba(" + t.r + "," + t.g + "," + t.b + ",0.6)",
        );
        // Special modes (e.g. Holo HUD restructures the Detailed cards). Toggle
        // every theme's {mode}-mode class off except the active one — data-driven
        // so a new themed mode only needs its THEMES entry + CSS, nothing here.
        if (document.body) {
          THEMES.forEach(function (th) {
            if (th.mode)
              document.body.classList.toggle(
                th.mode + "-mode",
                th.mode === t.mode,
              );
          });
        }
        // Re-render Home so the active mode picks up the right card template
        try {
          if (typeof window.renderHome === "function") window.renderHome();
        } catch (e) {}
        var btn = document.getElementById("themeBtn");
        if (btn) {
          btn.style.background = t.hex;
          btn.style.boxShadow =
            "0 0 14px rgba(" +
            t.r +
            "," +
            t.g +
            "," +
            t.b +
            ",0.45), 0 0 28px rgba(" +
            t.r +
            "," +
            t.g +
            "," +
            t.b +
            ",0.18)";
        }
        try {
          // Persist by NAME, not array index — so adding/removing/reordering
          // themes never silently switches a user to a different theme.
          localStorage.setItem("padel-theme-name", t.name);
        } catch (e) {}
      }

      function cycleTheme() {
        // Now opens the picker overlay instead of cycling
        if (typeof window.openThemePicker === "function") {
          window.openThemePicker();
        } else {
          _themeIdx = (_themeIdx + 1) % THEMES.length;
          applyTheme(THEMES[_themeIdx]);
        }
      }

      function setThemeByIdx(i) {
        if (i < 0 || i >= THEMES.length) return;
        _themeIdx = i;
        applyTheme(THEMES[_themeIdx]);
        var btn = document.getElementById("themeBtn");
        if (btn) {
          btn.classList.remove("theme-spin");
          void btn.offsetWidth;
          btn.classList.add("theme-spin");
        }
      }
      window.setThemeByIdx = setThemeByIdx;
      window.getThemeIdx = function () { return _themeIdx; };

      // Restore saved theme immediately (by name; migrate legacy index once)
      (function () {
        try {
          // The original index order, used only to migrate users who still have
          // the legacy padel-theme-idx key to the new name-based storage. Kept
          // themes survive; users on a since-removed theme fall back to default.
          var LEGACY_ORDER = [
            "Neon Blue", "Gold", "Neon Green", "Neon Pink", "Neon Purple",
            "Red", "Royal Blue", "Crimson", "Forest", "Cyberpunk", "Mono",
            "Holo HUD", "Royal Gold", "Midnight OLED", "Emerald Lux",
            "Crimson Royale", "Amethyst Haze",
          ];
          var name = localStorage.getItem("padel-theme-name");
          if (!name) {
            var oldIdx = parseInt(localStorage.getItem("padel-theme-idx"), 10);
            if (!isNaN(oldIdx) && oldIdx >= 0 && oldIdx < LEGACY_ORDER.length)
              name = LEGACY_ORDER[oldIdx];
          }
          var idx = -1;
          for (var i = 0; i < THEMES.length; i++)
            if (THEMES[i].name === name) { idx = i; break; }
          if (idx >= 0) {
            _themeIdx = idx;
            // Apply after DOM is ready so the button element exists
            document.addEventListener("DOMContentLoaded", function () {
              applyTheme(THEMES[_themeIdx]);
            });
            // Also apply CSS vars immediately (button may not exist yet but vars will)
            var root = document.documentElement;
            var t = THEMES[_themeIdx];
            root.style.setProperty("--theme", t.hex);
            root.style.setProperty(
              "--theme-rgb",
              t.r + ", " + t.g + ", " + t.b,
            );
          }
        } catch (e) {}
      })();

/* ══════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
        function historyFiltersActive() {
          // Active chips
          const chips = document.querySelectorAll(".hfilt.on");

          for (const chip of chips) {
            const txt = (chip.textContent || "").trim().toLowerCase();

            if (txt && txt !== "all" && txt !== "all time") {
              return true;
            }
          }

          // Dropdown filters
          const selects = document.querySelectorAll(
            ".history-filter-panel select, .compact-history-panel select",
          );

          for (const sel of selects) {
            const val = (sel.value || "").trim().toLowerCase();

            if (
              val &&
              val !== "all" &&
              val !== "all players" &&
              val !== "any" &&
              val !== "none"
            ) {
              return true;
            }
          }

          return false;
        }

        function toggleHistoryFeatureCards() {
          const active = historyFiltersActive();

          const cards = document.querySelectorAll(
            ".session-summary-card, .motd-card, .upset-card, .thriller-card",
          );

          cards.forEach((card) => {
            card.style.display = active ? "none" : "";
          });
        }

        function attachHistoryListeners() {
          document
            .querySelectorAll(
              ".hfilt, .history-filter-panel select, .compact-history-panel select",
            )
            .forEach((el) => {
              el.addEventListener("click", () => {
                setTimeout(toggleHistoryFeatureCards, 60);
              });

              el.addEventListener("change", () => {
                setTimeout(toggleHistoryFeatureCards, 60);
              });
            });
        }

        attachHistoryListeners();

        // Initial state
        setTimeout(toggleHistoryFeatureCards, 250);
      });

/* ══════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
        // Remove ALL PLAYERS cards
        document.querySelectorAll("*").forEach((el) => {
          const txt = (el.textContent || "").trim().toUpperCase();

          if (txt === "ALL PLAYERS" || txt.includes("ALL PLAYERS")) {
            // Find likely card container
            let parent = el;

            for (let i = 0; i < 5; i++) {
              if (!parent) break;

              if (
                parent.classList &&
                (parent.classList.contains("panel") ||
                  parent.classList.contains("card") ||
                  parent.classList.contains("ana-card") ||
                  parent.classList.contains("stats-card"))
              ) {
                parent.style.display = "none";
                break;
              }

              parent = parent.parentElement;
            }
          }
        });

        // Move Player vs Player Matrix to top
        const analyticsPage =
          document.querySelector("#analyticsPage") ||
          document.querySelector(".analytics-page") ||
          document.querySelector('[data-page="analytics"]');

        if (!analyticsPage) return;

        const matrixTitle = Array.from(
          analyticsPage.querySelectorAll("*"),
        ).find((el) => {
          const txt = (el.textContent || "").trim().toLowerCase();
          return txt.includes("player vs player");
        });

        if (!matrixTitle) return;

        // Find matrix block
        let matrixBlock =
          matrixTitle.closest("section") ||
          matrixTitle.closest(".card") ||
          matrixTitle.closest(".panel") ||
          matrixTitle.parentElement;

        if (!matrixBlock) return;

        // Insert near top
        const firstSection =
          analyticsPage.querySelector(".ana-section-title") ||
          analyticsPage.firstElementChild;

        if (firstSection && matrixBlock !== firstSection) {
          analyticsPage.insertBefore(matrixBlock, firstSection);
        }
      });

/* ══════════════════════════════════════ */

(function () {
        function formatPrettyDate(value) {
          if (!value) return value;

          const cleaned = value.replace(/[📅🗓️]/g, "").trim();

          const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);

          if (!match) return cleaned;

          const year = Number(match[1]);
          const month = Number(match[2]) - 1;
          const day = Number(match[3]);

          const months = [
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

          return `${day} ${months[month]} ${year}`;
        }

        function applyPrettyDates() {
          const selectors = [
            ".match-date",
            ".ss-date",
            ".date",
            ".card-date",
            ".history-date",
            ".motd-date",
            ".summary-date",
            ".analytics-date",
          ];

          selectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach((el) => {
              const raw = el.textContent.trim();
              if (!raw) return;

              const formatted = formatPrettyDate(raw);

              if (formatted !== raw) {
                el.textContent = formatted;
              }
            });
          });

          // fallback scan
          document.querySelectorAll("div, span, p").forEach((el) => {
            if (el.children.length > 0) return;

            const raw = el.textContent.trim();

            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
              el.textContent = formatPrettyDate(raw);
            }
          });
        }

        applyPrettyDates();

        setTimeout(applyPrettyDates, 100);
        setTimeout(applyPrettyDates, 500);
        setTimeout(applyPrettyDates, 1200);
      })();

/* ══════════════════════════════════════ */

function applySummaryTableAnimations() {
        document
          .querySelectorAll("table.cmp tbody tr")
          .forEach((row, index) => {
            row.style.setProperty("--row-index", index);
          });
      }

      setTimeout(applySummaryTableAnimations, 100);
      setTimeout(applySummaryTableAnimations, 500);
