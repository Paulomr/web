/* El horno: casilla H que re-tuesta la crocancia. Acumula calor; si te quedas
   demasiado te quema y entra en cooldown. De toques rapidos, no refugio. */

import { HORNO_SOBRECALIENTA_S, HORNO_COOLDOWN_S } from './config.js';

export const horno = {
  x: 9, y: 15,
  calor: 0,        // segundos acumulados encima
  cooldown: 0,     // segundos restantes de inutilizable
  sobreCargo: false, // acaba de quemar este ciclo
};

export function iniciarHorno(pos) {
  horno.x = pos.x; horno.y = pos.y;
  horno.calor = 0;
  horno.cooldown = 0;
  horno.sobreCargo = false;
}

// Devuelve estado: 'frio' | 'calentando' | 'quema' | 'cooldown'
export function estadoHorno() {
  if (horno.cooldown > 0) return 'cooldown';
  if (horno.calor >= HORNO_SOBRECALIENTA_S) return 'quema';
  if (horno.calor > 0) return 'calentando';
  return 'frio';
}

// Actualiza el horno segun si la galleta esta encima.
// Devuelve un evento: null | 'curando' | 'quemadura'
export function actualizarHorno(dt, jugadorEncima) {
  if (horno.cooldown > 0) {
    horno.cooldown = Math.max(0, horno.cooldown - dt);
    horno.calor = 0;
    return null;
  }
  if (!jugadorEncima) {
    // el calor se resetea al bajarse
    horno.calor = 0;
    horno.sobreCargo = false;
    return null;
  }
  // jugador encima
  horno.calor += dt;
  if (horno.calor >= HORNO_SOBRECALIENTA_S) {
    horno.calor = 0;
    horno.cooldown = HORNO_COOLDOWN_S;
    horno.sobreCargo = true;
    return 'quemadura';
  }
  return 'curando';
}
