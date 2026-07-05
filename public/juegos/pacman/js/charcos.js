/* Charcos de leche: casillas inundadas temporales. Frenan y empapan a la galleta;
   las leches los cruzan sin penalidad; con glaseado la galleta los evapora. */

import { TILE, CHARCO_VIDA_S, CHARCO_MAX } from './config.js';

const centro = (t) => t * TILE + TILE / 2;

// Cada charco: {x,y (casilla), t (edad), max, color, nacido (splash inicial), semilla}
export const charcos = [];

let semillaGlobal = 1;

export function limpiarCharcos() {
  charcos.length = 0;
}

export function crearCharco(tx, ty, color) {
  // no duplicar en la misma casilla: refrescar el existente
  const ya = charcos.find((c) => c.x === tx && c.y === ty);
  if (ya) { ya.t = 0; ya.color = color; ya.nacido = 0.25; return ya; }
  if (charcos.length >= CHARCO_MAX) {
    // secar el mas viejo
    let idx = 0, maxT = -1;
    for (let i = 0; i < charcos.length; i++) if (charcos[i].t > maxT) { maxT = charcos[i].t; idx = i; }
    charcos.splice(idx, 1);
  }
  const ch = {
    x: tx, y: ty, t: 0, max: CHARCO_VIDA_S, color: color || '#e8ecf4',
    nacido: 0.25, semilla: semillaGlobal++,
  };
  charcos.push(ch);
  return ch;
}

export function actualizarCharcos(dt) {
  for (let i = charcos.length - 1; i >= 0; i--) {
    const c = charcos[i];
    c.t += dt;
    if (c.nacido > 0) c.nacido = Math.max(0, c.nacido - dt);
    if (c.t >= c.max) charcos.splice(i, 1);
  }
}

// ¿hay charco en la casilla (tx,ty)? devuelve el charco o null.
export function charcoEn(tx, ty) {
  for (const c of charcos) if (c.x === tx && c.y === ty) return c;
  return null;
}

// Evapora el charco de una casilla (glaseado). Devuelve true si habia.
export function evaporarCharco(tx, ty) {
  for (let i = 0; i < charcos.length; i++) {
    if (charcos[i].x === tx && charcos[i].y === ty) {
      const c = charcos[i];
      charcos.splice(i, 1);
      return c;
    }
  }
  return null;
}

// Factor de escala visible (0..1): entra rapido, se encoge los ultimos 2 s.
export function escalaCharco(c) {
  const restante = c.max - c.t;
  if (c.nacido > 0) return 1 - c.nacido / 0.25 * 0.4; // pequeno pop de entrada
  if (restante < 2) return Math.max(0, restante / 2);
  return 1;
}

export { centro as centroCharco };
