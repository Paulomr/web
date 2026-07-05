/* PANICO LACTEO — constantes del juego. Rejilla 19x21, casillas gigantes.
   Todo numerico y sin efectos. */

export const COLS = 19;
export const ROWS = 21;
export const TILE = 16; // unidad logica por casilla (px logicos). El render escala a CSS.

// Velocidad base de referencia (px logicos / segundo) sobre la que se aplican fracciones.
export const BASE_SPEED = 75;

// Paso fijo de simulacion.
export const STEP = 1 / 60;

// --- CROCANCIA (el sistema de "vida" de la galleta) ---
export const CROCANCIA_MAX = 100;
export const DANO_SALPICADA = 35;     // -crocancia por contacto con leche
export const DANO_CHARCO_PS = 6;      // -crocancia/segundo dentro de un charco
export const HORNO_CURA_PS = 25;      // +crocancia/segundo sobre el horno
export const HORNO_SOBRECALIENTA_S = 2.5; // segundos continuos antes de quemar
export const HORNO_QUEMA = 20;        // -crocancia al sobrecalentarse
export const HORNO_COOLDOWN_S = 6;    // segundos de horno inutilizable tras quemar
export const INVULN_S = 1.2;          // invulnerabilidad parpadeante tras salpicada
export const HIT_FREEZE_S = 0.15;     // freeze al recibir salpicada

// --- CHARCOS ---
export const CHARCO_VIDA_S = 8;       // vida de un charco
export const CHARCO_MAX = 10;         // charcos vivos simultaneos
export const CHARCO_SPEED = 0.6;      // multiplicador de velocidad del jugador en charco
export const MOKA_CADA = 7;           // casillas recorridas por Moka entre charcos (n1)
export const MOKA_CADA_N2 = 6;        // desde nivel 2

// --- RACHA de migas ---
export const RACHA_VENTANA_S = 1.5;   // ventana entre migas para mantener racha
export const RACHA_UMBRALES = [12, 30]; // migas seguidas para x2 y x3

// Colores modo panico (frightened) de las leches.
export const FRIGHT_COLOR = '#8fa6ff';
export const FRIGHT_BLINK = '#ffffff';

// Puntajes.
export const PTS_MIGA = 10;
export const PTS_POWER = 50;
export const GHOST_CHAIN = [200, 400, 800, 1600];
export const EXTRA_LIFE_AT = 10000;
export const BONUS_CROCANTE = 1000;   // bonus al terminar nivel con crocancia > 70

// Antojos (postres): umbrales de migas comidas y valores por nivel.
export const ANTOJO_TRIGGERS = [60, 150];
export const ANTOJOS = [
  { nombre: 'cupcake', valor: 300, color: '#f2a7c0' },
  { nombre: 'brownie', valor: 500, color: '#6b4226' },
  { nombre: 'fresa', valor: 700, color: '#e5679b' },
  { nombre: 'galleta gigante', valor: 2000, color: '#f4c430' },
];
export const ANTOJO_DUR = 9; // segundos visible

// Esquinas de scatter (en casillas, pueden quedar fuera del mapa) para 19x21.
export const SCATTER_CORNERS = {
  fresita: { x: 16, y: -2 },
  lactea: { x: 2, y: -2 },
  moka: { x: 18, y: 22 },
  kumis: { x: 0, y: 22 },
};

// Anillo perimetral que patrulla Lactea en scatter (esquinas transitables interiores).
export const PERIMETRO = [
  { x: 1, y: 1 }, { x: 17, y: 1 }, { x: 17, y: 19 }, { x: 1, y: 19 },
];

// Curva de velocidad por nivel. Devuelve px logicos/segundo.
export function speedFor(level) {
  let player, leche;
  if (level <= 1) { player = 0.80; leche = 0.72; }
  else if (level <= 2) { player = 0.90; leche = 0.80; }
  else if (level <= 4) { player = 0.90; leche = 0.88; }
  else { player = 1.0; leche = 0.94; }
  leche = Math.min(leche, 0.96);
  return {
    player: player * BASE_SPEED,
    leche: leche * BASE_SPEED,
    fright: 0.55 * BASE_SPEED,
    tunnel: 0.50 * BASE_SPEED,
    eyes: 1.7 * BASE_SPEED,
  };
}

// Duracion del glaseado (frightened) en segundos por nivel. Minimo 3.
export function frightenedFor(level) {
  if (level <= 2) return 7;
  if (level <= 4) return 6;
  if (level <= 6) return 5;
  if (level <= 8) return 4;
  return 3;
}

// Secuencia de fases scatter/chase por nivel (segundos). Infinity = chase final.
export function phasesFor(level) {
  if (level <= 1) {
    return [
      { modo: 'scatter', dur: 7 }, { modo: 'chase', dur: 20 },
      { modo: 'scatter', dur: 7 }, { modo: 'chase', dur: 20 },
      { modo: 'scatter', dur: 5 }, { modo: 'chase', dur: 20 },
      { modo: 'scatter', dur: 5 }, { modo: 'chase', dur: Infinity },
    ];
  }
  if (level <= 4) {
    return [
      { modo: 'scatter', dur: 7 }, { modo: 'chase', dur: 20 },
      { modo: 'scatter', dur: 7 }, { modo: 'chase', dur: 20 },
      { modo: 'scatter', dur: 5 }, { modo: 'chase', dur: 1033 },
      { modo: 'scatter', dur: 1 / 60 }, { modo: 'chase', dur: Infinity },
    ];
  }
  return [
    { modo: 'scatter', dur: 5 }, { modo: 'chase', dur: 20 },
    { modo: 'scatter', dur: 5 }, { modo: 'chase', dur: 20 },
    { modo: 'scatter', dur: 5 }, { modo: 'chase', dur: 1037 },
    { modo: 'scatter', dur: 1 / 60 }, { modo: 'chase', dur: Infinity },
  ];
}

// Umbrales de dot-counter (migas globales comidas para liberar cada leche).
export function houseThresholds(level) {
  if (level <= 1) return { moka: 20, kumis: 30 };
  return { moka: 0, kumis: 15 };
}

// Segundos sin comer antes de forzar salir la siguiente leche.
export function idleReleaseSecs(level) {
  return level <= 4 ? 4 : 3;
}

// Umbral de HERVOR de Fresita (migas restantes < 30% => agresiva). Permanente desde n5.
export function fresitaHervorLevel() { return 5; }

// Estornudo de Kumis: rango de segundos entre estornudos por nivel.
export function kumisEstornudo(level) {
  return level <= 2 ? [6, 9] : [5, 7];
}
