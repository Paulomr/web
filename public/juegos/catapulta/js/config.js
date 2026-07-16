/* Constantes globales del juego (tamanos, materiales, calibracion fisica). */
export const W = 1280, H = 720;
export const WORLD_W = 2560;          // mundo mas ancho que la pantalla
export const GROUND_Y = 640;          // cota superior del suelo
// Alto de la franja de suelo. Generosa a proposito: con el vistazo (zoom 0.56)
// se ve muy por debajo de H y no puede asomar el vacio bajo la galleta.
export const GROUND_H = 620;

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

// Lata de tomate (objetivo). Cuerpo rectangular: rueda mucho menos que el
// cerdo redondo de antes, así que se queda donde la pone el nivel.
// hp:1 = un golpe y revienta: cualquier impacto por encima de `threshold` la mata.
// El umbral se queda BAJO (4) a proposito, para que hasta el roce de un tablon al
// derrumbarse la reviente. Lo que evita que se maten solas al empezar no es el
// umbral (ver GameScene.applyHit): medido, al asentar la estructura las latas se
// llevan roces de hasta 8.6, y ningun umbral que los filtre deja pasar los golpes
// flojos del derrumbe — con el umbral en 14 las latas aguantaban y no habia quien
// ganase el nivel.
export const CAN  = { hp:1, threshold:4, w:36, h:46 };
export const PROJ = { r:17, density:0.0012 };
// TNT: dano acumulado que la detona, y parametros de su explosion
export const TNT  = { size:44, trigger:45, radius:200, power:0.05, damage:260 };

// Onda expansiva local en cada impacto que YA causa dano (proyectil o bloque
// que cae). Empuja los cuerpos cercanos para que la estructura se sacuda y
// colapse de forma mas viva. Muy por debajo del TNT y escalada con el dano
// del golpe (clamp). minDmg filtra roces/asentamiento; throttle limita cuantas
// ondas por ms para no gastar CPU en cascadas.
export const IMPACT_SHOCK = { radius:180, power:0.055, upBias:0.14,
                              minDmg:16, refDmg:150, throttle:34 };

// El oso no "toca" la estructura: se ESTAMPA. En un impacto directo del
// proyectil, además del impulso que ya calcula Matter, empujamos el cuerpo
// golpeado en la dirección del vuelo. Sin esto un oso rápido rebota y deja la
// torre casi en pie, porque Matter reparte la energía entre muchos contactos.
// power se escala con la velocidad (clamp en refSpeed) y squash es cuánto se
// achata el oso al reventar contra el muro.
export const SLAM = { minSpeed:5, power:0.1, refSpeed:22, squash:0.45 };
