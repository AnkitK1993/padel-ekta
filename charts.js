// ── CHART / SVG BUILDERS ───────────────────────────────────
// Pure SVG string builders — no DOM, no app state. Data-bound chart helpers
// that need allMatches/computeStats (e.g. form sparklines, radar) stay in
// app.js for now; this module holds the genuinely pure ones.

let _hudGaugeId = 0;

// Semicircular skill-rating gauge (0–10). `ratingClass` carries the colour
// band (sr-high/sr-mid/sr-low [+rev-limit]); returns a self-contained SVG.
export function buildHudGaugeSvg(sr, ratingClass) {
  const uid = ++_hudGaugeId;
  const cx = 40,
    cy = 40,
    r = 33;
  const isHigh = ratingClass.includes("sr-high");
  const isMid = ratingClass.includes("sr-mid");
  const col = isHigh ? "#32d74b" : isMid ? "#ffd60a" : "#ff3b30";
  const rgb = isHigh ? "50,215,75" : isMid ? "255,214,10" : "255,59,48";
  const isRevLim = ratingClass.includes("rev-limit");

  const pct = Math.min(1, Math.max(0, sr / 10));
  const total = parseFloat((Math.PI * r).toFixed(2));
  const fill = parseFloat((pct * total).toFixed(2));
  const lx = cx - r,
    rx = cx + r;
  const arcPath = `M ${lx} ${cy} A ${r} ${r} 0 0 1 ${rx} ${cy}`;

  // 19 tick marks every 10° spanning the 180° semicircle
  let ticks = "";
  for (let step = 0; step <= 18; step++) {
    const deg = 180 - step * 10;
    const rad = (deg * Math.PI) / 180;
    const isMaj = step % 3 === 0;
    const ro = r + 4,
      ri = r + (isMaj ? 1 : 3);
    const x1 = (cx + ro * Math.cos(rad)).toFixed(1);
    const y1 = (cy - ro * Math.sin(rad)).toFixed(1);
    const x2 = (cx + ri * Math.cos(rad)).toFixed(1);
    const y2 = (cy - ri * Math.sin(rad)).toFixed(1);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${isMaj ? 1.4 : 0.8}" opacity="${isMaj ? 0.55 : 0.28}"/>`;
  }

  // Scale labels: 0 (left), 5 (top), 10 (right)
  const scalePts = [
    { ang: 180, lbl: "0", anc: "end", dx: -2, dy: 3 },
    { ang: 90, lbl: "5", anc: "middle", dx: 0, dy: -6 },
    { ang: 0, lbl: "10", anc: "start", dx: 2, dy: 3 },
  ];
  const scaleSvg = scalePts
    .map(({ ang, lbl, anc, dx, dy }) => {
      const rad = (ang * Math.PI) / 180;
      const sx = (cx + (r + 9) * Math.cos(rad) + dx).toFixed(1);
      const sy = (cy - (r + 9) * Math.sin(rad) + dy).toFixed(1);
      return `<text x="${sx}" y="${sy}" text-anchor="${anc}" font-size="5" font-family="monospace" fill="${col}" opacity="0.38">${lbl}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 80 48" class="hud-gauge-svg${isRevLim ? " hud-rev" : ""}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="hgf${uid}" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.5"/>
      </filter>
    </defs>
    <path d="M 2 ${cy + 4} L 2 ${cy - 11} L 11 ${cy - 11}" fill="none" stroke="${col}" stroke-width="1" opacity="0.55"/>
    <path d="M 78 ${cy + 4} L 78 ${cy - 11} L 69 ${cy - 11}" fill="none" stroke="${col}" stroke-width="1" opacity="0.55"/>
    ${ticks}
    <path d="${arcPath}" fill="none" stroke="rgba(${rgb},0.14)" stroke-width="2.5"/>
    <path d="${arcPath}" fill="none" stroke="${col}" stroke-width="5"
      stroke-dasharray="${total} ${total}" opacity="0.25"
      style="--fill:${fill};--total:${total}"
      filter="url(#hgf${uid})" class="hud-arc"/>
    <path d="${arcPath}" fill="none" stroke="${col}" stroke-width="2"
      stroke-dasharray="${total} ${total}" stroke-linecap="round"
      style="--fill:${fill};--total:${total}"
      class="hud-arc"/>
    <circle cx="${cx}" cy="${cy}" r="2.2" fill="${col}" opacity="0.9"/>
    <circle cx="${cx}" cy="${cy}" r="4"   fill="${col}" opacity="0.18" filter="url(#hgf${uid})"/>
    <line x1="${cx - 20}" y1="${cy + 4}" x2="${cx - 7}"  y2="${cy + 4}" stroke="${col}" stroke-width="0.7" opacity="0.35"/>
    <line x1="${cx + 7}"  y1="${cy + 4}" x2="${cx + 20}" y2="${cy + 4}" stroke="${col}" stroke-width="0.7" opacity="0.35"/>
    ${scaleSvg}
  </svg>`;
}
