/* Maquina de estados del juego + datos de partida (score/vidas/nivel/crocancia/racha). */

import { CROCANCIA_MAX } from './config.js';

export const ESTADO = {
  MENU: 'MENU',
  READY: 'READY',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  DYING: 'DYING',
  LEVEL: 'LEVEL',
  GAMEOVER: 'GAMEOVER',
};

export const juego = {
  estado: ESTADO.MENU,
  score: 0,
  lives: 3,
  level: 1,
  extraDada: false,
  lechesMordidas: 0,
  // crocancia (0..100) — la galleta se ablanda con la leche.
  crocancia: CROCANCIA_MAX,
  // racha de migas.
  racha: 0,        // migas seguidas
  rachaMult: 1,    // 1 | 2 | 3
  rachaT: 0,       // tiempo desde la ultima miga
  // temporizadores de estado (dentro del loop)
  timer: 0,
  countdown: 0,
  freeze: 0,       // hit-freeze
  levelFlash: 0,
};

export function nuevaPartida() {
  juego.score = 0;
  juego.lives = 3;
  juego.level = 1;
  juego.extraDada = false;
  juego.lechesMordidas = 0;
  juego.crocancia = CROCANCIA_MAX;
  juego.racha = 0;
  juego.rachaMult = 1;
  juego.rachaT = 0;
  juego.timer = 0;
  juego.countdown = 0;
  juego.freeze = 0;
  juego.levelFlash = 0;
}

export function setEstado(e) {
  juego.estado = e;
}

// Estado visual de crocancia: 'firme' | 'humeda' | 'empapada'.
export function estadoCrocancia() {
  if (juego.crocancia >= 70) return 'firme';
  if (juego.crocancia >= 35) return 'humeda';
  return 'empapada';
}
