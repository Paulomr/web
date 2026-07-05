/* Constantes globales del juego (tamanos, materiales, calibracion fisica). */
export const W = 1280, H = 720;
export const WORLD_W = 2560;          // mundo mas ancho que la pantalla
export const GROUND_Y = 640;          // cota superior del suelo

// Honda: anclaje, arrastre maximo y factor arrastre->velocidad (px/step Matter)
// k mas bajo + gravedad mas baja => vuelo mas lento y legible SIN perder alcance
// (alcance ~ v^2/g, tiempo de vuelo ~ v/g: bajar ambos alarga el vuelo)
export const SLING = { x:260, anchorY:515, maxDrag:118, k:0.13, minDrag:18 };

// Aceleracion de gravedad por step de Matter. DEBE = GRAVITY_Y * 0.2778
// (0.2778 es el incremento empirico por step con gravity.y=1). Se usa para
// predecir la trayectoria con el mismo integrador que Matter.
export const GRAVITY_Y = 0.5;
export const G_STEP = GRAVITY_Y * 0.2778;

// La energia de colision cae con el cuadrado de la velocidad; al bajar gravedad
// (vuelo lento) los impactos y colapsos golpean mas flojo. Este factor restaura
// la letalidad para que las estructuras sigan matando al caer. Calibrado.
export const DMG_SCALE = 3.2;

// Materiales: densidad Matter, vida, umbral de dano (ignora roces al asentarse)
export const MATS = {
  wood : { density:0.0009, hp:70,  threshold:12, color:0xb5793f, dark:0x7a4c22 },
  stone: { density:0.0022, hp:160, threshold:30, color:0x9aa0ab, dark:0x5c6169 },
  ice  : { density:0.0007, hp:28,  threshold:6,  color:0xbfe9ff, dark:0x6fb7d8 },
};

export const PIG  = { hp:16, threshold:4, r:20 };
export const PROJ = { r:17, density:0.0012 };
// TNT: dano acumulado que la detona, y parametros de su explosion
export const TNT  = { size:44, trigger:45, radius:200, power:0.05, damage:260 };

// Onda expansiva local en cada impacto que YA causa dano (proyectil o bloque
// que cae). Empuja los cuerpos cercanos para que la estructura se sacuda y
// colapse de forma mas viva. Muy por debajo del TNT y escalada con el dano
// del golpe (clamp). minDmg filtra roces/asentamiento; throttle limita cuantas
// ondas por ms para no gastar CPU en cascadas.
export const IMPACT_SHOCK = { radius:95, power:0.021, upBias:0.14,
                              minDmg:20, refDmg:150, throttle:45 };
