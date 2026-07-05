/* =====================================================================
   CONFIG central del juego. Un solo lugar para tunear todo.
   Lienzo logico vertical 720x1080 (movil primero, FIT en desktop).
   ===================================================================== */
export const W = 720, H = 1080;
// 0.6 = caida flotante y legible (estilo Cut the Rope); 1 = caida real
export const GRAVITY_Y = 0.6;

// Galleta (cuerpo Matter circular)
export const COOKIE = { r:34, density:0.0012, frictionAir:0.008 };

// Cuerdas: eslabones pequenos unidos por constraints
export const ROPE = {
  seg:22,            // separacion objetivo entre eslabones (px)
  linkR:3,           // radio del cuerpo de cada eslabon
  density:0.0004,
  frictionAir:0.02,
  stiffness:0.95,
  color:0xd9b98c,    // soga clara
  dark:0x8a5a33,
  width:5,
};

// Corte por deslizamiento: radio generoso para dedos
export const CUT_RADIUS = 16;

// Boca de Bernie: radios de comer y de "abrir la boca"
export const EAT_R = 62, OPEN_R = 210;

// Chispas de chocolate (coleccionables)
export const CHIP = { r:15, collectR:56 };

// Burbuja: flota hacia arriba; tap cerca de la galleta la revienta
export const BUBBLE = { r:46, catchR:52, lift:0.28, maxUp:3.6, damp:0.985, popR:95 };

// Ventilador: tap = soplo (impulso con caida por distancia)
export const FAN = { range:520, power:10.5, tapR:85, upBias:0.22 };

// Perdida: margenes fuera del lienzo
export const OUT = { pad:90 };

// Accesibilidad: menos particulas/animaciones decorativas
export const REDUCED = typeof matchMedia==='function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Paleta Crunchy Munch / Bernie
export const PAL = {
  cream:0xfff3e4, gold:0xffd9a0, miel:0xe8a33d,
  bernie:0xf2a7c0, bernieD:0xc9688f,
  choco:0x4a2c14, chocoD:0x2e1a0c,
};
