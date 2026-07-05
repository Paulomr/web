/* Render en canvas: muros glaseado + piso + nevera + horno base a un offscreen
   (1x/nivel), y por frame migas, charcos, horno, leches, galleta, particulas y
   popups. Escala por devicePixelRatio. */

import { COLS, ROWS, TILE, FRIGHT_COLOR, FRIGHT_BLINK } from './config.js';
import { fx, dibujarParticulas, dibujarPopups } from './juice.js';
import { DIRS } from './input.js';
import { charcos, escalaCharco } from './charcos.js';
import { horno, estadoHorno } from './horno.js';
import { juego, estadoCrocancia } from './state.js';

const W = COLS * TILE;
const H = ROWS * TILE;

let capaEstatica = null;
let escala = 1;
let dpr = 1;

const centro = (t) => t * TILE + TILE / 2;
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches;

function esMuro(maze, x, y) {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return false;
  return maze.grid[y][x].tipo === 'muro';
}

// --- OFFSCREEN: piso + muros glaseado + nevera + horno base ---
export function drawMazeToOffscreen(maze, opts = {}) {
  const chocolate = opts.chocolate || false; // niveles pares
  const escalaOff = 2;
  const cvs = document.createElement('canvas');
  cvs.width = W * escalaOff;
  cvs.height = H * escalaOff;
  const g = cvs.getContext('2d');
  g.scale(escalaOff, escalaOff);

  // ---- PISO ----
  // vitrina (arriba) crema, cocina (abajo) apenas tostado, transicion en fila 10.
  const yCorte = centro(10);
  const gp = g.createLinearGradient(0, 0, 0, H);
  gp.addColorStop(0, '#fdf6ef');
  gp.addColorStop(Math.max(0, (yCorte - TILE) / H), '#fdf6ef');
  gp.addColorStop(Math.min(1, (yCorte + TILE) / H), '#f9efe2');
  gp.addColorStop(1, '#f9efe2');
  g.fillStyle = gp;
  g.fillRect(0, 0, W, H);

  // motas del piso
  g.fillStyle = 'rgba(243,230,216,0.6)';
  let semilla = 7;
  const rnd = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff; };
  for (let i = 0; i < 90; i++) {
    const px = rnd() * W, py = rnd() * H, rr = 0.6 + rnd() * 1.4;
    g.beginPath(); g.arc(px, py, rr, 0, Math.PI * 2); g.fill();
  }

  // halo frio alrededor de la nevera
  const nx = centro(9), ny = centro(9);
  const halo = g.createRadialGradient(nx, ny, TILE * 0.5, nx, ny, TILE * 3);
  halo.addColorStop(0, 'rgba(143,166,255,0.10)');
  halo.addColorStop(1, 'rgba(143,166,255,0)');
  g.fillStyle = halo;
  g.fillRect(nx - TILE * 3, ny - TILE * 3, TILE * 6, TILE * 6);

  // halo calido alrededor del horno
  const hx = centro(maze.hornoPos.x), hy = centro(maze.hornoPos.y);
  const haloH = g.createRadialGradient(hx, hy, TILE * 0.4, hx, hy, TILE * 2.2);
  haloH.addColorStop(0, 'rgba(255,154,61,0.14)');
  haloH.addColorStop(1, 'rgba(255,154,61,0)');
  g.fillStyle = haloH;
  g.fillRect(hx - TILE * 2.2, hy - TILE * 2.2, TILE * 4.4, TILE * 4.4);

  // ---- MUROS glaseado ----
  const col = chocolate
    ? { sombra: '#4a2d18', cuerpo0: '#8a5a33', cuerpo1: '#6b4226', linea: '#4a2d18', brillo: 'rgba(255,235,205,0.30)' }
    : { sombra: '#d97ba0', cuerpo0: '#f7bfd3', cuerpo1: '#eb93b4', linea: '#e5679b', brillo: 'rgba(255,255,255,0.35)' };

  const trazos = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!esMuro(maze, x, y)) continue;
      const cx = centro(x), cy = centro(y);
      if (esMuro(maze, x + 1, y)) trazos.push([cx, cy, centro(x + 1), cy]);
      if (esMuro(maze, x, y + 1)) trazos.push([cx, cy, cx, centro(y + 1)]);
    }
  }

  g.lineCap = 'round';
  g.lineJoin = 'round';

  const trazarLinea = (dx, dy, color, ancho) => {
    g.strokeStyle = color;
    g.lineWidth = ancho;
    g.beginPath();
    for (const [x0, y0, x1, y1] of trazos) { g.moveTo(x0 + dx, y0 + dy); g.lineTo(x1 + dx, y1 + dy); }
    g.stroke();
    g.fillStyle = color;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!esMuro(maze, x, y)) continue;
      g.beginPath(); g.arc(centro(x) + dx, centro(y) + dy, ancho / 2, 0, Math.PI * 2); g.fill();
    }
  };

  const grosor = TILE * 0.55;
  // (1) sombra
  trazarLinea(0, 2, col.sombra, grosor);
  // (2) cuerpo con gradiente vertical (aprox por bandas de color solido con glow bajo)
  if (!reduced) { g.shadowBlur = TILE * 0.5; g.shadowColor = chocolate ? 'rgba(107,66,38,0.35)' : 'rgba(242,167,192,0.45)'; }
  // usar gradiente global vertical clippeado al trazo: pintamos cuerpo0 y encima cuerpo1 mitad inferior
  trazarLinea(0, 0, col.cuerpo1, grosor);
  g.shadowBlur = 0;
  trazarLinea(0, -grosor * 0.18, col.cuerpo0, grosor * 0.62);
  // (3) highlight fino arriba + delineado exterior
  trazarLinea(0, -grosor * 0.28, col.brillo, grosor * 0.22);
  // delineado: contorno de cada trazo (linea fina del color de linea, un poco mas gruesa que el cuerpo)
  g.strokeStyle = col.linea;
  g.lineWidth = 1.4;
  g.globalAlpha = 0.9;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!esMuro(maze, x, y)) continue;
    // borde superior de bloques expuestos (aprox): dibujar circulo de contorno
    g.beginPath(); g.arc(centro(x), centro(y), grosor / 2, 0, Math.PI * 2); g.stroke();
  }
  g.globalAlpha = 1;

  // chispitas de azucar cada ~7 celdas de muro
  g.fillStyle = 'rgba(255,255,255,0.85)';
  let cont = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!esMuro(maze, x, y)) continue;
    cont++;
    if (cont % 7 === 0) {
      g.save();
      g.translate(centro(x), centro(y));
      g.rotate((x + y) * 0.7);
      g.fillRect(-1.1, -1.1, 2.2, 2.2);
      g.restore();
    }
  }

  // ---- NEVERA (cenital abierta) ----
  dibujarNevera(g, maze);

  // ---- HORNO base (marco) ----
  dibujarHornoBase(g, maze);

  capaEstatica = cvs;
  return cvs;
}

function dibujarNevera(g, maze) {
  const { x0, x1, y0, y1 } = maze.casa;
  const px = x0 * TILE, py = y0 * TILE;
  const pw = (x1 - x0 + 1) * TILE, ph = (y1 - y0 + 1) * TILE;
  // interior luz fria
  const grad = g.createLinearGradient(px, py, px, py + ph);
  grad.addColorStop(0, '#eef2fb');
  grad.addColorStop(1, '#dfe6f4');
  g.fillStyle = grad;
  roundRect(g, px + 2, py + 2, pw - 4, ph - 4, 5);
  g.fill();
  // parrillas (lineas frias)
  g.strokeStyle = 'rgba(143,166,255,0.5)';
  g.lineWidth = 1;
  for (let yy = py + TILE * 0.6; yy < py + ph - 2; yy += TILE * 0.55) {
    g.beginPath(); g.moveTo(px + 4, yy); g.lineTo(px + pw - 4, yy); g.stroke();
  }
  // marco blanco con borde
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  roundRect(g, px + 2, py + 2, pw - 4, ph - 4, 5); g.stroke();
  g.strokeStyle = '#c9d3e8';
  g.lineWidth = 1.2;
  roundRect(g, px + 2, py + 2, pw - 4, ph - 4, 5); g.stroke();
  // manija
  g.fillStyle = '#c9d3e8';
  roundRect(g, px + pw - 6, py + ph * 0.4, 3, ph * 0.2, 1.5); g.fill();
  // puerta (hueco): barra clara para indicar la salida (solo leches)
  const pu = maze.casa.puerta;
  g.fillStyle = 'rgba(200,211,232,0.6)';
  g.fillRect(pu.x * TILE + 3, centro(pu.y) - 1.5, TILE - 6, 3);
}

function dibujarHornoBase(g, maze) {
  const x = maze.hornoPos.x, y = maze.hornoPos.y;
  const px = x * TILE + 2, py = y * TILE + 2, s = TILE - 4;
  // marco chocolate
  g.fillStyle = '#6b4226';
  roundRect(g, px, py, s, s, 3); g.fill();
  g.fillStyle = '#8a5a33';
  roundRect(g, px + 1.5, py + 1.5, s - 3, s - 3, 2.5); g.fill();
  // ventana oscura
  g.fillStyle = '#3a2416';
  roundRect(g, px + 3, py + 3, s - 6, s - 6, 2); g.fill();
  // rejilla
  g.strokeStyle = 'rgba(255,154,61,0.35)';
  g.lineWidth = 0.8;
  for (let i = 1; i < 3; i++) {
    const yy = py + 3 + (s - 6) * i / 3;
    g.beginPath(); g.moveTo(px + 3, yy); g.lineTo(px + s - 3, yy); g.stroke();
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function ajustarCanvas(canvas, reservaPx = 0) {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  const stage = canvas.parentElement;
  const dispW = Math.max(120, stage.clientWidth);
  const dispH = Math.max(120, stage.clientHeight - reservaPx);
  escala = Math.min(dispW / W, dispH / H);
  const cssW = W * escala, cssH = H * escala;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
}

export function getEscala() { return escala; }

// --- MIGAS + POWER ---
function dibujarMigas(g, maze, t) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = maze.grid[y][x];
      if (c.hasPellet) {
        const cx = centro(x), cy = centro(y);
        // twinkle por casilla
        const tw = !reduced && (Math.sin(t * 3 + (x * 7 + y * 13)) > 0.94);
        const r = TILE * 0.14;
        const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
        gr.addColorStop(0, '#ffe08a');
        gr.addColorStop(1, '#f4c430');
        g.fillStyle = gr;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = tw ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)';
        g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.35, r * 0.3, 0, Math.PI * 2); g.fill();
      } else if (c.hasPower) {
        const cx = centro(x), cy = centro(y);
        const pulso = reduced ? 1 : 1.0 + Math.sin(t * 5.2) * 0.12;
        const rr = TILE * 0.34 * pulso;
        if (!reduced) {
          const aura = g.createRadialGradient(cx, cy, rr * 0.4, cx, cy, rr * 1.9);
          aura.addColorStop(0, 'rgba(244,196,48,0.5)');
          aura.addColorStop(1, 'rgba(244,196,48,0)');
          g.fillStyle = aura;
          g.beginPath(); g.arc(cx, cy, rr * 1.9, 0, Math.PI * 2); g.fill();
        }
        const gr = g.createRadialGradient(cx - rr * 0.3, cy - rr * 0.3, rr * 0.2, cx, cy, rr);
        gr.addColorStop(0, '#ffe08a');
        gr.addColorStop(1, '#f4c430');
        g.fillStyle = gr;
        g.strokeStyle = '#6b4226';
        g.lineWidth = 1.4;
        g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill(); g.stroke();
        // chispas de chocolate
        g.fillStyle = '#3f2415';
        for (const [dx, dy] of [[-0.3, -0.25], [0.28, 0.05], [0.02, 0.32], [-0.15, 0.2]]) {
          g.beginPath(); g.arc(cx + dx * rr, cy + dy * rr, rr * 0.15, 0, Math.PI * 2); g.fill();
        }
      }
    }
  }
}

// --- CHARCOS ---
function dibujarCharcos(g, t) {
  for (const c of charcos) {
    const cx = centro(c.x), cy = centro(c.y);
    const s = escalaCharco(c);
    if (s <= 0) continue;
    const rad = TILE * 0.44 * s;
    g.save();
    g.globalAlpha = 0.55;
    // elipse organica (8 puntos con ruido por semilla)
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const n = 0.82 + 0.18 * Math.sin(a * 3 + c.semilla);
      const rx = rad * n, ry = rad * 0.72 * n;
      const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry + rad * 0.15;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle = c.color;
    g.fill();
    // borde claro
    g.globalAlpha = 0.4;
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 1.2;
    g.stroke();
    // burbujitas
    g.globalAlpha = 0.6;
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath(); g.arc(cx - rad * 0.2, cy, rad * 0.12, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + rad * 0.25, cy + rad * 0.1, rad * 0.08, 0, Math.PI * 2); g.fill();
    // vapor al morir
    if (c.max - c.t < 2 && !reduced) {
      g.globalAlpha = 0.3 * (1 - (c.max - c.t) / 2 + 0.3);
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 1;
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        const bx = cx + k * rad * 0.35;
        g.moveTo(bx, cy - rad * 0.2);
        g.quadraticCurveTo(bx + 3, cy - rad - 4, bx - 2, cy - rad - 9);
        g.stroke();
      }
    }
    g.restore();
  }
}

// --- HORNO (estado dinamico encima del base) ---
function dibujarHornoEstado(g, t) {
  const cx = centro(horno.x), cy = centro(horno.y);
  const est = estadoHorno();
  const px = horno.x * TILE + 5, py = horno.y * TILE + 5, s = TILE - 10;
  g.save();
  if (est === 'cooldown') {
    // gris con humito
    g.fillStyle = 'rgba(185,170,156,0.85)';
    roundRect(g, px, py, s, s, 2); g.fill();
    if (!reduced) {
      g.globalAlpha = 0.4;
      g.strokeStyle = 'rgba(180,180,180,0.7)';
      g.lineWidth = 1.2;
      for (let k = -1; k <= 1; k++) {
        const bx = cx + k * TILE * 0.2 + Math.sin(t * 3 + k) * 2;
        g.beginPath(); g.moveTo(bx, cy - s * 0.3);
        g.quadraticCurveTo(bx + 3, cy - TILE, bx - 2, cy - TILE * 1.3);
        g.stroke();
      }
    }
  } else {
    const quema = est === 'quema';
    const base = quema ? '#ff5a3d' : '#ff9a3d';
    const respira = reduced ? 1 : (quema ? (Math.floor(t * 8) % 2 ? 1 : 0.5) : 0.7 + Math.sin(t * 4) * 0.3);
    g.globalAlpha = respira;
    const gr = g.createRadialGradient(cx, cy, 1, cx, cy, s * 0.7);
    gr.addColorStop(0, quema ? '#ffd08a' : '#ffca7a');
    gr.addColorStop(1, base);
    g.fillStyle = gr;
    roundRect(g, px, py, s, s, 2); g.fill();
    // chispas ascendentes al re-tostar (calor > 0 y no quema aun)
    if (!reduced && est === 'calentando') {
      g.globalAlpha = 0.9;
      g.fillStyle = '#ffd971';
      for (let k = 0; k < 3; k++) {
        const ph = (t * 2 + k * 0.4) % 1;
        const sx = cx + (Math.sin(k * 2 + t) * TILE * 0.2);
        const sy = cy + s * 0.4 - ph * TILE * 0.9;
        g.beginPath(); g.arc(sx, sy, 1.3 * (1 - ph), 0, Math.PI * 2); g.fill();
      }
    }
  }
  g.restore();
}

// --- GALLETA JUGADOR ---
function dibujarGalleta(g, p, t) {
  const est = estadoCrocancia();
  let r = TILE * 0.46;
  const glaseado = p.glaseado > 0;

  // estela de glaseado
  if (glaseado && !reduced) {
    for (let i = p.estela.length - 1; i >= 0; i--) {
      const e = p.estela[i];
      g.globalAlpha = 0.12 * (1 - i / p.estela.length);
      g.fillStyle = '#f4c430';
      g.beginPath(); g.arc(e.x, e.y, r * (0.9 - i * 0.1), 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }

  // parpadeo por invulnerabilidad
  if (p.invuln > 0 && Math.floor(t * 12) % 2 === 0 && !reduced) return;

  const ang = { der: 0, abajo: Math.PI / 2, izq: Math.PI, arriba: -Math.PI / 2 }[p.dir] || 0;
  g.save();
  g.translate(p.x, p.y);

  // sombra elipse
  g.globalAlpha = 0.12;
  g.fillStyle = '#1b2233';
  g.beginPath(); g.ellipse(0, r * 0.85, r * 0.8, r * 0.3, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;

  g.rotate(ang);

  // squash & stretch en giros + estados
  let sx = 1, sy = 1;
  if (p.turnSquash > 0) { sx = 1.1; sy = 0.9; }
  if (est === 'empapada') { sy *= 0.94; } // pandeada
  if (p.dead) { sy = Math.max(0.15, 1 - p.deathT / 1.2); }
  g.scale(sx, sy);

  const semi = p.dead ? 0.06 + p.deathT * 1.2 : p.bocaAngulo();

  // cuerpo
  const grad = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  if (glaseado) {
    grad.addColorStop(0, '#ffe08a');
    grad.addColorStop(1, '#f4c430');
  } else if (p.dead) {
    grad.addColorStop(0, '#b98a52');
    grad.addColorStop(1, '#8a6134');
  } else {
    grad.addColorStop(0, '#e8a84c');
    grad.addColorStop(1, '#c98634');
  }
  g.fillStyle = grad;
  g.strokeStyle = glaseado ? '#c98634' : '#1b2233';
  g.lineWidth = 1.6;

  if (est === 'humeda' && !p.dead && !glaseado && !reduced) {
    // borde senoidal ondulado
    g.beginPath();
    g.moveTo(0, 0);
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const a = semi + (Math.PI * 2 - 2 * semi) * (i / n);
      const wob = 1 + Math.sin(a * 6 + t * 8) * 0.04;
      g.lineTo(Math.cos(a) * r * wob, Math.sin(a) * r * wob);
    }
    g.closePath();
  } else {
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, r, semi, Math.PI * 2 - semi);
    g.closePath();
  }
  if (est === 'humeda' && !glaseado) g.globalAlpha = 0.92; // -saturacion aprox
  g.fill();
  g.globalAlpha = 1;
  g.stroke();

  // chispas de chocolate
  g.fillStyle = '#3f2415';
  for (const [dx, dy] of [[-0.2, -0.35], [0.3, 0.1], [-0.35, 0.3], [0.15, -0.15], [0.0, 0.4], [-0.4, -0.05]]) {
    g.beginPath(); g.arc(dx * r, dy * r, r * 0.11, 0, Math.PI * 2); g.fill();
  }

  // ojos (miran a la direccion). En glaseado, cejas de valiente.
  if (!p.dead) {
    const er = r * 0.16;
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(r * 0.15, -r * 0.32, er, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(r * 0.15, r * 0.32, er, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b2233';
    g.beginPath(); g.arc(r * 0.22, -r * 0.32, er * 0.55, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(r * 0.22, r * 0.32, er * 0.55, 0, Math.PI * 2); g.fill();
    if (glaseado) {
      g.strokeStyle = '#6b4226'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(r * 0.02, -r * 0.5); g.lineTo(r * 0.28, -r * 0.42); g.stroke();
      g.beginPath(); g.moveTo(r * 0.02, r * 0.5); g.lineTo(r * 0.28, r * 0.42); g.stroke();
    }
  }
  g.restore();

  // gotas si humeda/empapada
  if ((est === 'humeda' || est === 'empapada') && !p.dead && !glaseado && !reduced) {
    g.fillStyle = 'rgba(232,236,244,0.9)';
    const gotas = est === 'empapada' ? 3 : 2;
    for (let i = 0; i < gotas; i++) {
      const gx = p.x + (i - 1) * r * 0.5;
      const gy = p.y + r * 0.6 + ((t * 20 + i * 7) % (r * 0.8));
      g.beginPath(); g.arc(gx, gy, 1.3, 0, Math.PI * 2); g.fill();
    }
  }
}

// --- LECHE (vaso con gradiente + fleco onda + ojos) ---
function dibujarLeche(g, gh, t) {
  const r = TILE * (gh.nombre === 'fresita' ? 0.50 : (gh.nombre === 'kumis' ? 0.50 : 0.47));
  const anchoVaso = gh.nombre === 'kumis' ? r * 1.15 : r;

  // sombra
  g.save();
  g.globalAlpha = 0.12;
  g.fillStyle = '#1b2233';
  g.beginPath(); g.ellipse(gh.x, gh.y + r * 0.85, r * 0.8, r * 0.28, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  g.save();
  g.translate(gh.x, gh.y);

  const ojos = gh.estado === 'ojos';
  const relleno = gh.estado === 'rellenando';
  let liq0, liq1, brillo;
  if (gh.frightened) {
    const c = gh.frightBlink ? FRIGHT_BLINK : FRIGHT_COLOR;
    liq0 = c; liq1 = c; brillo = '#ffffff';
  } else {
    switch (gh.nombre) {
      case 'fresita': liq0 = '#f2a7c0'; liq1 = '#e5679b'; brillo = '#ffd0e2'; break;
      case 'lactea': liq0 = '#ffffff'; liq1 = '#e8ecf4'; brillo = '#ffffff'; break;
      case 'moka': liq0 = '#8a5a33'; liq1 = '#6b4226'; brillo = '#a9764a'; break;
      case 'kumis': liq0 = '#f6ecd9'; liq1 = '#ece0c8'; brillo = '#fffaf0'; break;
    }
  }

  const vh = r * 1.7; // alto del vaso
  const vw = anchoVaso * 1.7;
  const top = -r * 0.85;

  // nivel de liquido (para rellenado)
  const nivelLiq = relleno ? Math.min(1, gh.rellenoT / 3) : 1;

  // vaso: contorno de vidrio
  const glassPath = () => {
    g.beginPath();
    g.moveTo(-vw / 2, top);
    g.lineTo(vw / 2, top);
    g.lineTo(vw / 2 * 0.82, top + vh);
    g.lineTo(-vw / 2 * 0.82, top + vh);
    g.closePath();
  };

  if (ojos) {
    // vaso vacio: solo contorno + ojos
    glassPath();
    g.fillStyle = 'rgba(220,228,240,0.25)';
    g.fill();
    g.strokeStyle = 'rgba(120,140,170,0.7)';
    g.lineWidth = 1.4;
    g.stroke();
  } else {
    // liquido con gradiente vertical, respetando nivelLiq
    const liqTop = top + vh * (1 - nivelLiq);
    const grad = g.createLinearGradient(0, liqTop, 0, top + vh);
    grad.addColorStop(0, liq0);
    grad.addColorStop(1, liq1);
    g.save();
    glassPath();
    g.clip();
    g.fillStyle = grad;
    g.fillRect(-vw, liqTop, vw * 2, vh);
    // fleco de onda liquida en la superficie
    g.fillStyle = liq0;
    g.beginPath();
    const surfY = liqTop;
    g.moveTo(-vw / 2, surfY + 3);
    for (let i = 0; i <= 12; i++) {
      const xx = -vw / 2 + (vw) * (i / 12);
      const yy = surfY + Math.sin(gh.fase + i * 0.9) * 2.2;
      g.lineTo(xx, yy);
    }
    g.lineTo(vw / 2, surfY + 3);
    g.closePath();
    g.fill();
    g.restore();
    // brillo del vaso
    g.globalAlpha = 0.5;
    g.fillStyle = brillo;
    g.fillRect(-vw / 2 + 2, top + 2, vw * 0.18, vh - 4);
    g.globalAlpha = 1;
    // contorno del vaso
    glassPath();
    g.strokeStyle = 'rgba(120,140,170,0.55)';
    g.lineWidth = 1.2;
    g.stroke();

    // detalles por personalidad
    if (!gh.frightened) {
      if (gh.nombre === 'fresita') {
        // pajita rosada doblada
        g.strokeStyle = '#e5679b'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(vw * 0.15, top - r * 0.5); g.lineTo(vw * 0.05, top + 2); g.stroke();
        g.beginPath(); g.moveTo(vw * 0.15, top - r * 0.5); g.lineTo(vw * 0.32, top - r * 0.65); g.stroke();
        // burbujas de hervor
        if (gh.hervor && !reduced) {
          g.fillStyle = 'rgba(255,208,226,0.9)';
          for (let k = 0; k < 3; k++) {
            const ph = (t * 1.5 + k * 0.33) % 1;
            g.beginPath(); g.arc((k - 1) * vw * 0.2, top + vh * 0.5 - ph * vh * 0.4, 1.4 * (1 - ph), 0, Math.PI * 2); g.fill();
          }
        }
      } else if (gh.nombre === 'lactea') {
        // tapita de carton
        g.fillStyle = '#dfe6f4';
        g.fillRect(-vw / 2, top - 3, vw, 3);
      } else if (gh.nombre === 'moka') {
        // chorreado de chocolate en el borde
        g.fillStyle = '#4a2d18';
        g.beginPath();
        g.moveTo(-vw / 2, top);
        g.quadraticCurveTo(-vw * 0.2, top + r * 0.5, 0, top + r * 0.2);
        g.quadraticCurveTo(vw * 0.25, top + r * 0.6, vw / 2, top);
        g.lineTo(vw / 2, top - 1); g.lineTo(-vw / 2, top - 1);
        g.closePath(); g.fill();
      } else if (gh.nombre === 'kumis') {
        // burbujitas
        g.fillStyle = 'rgba(255,255,255,0.5)';
        for (const [bx, by] of [[-0.2, 0.3], [0.25, 0.5], [0.1, 0.2]]) {
          g.beginPath(); g.arc(bx * vw, top + vh * by, 1.5, 0, Math.PI * 2); g.fill();
        }
      }
    }
  }

  // ---- OJOS ----
  const dir = DIRS[gh.dir] || { x: 0, y: 0 };
  const ex = vw * 0.22, ey = top + vh * 0.32, erx = r * 0.22, ery = r * 0.26;
  if (gh.frightened && !ojos) {
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(-ex, ey, erx * 0.8, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(ex, ey, erx * 0.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b2233';
    g.beginPath(); g.arc(-ex, ey, erx * 0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(ex, ey, erx * 0.4, 0, Math.PI * 2); g.fill();
    // boca zigzag
    g.strokeStyle = gh.frightBlink ? '#e5679b' : '#1b2233';
    g.lineWidth = 1.3;
    g.beginPath();
    const y0 = ey + r * 0.5;
    for (let i = 0; i <= 6; i++) {
      const xx = -vw * 0.3 + (i / 6) * vw * 0.6;
      const yy = y0 + (i % 2 === 0 ? 0 : -r * 0.18);
      i === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
    }
    g.stroke();
  } else {
    // esclerotica + pupila mirando a dir
    // Kumis: ojos bizcos (pupilas hacia el centro)
    const bizco = gh.nombre === 'kumis' && !ojos;
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(-ex, ey, erx, ery, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(27,34,51,0.25)'; g.lineWidth = 0.8;
    g.beginPath(); g.ellipse(-ex, ey, erx, ery, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#1b2233';
    let px1 = dir.x * erx * 0.4, py1 = dir.y * ery * 0.45;
    let px2 = px1, py2 = py1;
    if (bizco) { px1 = erx * 0.3; px2 = -erx * 0.3; py1 = py2 = ery * 0.1; }
    g.beginPath(); g.arc(-ex + px1, ey + py1, erx * 0.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(ex + px2, ey + py2, erx * 0.5, 0, Math.PI * 2); g.fill();
    // pestañas de Fresita
    if (gh.nombre === 'fresita' && !ojos) {
      g.strokeStyle = '#1b2233'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-ex - erx, ey - ery); g.lineTo(-ex - erx * 1.5, ey - ery * 1.4); g.stroke();
      g.beginPath(); g.moveTo(ex + erx, ey - ery); g.lineTo(ex + erx * 1.5, ey - ery * 1.4); g.stroke();
    }
  }
  g.restore();
}

// --- ANTOJO ---
function dibujarAntojo(g, antojo) {
  if (!antojo || !antojo.activa) return;
  const cx = centro(antojo.x), cy = centro(antojo.y);
  const s = antojo.pop < 1 ? antojo.pop : 1;
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  if (!reduced) { g.shadowBlur = TILE * 0.4; g.shadowColor = antojo.color; }
  g.fillStyle = antojo.color;
  const r = TILE * 0.36;
  // base
  g.beginPath(); g.arc(0, 2, r, 0, Math.PI * 2); g.fill();
  g.shadowBlur = 0;
  // toque de crema
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath(); g.arc(0, -r * 0.4, r * 0.4, 0, Math.PI * 2); g.fill();
  // cerecita
  g.fillStyle = '#e5679b';
  g.beginPath(); g.arc(0, -r * 0.7, r * 0.16, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function drawFrame(canvas, maze, player, ghosts, antojo, t) {
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.scale(dpr * escala, dpr * escala);

  if ((fx.shake > 0 || fx.zoom > 0) && !reduced) {
    const sx = (Math.random() - 0.5) * fx.shake * 2;
    const sy = (Math.random() - 0.5) * fx.shake * 2;
    g.translate(W / 2, H / 2);
    g.scale(1 + fx.zoom, 1 + fx.zoom);
    g.translate(-W / 2 + sx, -H / 2 + sy);
  }

  if (capaEstatica) g.drawImage(capaEstatica, 0, 0, W, H);

  dibujarCharcos(g, t);
  dibujarMigas(g, maze, t);
  dibujarHornoEstado(g, t);
  dibujarAntojo(g, antojo);

  for (const gh of ghosts) dibujarLeche(g, gh, t);
  dibujarGalleta(g, player, t);

  dibujarParticulas(g);
  dibujarPopups(g);

  // viñeta de flash (salpicada/quemadura/power)
  if (fx.flash > 0) {
    if (fx.flashColor) {
      const vg = g.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, fx.flashColor.replace('ALPHA', String(fx.flash)));
      g.fillStyle = vg;
    } else {
      g.fillStyle = `rgba(255,255,255,${fx.flash})`;
    }
    g.fillRect(0, 0, W, H);
  }
}

export { W as ANCHO_LOGICO, H as ALTO_LOGICO };
