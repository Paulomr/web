/* Catálogo de recetas: masas, cremas (glaseados) y toppings.
 *
 * ORDEN DE DECORACIÓN (regla del juego): después de hornear se pone primero la
 * CREMA (glaseado) y encima los TOPPINGS. Por eso las cremas viven en
 * DECORACIONES (la base) y las chispas/perlas/sprinkles en TOPPINGS (van encima).
 */

export const MASAS = [
  { id: 'vainilla', nombre: 'Vainilla', dia: 1, precio: 10, colores: { claro: '#f3d9a4', medio: '#eec27f', borde: '#e0b06a' } },
  { id: 'chocolate', nombre: 'Chocolate', dia: 2, precio: 10, colores: { claro: '#8a5a33', medio: '#7a4b2b', borde: '#6b4226' } },
  { id: 'redvelvet', nombre: 'Red velvet', dia: 4, precio: 12, colores: { claro: '#c9556a', medio: '#b4485c', borde: '#a03a4e' } },
];

/* TOPPINGS = van ENCIMA de la crema. `render` decide cómo se dibujan.
   Varios habilitados desde el día 1. */
export const TOPPINGS = [
  { id: 'chispas_choc', nombre: 'Chispas de chocolate', dia: 1, precio: 2, render: 'chips_choc' },
  { id: 'chispas_colores', nombre: 'Chispas de colores', dia: 1, precio: 2, render: 'chips_color' },
  { id: 'perlas', nombre: 'Perlas', dia: 1, precio: 2, render: 'perlas' },
  { id: 'sprinkles', nombre: 'Lluvia de colores', dia: 3, precio: 2, render: 'sprinkles' },
  { id: 'chispas_fresa', nombre: 'Chispas de fresa', dia: 4, precio: 2, render: 'chips_fresa' },
];

/* DECORACIONES = las CREMAS (glaseados). Son la base: se ponen ANTES de los
   toppings. Cada una lleva su degradado (g1→g2) para dibujar el glaseado. */
export const DECORACIONES = [
  { id: 'glaseado_rosa', nombre: 'Glaseado rosa', dia: 1, precio: 2, g1: '#f7bcd0', g2: '#f2a7c0' },
  { id: 'glaseado_vainilla', nombre: 'Glaseado vainilla', dia: 1, precio: 2, g1: '#fff0cf', g2: '#f4d99f' },
  { id: 'glaseado_choc', nombre: 'Glaseado de chocolate', dia: 2, precio: 2, g1: '#7a4b2b', g2: '#5d3a20' },
  { id: 'glaseado_menta', nombre: 'Glaseado de menta', dia: 3, precio: 2, g1: '#cdeede', g2: '#9fd4b8' },
];

/* Todas las cremas cuentan como "glaseado" (la base que sostiene los toppings). */
export const GLASEADOS = DECORACIONES.map((d) => d.id);

export const masaPorId = (id) => MASAS.find((m) => m.id === id);
export const toppingPorId = (id) => TOPPINGS.find((t) => t.id === id);
export const decoPorId = (id) => DECORACIONES.find((d) => d.id === id);

export function desbloqueadosHasta(dia) {
  return {
    masas: MASAS.filter((m) => m.dia <= dia),
    toppings: TOPPINGS.filter((t) => t.dia <= dia),
    decos: DECORACIONES.filter((d) => d.dia <= dia),
  };
}

/* Valor base de un ítem de pedido: precio de la masa + 2 por cada extra pedido. */
export function valorItem(item) {
  const masa = masaPorId(item.masa);
  return masa.precio + 2 * (item.toppings.length + item.decoraciones.length);
}

export function tieneGlaseado(lista) {
  return lista.some((d) => GLASEADOS.includes(d));
}
