/* Persistencia en localStorage (clave pasteleria_v1). Solo se guarda en resultados y al alternar mute. */

const CLAVE = 'pasteleria_v1';

function porDefecto() {
  return {
    v: 1,
    mute: false,
    tutorialVisto: false,
    dias: { 1: { estrellas: 0, mejorMonedas: 0 }, 2: { estrellas: 0, mejorMonedas: 0 }, 3: { estrellas: 0, mejorMonedas: 0 }, 4: { estrellas: 0, mejorMonedas: 0 }, 5: { estrellas: 0, mejorMonedas: 0 } },
    horaPico: { desbloqueada: false, mejorPuntaje: 0, mejorPedidos: 0 },
  };
}

export function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return porDefecto();
    const d = JSON.parse(crudo);
    if (!d || d.v !== 1 || typeof d.dias !== 'object' || typeof d.horaPico !== 'object') return porDefecto();
    const base = porDefecto();
    base.mute = !!d.mute;
    base.tutorialVisto = !!d.tutorialVisto;
    for (let i = 1; i <= 5; i++) {
      const dd = d.dias[i];
      if (dd && typeof dd.estrellas === 'number' && typeof dd.mejorMonedas === 'number') {
        base.dias[i] = { estrellas: Math.max(0, Math.min(3, Math.floor(dd.estrellas))), mejorMonedas: Math.max(0, Math.floor(dd.mejorMonedas)) };
      }
    }
    base.horaPico = {
      desbloqueada: !!d.horaPico.desbloqueada,
      mejorPuntaje: Math.max(0, Math.floor(d.horaPico.mejorPuntaje || 0)),
      mejorPedidos: Math.max(0, Math.floor(d.horaPico.mejorPedidos || 0)),
    };
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
    /* sin espacio o modo privado: el juego sigue sin persistir */
  }
}

export function diaDesbloqueado(n) {
  if (n === 1) return true;
  return (datos.dias[n - 1]?.estrellas || 0) >= 1;
}

/* Devuelve true si mejoró algo. */
export function registrarResultadoDia(dia, estrellas, monedas) {
  const d = datos.dias[dia];
  d.estrellas = Math.max(d.estrellas, estrellas);
  d.mejorMonedas = Math.max(d.mejorMonedas, monedas);
  if (dia === 5 && estrellas >= 1) datos.horaPico.desbloqueada = true;
  guardar();
}

/* Devuelve true si es récord nuevo. */
export function registrarHoraPico(puntaje, pedidos) {
  const esRecord = puntaje > datos.horaPico.mejorPuntaje;
  datos.horaPico.mejorPuntaje = Math.max(datos.horaPico.mejorPuntaje, puntaje);
  datos.horaPico.mejorPedidos = Math.max(datos.horaPico.mejorPedidos, pedidos);
  guardar();
  return esRecord;
}

export function marcarTutorialVisto() {
  datos.tutorialVisto = true;
  guardar();
}

export function setMute(m) {
  datos.mute = !!m;
  guardar();
}
