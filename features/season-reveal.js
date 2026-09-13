// ── SEASON AWARDS REVEAL ────────────────────────────────────
// A celebratory, one-slide-at-a-time full-screen reveal of an already
// ARCHIVED season's frozen results (see archiveSeason()/viewSeasonArchive()
// in app.js). Reads only season.archivedSnapshot — never recomputes, so the
// numbers always match what viewSeasonArchive() shows. This is presentation
// on top of that existing data, not a second archival mechanism.
import { state } from "../src/domain/state.js";
import { escHtml } from "../src/ui/format.js";
import { fireConfetti } from "./confetti.js";

// Pure — no DOM. Order: Champion → MVP → Top Pair → Iron Man → Most Improved
// → Final Top 3. Any award missing from the snapshot is skipped. "Champion"
// (standings[0], rank-based) is deliberately a different label from "MVP"
// (_periodAwards' pick, mp>=2-gated) — they usually coincide but aren't
// guaranteed to, and "Champion" avoids colliding with the pre-existing
// "Season MVP" achievement (a monthly, unrelated concept).
export function buildSeasonRevealSlides(season) {
  const snap = season && season.archivedSnapshot;
  if (!snap) return [];
  const slides = [];
  const champion = snap.standings && snap.standings[0];
  if (champion) {
    slides.push({
      key: "champion",
      icon: "🏆",
      title: "Season Champion",
      name: champion.name,
      detail: `${champion.mw}W–${champion.ml}L · SR ${champion.sr.toFixed(2)}`,
      celebrate: true,
    });
  }
  if (snap.mvp) {
    slides.push({
      key: "mvp",
      icon: "🥇",
      title: "MVP",
      name: snap.mvp.name,
      detail: `${snap.mvp.mw}W / ${snap.mvp.mp}P`,
    });
  }
  if (snap.topPair) {
    slides.push({
      key: "toppair",
      icon: "🤝",
      title: "Top Pair",
      name: snap.topPair.players.join(" & "),
      detail: `${snap.topPair.winPct}% win rate`,
    });
  }
  if (snap.ironMan) {
    slides.push({
      key: "ironman",
      icon: "💪",
      title: "Iron Man",
      name: snap.ironMan.name,
      detail: `${snap.ironMan.mp} matches played`,
    });
  }
  if (snap.mostImproved) {
    slides.push({
      key: "mostimproved",
      icon: "📈",
      title: "Most Improved",
      name: snap.mostImproved.name,
      detail: "",
    });
  }
  if (snap.standings && snap.standings.length) {
    slides.push({
      key: "top3",
      icon: "🏅",
      title: "Final Top 3",
      top3: snap.standings
        .slice(0, 3)
        .map((p, i) => ({ rank: i + 1, name: p.name, sr: p.sr })),
    });
  }
  return slides;
}

// ── DOM wiring ───────────────────────────────────────────────
let _revealSlides = [];
let _revealIdx = 0;

function _slideHtml(slide) {
  if (slide.key === "top3") {
    const rows = slide.top3
      .map(
        (p) =>
          `<div class="reveal-top3-row"><span class="reveal-top3-rank">#${p.rank}</span><span class="reveal-top3-name">${escHtml(p.name)}</span><span class="reveal-top3-sr">${p.sr.toFixed(2)}</span></div>`,
      )
      .join("");
    return `<div class="reveal-slide"><div class="reveal-icon">${slide.icon}</div><div class="reveal-title">${escHtml(slide.title)}</div><div class="reveal-top3">${rows}</div></div>`;
  }
  return `<div class="reveal-slide"><div class="reveal-icon">${slide.icon}</div><div class="reveal-title">${escHtml(slide.title)}</div><div class="reveal-name">${escHtml(slide.name)}</div>${slide.detail ? `<div class="reveal-detail">${escHtml(slide.detail)}</div>` : ""}</div>`;
}

function _renderRevealSlide() {
  const body = document.getElementById("season-reveal-body");
  if (!body) return;
  const slide = _revealSlides[_revealIdx];
  body.innerHTML = slide ? _slideHtml(slide) : "";
  const dots = document.getElementById("season-reveal-dots");
  if (dots) {
    dots.innerHTML = _revealSlides
      .map((_, i) => `<span class="reveal-dot${i === _revealIdx ? " active" : ""}"></span>`)
      .join("");
  }
  const prevBtn = document.getElementById("season-reveal-prev");
  if (prevBtn) prevBtn.style.visibility = _revealIdx === 0 ? "hidden" : "visible";
  const nextBtn = document.getElementById("season-reveal-next");
  if (nextBtn) nextBtn.textContent = _revealIdx === _revealSlides.length - 1 ? "Done" : "Next ›";
  if (slide && slide.celebrate) fireConfetti({ count: 120, duration: 2600 });
}

export function openSeasonAwardsReveal(seasonId) {
  const season = state.seasons.find((s) => s.id === seasonId);
  if (!season || !season.archivedSnapshot) return;
  _revealSlides = buildSeasonRevealSlides(season);
  _revealIdx = 0;
  document.getElementById("season-reveal-modal")?.remove();
  if (!_revealSlides.length) return;
  const html = `<div id="season-reveal-modal" class="season-reveal-modal" role="dialog" aria-modal="true" aria-label="${escHtml(season.name)} season recap" onclick="if(event.target.id==='season-reveal-modal')closeSeasonReveal()">
    <button class="season-reveal-close" aria-label="Close" onclick="closeSeasonReveal()">✕</button>
    <div class="season-reveal-header">${escHtml(season.name)} Recap</div>
    <div id="season-reveal-body" class="season-reveal-body"></div>
    <div id="season-reveal-dots" class="season-reveal-dots"></div>
    <div class="season-reveal-nav">
      <button class="season-reveal-btn" id="season-reveal-prev" onclick="seasonRevealPrev()">‹ Back</button>
      <button class="season-reveal-btn season-reveal-btn-primary" id="season-reveal-next" onclick="seasonRevealNext()">Next ›</button>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  _renderRevealSlide();
}
export function seasonRevealNext() {
  if (_revealIdx >= _revealSlides.length - 1) {
    closeSeasonReveal();
    return;
  }
  _revealIdx++;
  _renderRevealSlide();
}
export function seasonRevealPrev() {
  if (_revealIdx <= 0) return;
  _revealIdx--;
  _renderRevealSlide();
}
export function closeSeasonReveal() {
  document.getElementById("season-reveal-modal")?.remove();
}
