// ── SHAREABLE SEASON RECAP IMAGE ───────────────────────────
// Draws a player's season recap onto a 1080x1350 canvas (Instagram/WhatsApp
// portrait) and hands it to the phone's share sheet, or downloads it where
// sharing files isn't supported. Plain Canvas 2D — no html2canvas download.
import { noteError } from "../src/infra/log.js";

function _theme() {
  const cs = getComputedStyle(document.documentElement);
  return (cs.getPropertyValue("--theme") || "#00c8ff").trim() || "#00c8ff";
}

// recap: computeSeasonRecap() result; extra: { season, rank, outOf, label, fmt }
export function drawRecapCard(recap, extra) {
  const W = 1080,
    H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const accent = _theme();

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b0b16");
  bg.addColorStop(1, "#151528");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, W);
  glow.addColorStop(0, accent + "55");
  glow.addColorStop(1, "transparent");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  const text = (s, x, y, size, color = "#f0ecff", weight = 800, align = "left") => {
    g.font = `${weight} ${size}px "DM Sans", system-ui, sans-serif`;
    g.fillStyle = color;
    g.textAlign = align;
    g.fillText(String(s), x, y);
  };
  const fit = (s, max, size) => {
    let sz = size;
    g.font = `900 ${sz}px "DM Sans", system-ui, sans-serif`;
    while (sz > 40 && g.measureText(s).width > max) {
      sz -= 4;
      g.font = `900 ${sz}px "DM Sans", system-ui, sans-serif`;
    }
    return sz;
  };

  text("EKTA PADEL", 80, 130, 34, accent, 900);
  text(`${extra.season} · SEASON RECAP`, 80, 180, 30, "#8080a0", 700);
  const nm = recap.name.toUpperCase();
  text(nm, 80, 320, fit(nm, W - 160, 120), "#ffffff", 900);

  // Headline tiles
  const tiles = [
    [extra.rank ? `#${extra.rank}` : "—", extra.outOf ? `of ${extra.outOf} players` : "rank"],
    [extra.fmt(recap.endRating), extra.label],
    [`${recap.winPct}%`, `${recap.mw}W – ${recap.ml}L`],
  ];
  const tw = (W - 160 - 2 * 30) / 3;
  tiles.forEach(([v, l], i) => {
    const x = 80 + i * (tw + 30);
    g.fillStyle = "rgba(255,255,255,0.06)";
    g.beginPath();
    g.roundRect ? g.roundRect(x, 400, tw, 220, 28) : g.rect(x, 400, tw, 220);
    g.fill();
    text(v, x + tw / 2, 520, fit(v, tw - 30, 84), i === 0 ? accent : "#ffffff", 900, "center");
    text(l, x + tw / 2, 580, 28, "#8080a0", 700, "center");
  });

  // Detail rows
  const rows = [];
  rows.push(["🎾", "Matches", `${recap.matchesPlayed} over ${recap.daysPlayed} day${recap.daysPlayed !== 1 ? "s" : ""}`]);
  rows.push(["📈", "Peak", `${extra.fmt(recap.peakRating)} ${extra.label}`]);
  if (recap.bestWinStreak) rows.push(["⚡", "Best streak", `${recap.bestWinStreak} wins in a row`]);
  if (recap.bestPartner) rows.push(["🤝", "Best partner", `${recap.bestPartner.name} · ${recap.bestPartner.pct.toFixed(0)}%`]);
  if (recap.favOpp) rows.push(["🎯", "Favourite opponent", recap.favOpp.name]);
  if (recap.nemesis) rows.push(["😈", "Nemesis", recap.nemesis.name]);
  rows.slice(0, 6).forEach(([icon, k, v], i) => {
    const y = 720 + i * 95;
    text(icon, 80, y, 44, "#ffffff", 400);
    text(k, 160, y, 32, "#8080a0", 700);
    const vs = fit(v, W - 160 - 520, 40);
    text(v, W - 80, y, Math.min(vs, 40), "#f0ecff", 800, "right");
  });

  text("ekta padel · season recap", W / 2, H - 70, 26, "#55557a", 700, "center");
  return c;
}

export async function shareRecapCard(recap, extra) {
  const canvas = drawRecapCard(recap, extra);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  if (!blob) return;
  const file = new File([blob], `${recap.name}-${extra.season}-recap.png`.replace(/\s+/g, "-"), { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `${recap.name} · ${extra.season}` });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return; // closed the share sheet
    noteError("recap-card:share", e);
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
