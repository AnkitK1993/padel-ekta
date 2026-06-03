"use strict";

// Generate PNG app icons from the same design as icons/icon.svg.
//
// WHY: iOS ignores SVG for the home-screen / apple-touch icon, so an SVG-only
// manifest gives a blank or default icon when the PWA is installed on iPhone.
// This produces real PNGs (180 for apple-touch, 192/512 for the manifest).
//
// Zero-dependency: rasterises with plain math + Node's built-in zlib (no canvas
// / sharp / imagemagick). Renders at 3x then box-downsamples for clean edges.
//
//   node scripts/gen-icons.js
//
// Re-run whenever the brand mark changes; keep the drawing in sync with
// icons/icon.svg by eye (the SVG remains the source for any-size/maskable use).

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const OUT_DIR = path.resolve(__dirname, "..", "icons");
const SS = 3; // supersample factor for anti-aliasing

// ── tiny RGBA canvas ────────────────────────────────────────
function makeCanvas(w, h) {
  return { w, h, px: new Float64Array(w * h * 4) };
}
function setPx(c, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  const ia = 1 - a;
  c.px[i] = r * a + c.px[i] * ia;
  c.px[i + 1] = g * a + c.px[i + 1] * ia;
  c.px[i + 2] = b * a + c.px[i + 2] * ia;
  c.px[i + 3] = a + c.px[i + 3] * ia;
}

// Linear-gradient fill (top-left → bottom-right), matching the SVG #bg.
function fillBgGradient(c, c0, c1) {
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const t = (x + y) / (c.w + c.h);
      setPx(c, x, y, lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t), 1);
    }
  }
}
const lerp = (a, b, t) => a + (b - a) * t;

// Stroked ellipse (outline) via signed distance to the ellipse curve.
function strokeEllipse(c, cx, cy, rx, ry, width, col, alpha) {
  const half = width / 2;
  const x0 = Math.floor(cx - rx - half), x1 = Math.ceil(cx + rx + half);
  const y0 = Math.floor(cy - ry - half), y1 = Math.ceil(cy + ry + half);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // Approximate distance to the ellipse boundary.
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      const norm = Math.hypot(nx, ny);
      if (norm === 0) continue;
      const d = (norm - 1) * Math.min(rx, ry);
      const aa = 1 - smooth(Math.abs(d), half - 1, half + 1);
      if (aa > 0) setPx(c, x, y, col[0], col[1], col[2], aa * alpha);
    }
  }
}

// Filled rounded rect (the grip handle).
function fillRoundRect(c, x, y, w, h, r, col, alpha) {
  for (let py = Math.floor(y); py < Math.ceil(y + h); py++) {
    for (let px = Math.floor(x); px < Math.ceil(x + w); px++) {
      const dx = Math.max(x + r - px, px - (x + w - r), 0);
      const dy = Math.max(y + r - py, py - (y + h - r), 0);
      const d = Math.hypot(dx, dy);
      const aa = 1 - smooth(d, r - 1, r + 1);
      if (aa > 0) setPx(c, px, py, col[0], col[1], col[2], aa * alpha);
    }
  }
}

// Round-capped line (the strings).
function strokeLine(c, x1, y1, x2, y2, width, col, alpha) {
  const half = width / 2;
  const minX = Math.floor(Math.min(x1, x2) - half), maxX = Math.ceil(Math.max(x1, x2) + half);
  const minY = Math.floor(Math.min(y1, y2) - half), maxY = Math.ceil(Math.max(y1, y2) + half);
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let t = ((x - x1) * dx + (y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + t * dx, py = y1 + t * dy;
      const d = Math.hypot(x - px, y - py);
      const aa = 1 - smooth(d, half - 1, half + 1);
      if (aa > 0) setPx(c, x, y, col[0], col[1], col[2], aa * alpha);
    }
  }
}
function smooth(d, a, b) {
  if (d <= a) return 0;
  if (d >= b) return 1;
  const t = (d - a) / (b - a);
  return t * t * (3 - 2 * t);
}

// ── draw the icon at scale S (viewBox is 512) ───────────────
function drawIcon(size) {
  const S = (size * SS) / 512; // px per SVG unit
  const c = makeCanvas(size * SS, size * SS);
  const P = (v) => v * S;
  const accent = [124, 58, 237]; // #7c3aed
  const accentLite = [167, 139, 250]; // #a78bfa
  const mix = accent.map((v, i) => (v + accentLite[i]) / 2);

  fillBgGradient(c, [26, 26, 46], [9, 9, 15]); // #1a1a2e → #09090f

  // racket head (ellipse cx256 cy210 rx90 ry108 stroke 18)
  strokeEllipse(c, P(256), P(210), P(90), P(108), P(18), mix, 1);
  // grip handle (rect x242 y310 w28 h90 r14)
  fillRoundRect(c, P(242), P(310), P(28), P(90), P(14), mix, 1);
  // strings (3 horizontal + 3 vertical, opacity 0.5, width 6)
  const strW = P(6), sa = 0.5;
  strokeLine(c, P(166), P(190), P(346), P(190), strW, mix, sa);
  strokeLine(c, P(166), P(220), P(346), P(220), strW, mix, sa);
  strokeLine(c, P(166), P(250), P(346), P(250), strW, mix, sa);
  strokeLine(c, P(226), P(110), P(226), P(312), strW, mix, sa);
  strokeLine(c, P(256), P(110), P(256), P(312), strW, mix, sa);
  strokeLine(c, P(286), P(110), P(286), P(312), strW, mix, sa);

  return downsample(c, size);
}

// Box-average SSxSS blocks → final size (anti-aliasing).
function downsample(c, size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * c.w + (x * SS + sx)) * 4;
          r += c.px[i]; g += c.px[i + 1]; b += c.px[i + 2]; a += c.px[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

// ── minimal PNG encoder (RGBA, no filter) ───────────────────
function encodePng(rgba, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

// ── emit ────────────────────────────────────────────────────
const sizes = [
  { name: "icon-180.png", size: 180 }, // apple-touch-icon
  { name: "icon-192.png", size: 192 }, // manifest
  { name: "icon-512.png", size: 512 }, // manifest / maskable
];
for (const { name, size } of sizes) {
  const rgba = drawIcon(size);
  const png = encodePng(rgba, size, size);
  fs.writeFileSync(path.join(OUT_DIR, name), png);
  console.log(`wrote icons/${name} (${png.length} bytes)`);
}
