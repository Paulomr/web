/* Juice: partículas, popups de puntaje, flash, shake, confeti. Pools reutilizables.
   Todo gateado por reducedMotion (deja estados finales legibles). */

export const reducedMotion =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches;

const MAX_PART = 160;
const particulas = [];
for (let i = 0; i < MAX_PART; i++) particulas.push({ activo: false, x: 0, y: 0, vx: 0, vy: 0, vida: 0, max: 1, r: 2, color: '#fff', grav: 0 });

const MAX_POP = 24;
const popups = [];
for (let i = 0; i < MAX_POP; i++) popups.push({ activo: false, x: 0, y: 0, vida: 0, max: 1, texto: '', color: '#fff', tam: 12 });

// estado de efectos de pantalla
export const fx = { shake: 0, shakeMax: 0, flash: 0, zoom: 0, zoomMax: 0, flashColor: null };

function libre(pool) {
  for (let i = 0; i < pool.length; i++) if (!pool[i].activo) return pool[i];
  return null;
}

export function emitirParticulas(x, y, n, colores, opts = {}) {
  if (reducedMotion) return;
  const spd = opts.spd ?? 60;
  const grav = opts.grav ?? 120;
  const vida = opts.vida ?? 0.5;
  for (let i = 0; i < n; i++) {
    const p = libre(particulas);
    if (!p) return;
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
    const s = spd * (0.5 + Math.random());
    p.activo = true;
    p.x = x; p.y = y;
    p.vx = Math.cos(ang) * s;
    p.vy = Math.sin(ang) * s - (opts.up ?? 0);
    p.vida = 0; p.max = vida * (0.7 + Math.random() * 0.6);
    p.r = (opts.r ?? 2) * (0.7 + Math.random() * 0.8);
    p.grav = grav;
    p.color = colores[(Math.random() * colores.length) | 0];
  }
}

export function popup(x, y, texto, color = '#57d9c4', tam = 14) {
  const p = libre(popups);
  if (!p) return;
  p.activo = true;
  p.x = x; p.y = y - 4;
  p.vida = 0; p.max = 0.9;
  p.texto = texto; p.color = color; p.tam = tam;
}

export function flash(intensidad = 0.6) {
  fx.flashColor = null;
  fx.flash = Math.min(0.85, intensidad); // permitido incluso con reducedMotion (aviso legible)
}

// Flash de viñeta de color (salpicada rosada/blanca, quemadura naranja).
// colorRGBA usa el token 'ALPHA' que el render reemplaza por la intensidad.
export function flashVineta(intensidad, colorRGBA) {
  fx.flashColor = colorRGBA;
  fx.flash = Math.min(0.85, intensidad);
}

export function shake(intensidad = 6) {
  if (reducedMotion) return;
  fx.shake = intensidad; fx.shakeMax = intensidad;
}

export function zoomPunch(escala = 0.03) {
  if (reducedMotion) return;
  fx.zoom = escala; fx.zoomMax = escala;
}

export function confeti(x, y, w) {
  if (reducedMotion) return;
  const cols = ['#f2a7c0', '#f4c430', '#57d9c4', '#e5679b', '#ffd971'];
  for (let i = 0; i < 40; i++) {
    const p = libre(particulas);
    if (!p) break;
    p.activo = true;
    p.x = x + (Math.random() - 0.5) * w;
    p.y = y - 20;
    p.vx = (Math.random() - 0.5) * 120;
    p.vy = -Math.random() * 140 - 40;
    p.vida = 0; p.max = 1.1 + Math.random() * 0.6;
    p.r = 2.5 + Math.random() * 2;
    p.grav = 220;
    p.color = cols[(Math.random() * cols.length) | 0];
  }
}

export function actualizarJuice(dt) {
  for (const p of particulas) {
    if (!p.activo) continue;
    p.vida += dt;
    if (p.vida >= p.max) { p.activo = false; continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (const p of popups) {
    if (!p.activo) continue;
    p.vida += dt;
    if (p.vida >= p.max) { p.activo = false; continue; }
    p.y -= 22 * dt;
  }
  if (fx.shake > 0) { fx.shake = Math.max(0, fx.shake - dt * fx.shakeMax * 3); }
  if (fx.flash > 0) { fx.flash = Math.max(0, fx.flash - dt * 3.2); }
  if (fx.zoom > 0) { fx.zoom = Math.max(0, fx.zoom - dt * fx.zoomMax * 5); }
}

export function dibujarParticulas(ctx) {
  for (const p of particulas) {
    if (!p.activo) continue;
    const a = 1 - p.vida / p.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function dibujarPopups(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of popups) {
    if (!p.activo) continue;
    const t = p.vida / p.max;
    const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `700 ${p.tam}px "Baloo 2", system-ui, sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(27,34,51,.85)';
    ctx.strokeText(p.texto, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.texto, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

export function limpiarJuice() {
  for (const p of particulas) p.activo = false;
  for (const p of popups) p.activo = false;
  fx.shake = fx.flash = fx.zoom = 0;
}
