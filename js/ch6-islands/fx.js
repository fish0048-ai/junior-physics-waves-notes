/** 任務完成的彩帶；減少動態時不播放 */
export function burst(host, colors) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.className = "isl-confetti";
  host.appendChild(canvas);
  const w = host.clientWidth;
  const h = host.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: 150 }, (_, i) => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.25,
    y: h * 0.42,
    vx: (Math.random() - 0.5) * 13,
    vy: -Math.random() * 11 - 5,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.35,
    size: 6 + Math.random() * 7,
    color: colors[i % colors.length],
    round: Math.random() < 0.3,
  }));

  const start = performance.now();
  function frame(now) {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    const alpha = Math.max(0, 1 - Math.max(0, t - 1.3) / 0.8);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    if (t < 2.1) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
