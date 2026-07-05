/* Controles: teclado (flechas+WASD/P/Esc/M/Enter/Espacio), swipe en canvas, d-pad.
   Escribe la intención en un buffer compartido (última intención gana). */

export const DIRS = {
  arriba: { x: 0, y: -1 },
  abajo: { x: 0, y: 1 },
  izq: { x: -1, y: 0 },
  der: { x: 1, y: 0 },
};

// Buffer compartido: quien lo lea consume nextDir.
export const control = {
  nextDir: null,   // string clave de DIRS
  onPausa: null,   // callbacks cableados desde main
  onMute: null,
  onConfirm: null,
};

let cableado = false;

export function cablearInput(canvas) {
  if (cableado) return;
  cableado = true;

  window.addEventListener('keydown', (e) => {
    let dir = null;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': dir = 'arriba'; break;
      case 'ArrowDown': case 's': case 'S': dir = 'abajo'; break;
      case 'ArrowLeft': case 'a': case 'A': dir = 'izq'; break;
      case 'ArrowRight': case 'd': case 'D': dir = 'der'; break;
      case 'p': case 'P': case 'Escape': control.onPausa && control.onPausa(); return;
      case 'm': case 'M': control.onMute && control.onMute(); return;
      case 'Enter': case ' ': control.onConfirm && control.onConfirm(); if (e.key === ' ') e.preventDefault(); return;
      default: return;
    }
    if (dir) { control.nextDir = dir; e.preventDefault(); }
  });

  // Swipe en el canvas.
  let sx = 0, sy = 0, activo = false;
  const UMBRAL = 24;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    sx = t.clientX; sy = t.clientY; activo = true;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!activo) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > UMBRAL || Math.abs(dy) > UMBRAL) {
      if (Math.abs(dx) > Math.abs(dy)) control.nextDir = dx > 0 ? 'der' : 'izq';
      else control.nextDir = dy > 0 ? 'abajo' : 'arriba';
      sx = t.clientX; sy = t.clientY;
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { activo = false; }, { passive: true });
}

export function cablearDpad(dpad) {
  if (!dpad) return;
  dpad.querySelectorAll('[data-dir]').forEach((btn) => {
    const dir = btn.dataset.dir;
    const set = (e) => { control.nextDir = dir; e.preventDefault(); };
    btn.addEventListener('pointerdown', set);
    btn.addEventListener('touchstart', set, { passive: false });
  });
}
