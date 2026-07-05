/* Confeti + lluvia de monedas en canvas. SOLO se usa en resultados (máx 80 partículas). */

const COLORES = ['#f2a7c0', '#8fd0f0', '#f7e3a1', '#bfe3d0', '#d9c7ee', '#ce6969', '#e9a83a'];

let rafId = 0;
let activo = false;

export function lanzarConfeti(canvas, { monedas = false } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  detener();
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const W = canvas.width;
  const H = canvas.height;

  const parts = [];
  const total = 80;
  for (let i = 0; i < total; i++) {
    const esMoneda = monedas && i % 4 === 0;
    parts.push({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.6,
      vx: (Math.random() - 0.5) * 60,
      vy: 90 + Math.random() * 140,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 6,
      w: esMoneda ? 12 : 6 + Math.random() * 6,
      h: esMoneda ? 12 : 4 + Math.random() * 4,
      color: COLORES[i % COLORES.length],
      moneda: esMoneda,
    });
  }

  activo = true;
  let ultimo = performance.now();
  let vivos = total;

  function frame(ts) {
    if (!activo) return;
    const dt = Math.min(0.05, (ts - ultimo) / 1000);
    ultimo = ts;
    ctx.clearRect(0, 0, W, H);
    vivos = 0;
    for (const p of parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y < H + 30) vivos++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.moneda) {
        ctx.fillStyle = '#e9a83a';
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c88a25';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.sin(ts / 300 + p.rot)) * p.h + 1);
      }
      ctx.restore();
    }
    if (vivos > 0) {
      rafId = requestAnimationFrame(frame);
    } else {
      detener();
      ctx.clearRect(0, 0, W, H);
    }
  }
  rafId = requestAnimationFrame(frame);
}

export function detener() {
  activo = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}
