/* =====================================================================
   CONFIG central del juego. Un solo lugar para tunear todo.
   ===================================================================== */

// Supabase (la MISMA base del concurso). Vacio = ranking local (localStorage).
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
export const TABLE = "head_soccer_scores";

// Partido
export const MATCH_SECONDS = 60;
export const WIN_GOALS = 10;      // primero en llegar gana al instante
export const FINALE_AT = 10;      // ultimos N segundos: slow-mo + buffs
export const FINALE_BUFF = 1.25;  // multiplicador de salto/patada en el finale
export const DIFFICULTY = 0.92; // 0.7 facil - 1.0 dificil (velocidad/reaccion CPU)

// Sprite sheet de salto de la mantequilla (requiere servir por HTTP, no file://).
// Ajusta fw/fh/frames a las dimensiones reales del sheet cuando llegue.
export const BUTTER = { id:'butter', name:'MANTEQUILLA', sheet:'assets/mantequilla_sheet.png', fw:128, fh:128, frames:-1, rate:14 };

export const TIPS = [
  "Puedes pedir a domicilio en cualquiera de nuestras sedes",
  "Pide cualquiera de nuestros productos a domicilio",
  "Recomendamos comer caliente, sabe mejor",
  "Compartir es mas rico: pide para todos"
];

export const PAL = {pink:0xf45b69,blush:0xf6e8ea,green:0x0a8754,blue:0x81d6e3,red:0xf13030,ink:0x2a1320};

// Mundo y fisica
export const W = 1280, H = 720;
export const GROUND_Y = H-64, PH = 178;
// Arco CURVO (nada de rectangulos): GOAL_H alto de la boca (linea de gol en x=GOAL_D),
// GOAL_DROP caida del techo en cuarto de elipse (travesano -> espalda) y GOAL_BACK
// x de la espalda de la red. La fisica y las texturas derivan TODAS de aqui.
export const GOAL_D = 84, GOAL_H = 300, GOAL_DROP = 64, GOAL_BACK = 10, POST_R = 9;
export const SPD = 380, JUMP = 620;
