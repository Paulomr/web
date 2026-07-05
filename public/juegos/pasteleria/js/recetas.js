/* Catálogo de recetas: masas, toppings y decoraciones. */

export const MASAS = [
  { id: 'vainilla', nombre: 'Vainilla', dia: 1, precio: 10, colores: { claro: '#f3d9a4', medio: '#eec27f', borde: '#e0b06a' } },
  { id: 'chocolate', nombre: 'Chocolate', dia: 2, precio: 10, colores: { claro: '#8a5a33', medio: '#7a4b2b', borde: '#6b4226' } },
  { id: 'redvelvet', nombre: 'Red velvet', dia: 4, precio: 12, colores: { claro: '#c9556a', medio: '#b4485c', borde: '#a03a4e' } },
];

export const TOPPINGS = [
  { id: 'chispas_choc', nombre: 'Chispas de chocolate', dia: 1, precio: 2 },
  { id: 'chispas_colores', nombre: 'Chispas de colores', dia: 4, precio: 2 },
];

export const DECORACIONES = [
  { id: 'glaseado_rosa', nombre: 'Glaseado rosa', dia: 3, precio: 2 },
  { id: 'glaseado_choc', nombre: 'Glaseado de chocolate', dia: 5, precio: 2 },
  { id: 'sprinkles', nombre: 'Lluvia de colores', dia: 5, precio: 2, requiere: 'glaseado' },
];

export const GLASEADOS = ['glaseado_rosa', 'glaseado_choc'];

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
