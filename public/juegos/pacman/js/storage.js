/* Persistencia defensiva en localStorage (clave pacman_v1). No rompe en modo privado. */

const CLAVE = 'pacman_v1';

function porDefecto() {
  return { v: 1, mute: false, tutorialVisto: false, record: 0, ultimoPuntaje: 0, nivelMax: 1 };
}

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return porDefecto();
    const d = JSON.parse(crudo);
    if (!d || d.v !== 1) return porDefecto();
    const base = porDefecto();
    base.mute = !!d.mute;
    base.tutorialVisto = !!d.tutorialVisto;
    base.record = Math.max(0, Math.floor(d.record || 0));
    base.ultimoPuntaje = Math.max(0, Math.floor(d.ultimoPuntaje || 0));
    base.nivelMax = Math.max(1, Math.floor(d.nivelMax || 1));
    return base;
  } catch {
    return porDefecto();
  }
}

export const datos = cargar();

export function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    /* sin espacio o modo privado: sigue sin persistir */
  }
}

export function setMute(m) {
  datos.mute = !!m;
  guardar();
}

export function marcarTutorialVisto() {
  datos.tutorialVisto = true;
  guardar();
}

/* Registra resultado de partida. Devuelve true si es récord nuevo. */
export function registrarPartida(puntaje, nivel) {
  const esRecord = puntaje > datos.record;
  datos.ultimoPuntaje = Math.floor(puntaje);
  datos.record = Math.max(datos.record, Math.floor(puntaje));
  datos.nivelMax = Math.max(datos.nivelMax, Math.floor(nivel));
  guardar();
  return esRecord;
}
