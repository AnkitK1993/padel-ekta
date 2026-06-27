// ── CONFETTI ───────────────────────────────────────────────
// Canvas-based celebration animation. No src/ deps — pure DOM + canvas API.

export function fireConfetti(opts = {}) {
  const count = opts.count || 90;
  const duration = opts.duration || 2200;
  const colors = opts.colors || [
    "var(--theme)",
    "#f5c842",
    "#ff5fe5",
    "#5cd0ff",
    "#36d47e",
    "#ff7a3d",
    "#ffffff",
  ];
  // Resolve CSS vars to actual hex
  const resolvedColors = colors.map((c) => {
    if (!c.startsWith("var(")) return c;
    const name = c.slice(4, -1);
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || "#ffffff"
    );
  });
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 4 + 2,
    color: resolvedColors[Math.floor(Math.random() * resolvedColors.length)],
    size: Math.random() * 8 + 4,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.2,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));
  const startTime = performance.now();
  function tick(now) {
    const elapsed = now - startTime;
    const alpha = Math.max(0, 1 - elapsed / duration);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = alpha;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    if (elapsed < duration) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
  if (navigator.vibrate) {
    try {
      navigator.vibrate([12, 25, 12, 25, 30]);
    } catch (e) {}
  }
}
