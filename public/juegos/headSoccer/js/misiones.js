/* =====================================================================
   MODO MISIONES: Bearnie es la IA malvada. Cada mision sube la
   dificultad de la CPU (velocidad, reaccion y punteria) hasta 1.0.
   El progreso vive en localStorage; superar la mision N vale N*10
   puntos en el ranking global (Bearnie reina con 99: solo la mision
   final perfecta la supera).
   ===================================================================== */

export const MISIONES = [
  { n: 1,  dif: 0.70, nombre: 'BEARNIE SE DESPIERTA' },
  { n: 2,  dif: 0.74, nombre: 'BEARNIE CON HAMBRE' },
  { n: 3,  dif: 0.78, nombre: 'BEARNIE SIN GALLETAS' },
  { n: 4,  dif: 0.82, nombre: 'BEARNIE GRUNONA' },
  { n: 5,  dif: 0.85, nombre: 'BEARNIE FURIOSA' },
  { n: 6,  dif: 0.88, nombre: 'BEARNIE IMPARABLE' },
  { n: 7,  dif: 0.91, nombre: 'BEARNIE DESATADA' },
  { n: 8,  dif: 0.94, nombre: 'BEARNIE MALVADA' },
  { n: 9,  dif: 0.97, nombre: 'BEARNIE DIABOLICA' },
  { n: 10, dif: 1.00, nombre: 'BEARNIE DEFINITIVA' },
];

const KEY = 'bs_mision';

/** Mision actual (la primera no superada). */
export function misionActual(){
  let n = 1;
  try { n = parseInt(localStorage.getItem(KEY) || '1', 10); } catch(e) {}
  return MISIONES[Math.min(Math.max(n, 1), MISIONES.length) - 1];
}

export function todasSuperadas(){
  try { return parseInt(localStorage.getItem(KEY) || '1', 10) > MISIONES.length; } catch(e) { return false; }
}

/** Marca la mision N como superada y devuelve la siguiente (o null si era la ultima). */
export function superarMision(n){
  try { localStorage.setItem(KEY, String(Math.max(n + 1, parseInt(localStorage.getItem(KEY) || '1', 10)))); } catch(e) {}
  return n < MISIONES.length ? MISIONES[n] : null;
}
