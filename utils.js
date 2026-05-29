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
        const CACHE_TTL = 1000 * 60 * 60 * 24 * 7;
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
        { name: "Neon Blue", hex: "#18d7ff", r: 24, g: 215, b: 255 },
        { name: "Gold", hex: "#f5c842", r: 245, g: 200, b: 66 },
        { name: "Neon Green", hex: "#00ff9d", r: 0, g: 255, b: 157 },
        { name: "Neon Pink", hex: "#ff2d78", r: 255, g: 45, b: 120 },
        { name: "Neon Purple", hex: "#b44dff", r: 180, g: 77, b: 255 },
        { name: "Red", hex: "#ff3b3b", r: 255, g: 59, b: 59 },
        { name: "Royal Blue", hex: "#2563eb", r: 37, g: 99, b: 235 },
        { name: "Crimson", hex: "#dc2626", r: 220, g: 38, b: 38 },
        { name: "Forest", hex: "#15803d", r: 21, g: 128, b: 61 },
        { name: "Cyberpunk", hex: "#ff00d4", r: 255, g: 0, b: 212 },
        { name: "Mono", hex: "#c0c0c0", r: 192, g: 192, b: 192 },
        { name: "Holo HUD", hex: "#5cd0ff", r: 92, g: 208, b: 255, mode: "holo" },
        { name: "Royal Gold", hex: "#fbbf24", r: 251, g: 191, b: 36, mode: "royal-gold" },
        { name: "Midnight OLED", hex: "#00c8ff", r: 0, g: 200, b: 255, mode: "midnight-oled" },
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
        // Special modes (e.g. Holo HUD restructures the Detailed cards)
        if (document.body) {
          document.body.classList.toggle("holo-mode", t.mode === "holo");
          document.body.classList.toggle("royal-gold-mode", t.mode === "royal-gold");
          document.body.classList.toggle("midnight-oled-mode", t.mode === "midnight-oled");
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
          localStorage.setItem("padel-theme-idx", _themeIdx);
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

      // Restore saved theme immediately
      (function () {
        try {
          var saved = parseInt(localStorage.getItem("padel-theme-idx"), 10);
          if (!isNaN(saved) && saved >= 0 && saved < THEMES.length) {
            _themeIdx = saved;
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
