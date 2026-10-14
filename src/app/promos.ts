// Promociones de la edición Halloween 2026: el 10 % de bienvenida y los
// regalos por meta del carrito ("Dulce" y "Truco").
//
// Por qué así y no una ruleta al azar: ver el estudio "Cómo venden Temu y
// Shein" (Claude Docs, 14-oct-2026). En corto: un premio que depende del azar
// es un juego promocional y pide permiso de Coljuegos; un regalo que el
// cliente ELIGE al llegar a una meta es una promoción normal, y la meta
// visible es lo que de verdad mueve el pedido (el efecto de meta).
//
// La ley (Estatuto del Consumidor, art. 33) obliga a decir las condiciones
// de tiempo, modo y lugar en la misma publicidad, y si falta la fecha final
// la promoción se entiende vigente hasta revocarla. Por eso cada texto de la
// web que la anuncia lee sus condiciones de aquí (`CONDICIONES_*`) y todo
// tiene fecha de cierre.
//
// ESTE ES EL ÚNICO SITIO DONDE SE CAMBIAN MONTOS, REGALOS O FECHAS.

/** Fin de las promociones: medianoche del 31 de octubre, hora de Colombia. */
const FIN_PROMOS = Date.parse('2026-11-01T00:00:00-05:00');

/** ¿Siguen vigentes? Función y no constante: cada carga pregunta la hora. */
export const promosActivas = (): boolean => Date.now() < FIN_PROMOS;

/** Milisegundos que le quedan a la edición (0 si ya terminó). */
export const quedaPromos = (): number => Math.max(0, FIN_PROMOS - Date.now());

/** Descuento de bienvenida, en porcentaje, sobre los productos. */
export const BIENVENIDA_PCT = 10;

export const CONDICIONES_BIENVENIDA =
  'Primer pedido por la web con cuenta nueva o sin pedidos. Una vez por cuenta. Hasta el 31 de octubre.';

/** Una meta del carrito: al pasar `monto` en productos, el cliente elige un regalo. */
export interface Meta {
  id: 'dulce' | 'truco';
  /** Nombre corto de la meta (lo que se lee en la barra). */
  nombre: string;
  /** Monto mínimo en productos, en pesos. */
  monto: number;
  /** Qué se gana, dicho en minúsculas para encajar en una frase ("una bebida"). */
  premio: string;
  /** Los productos del menú entre los que se elige (por su id/slug). */
  opciones: string[];
}

export const METAS: Meta[] = [
  {
    id: 'dulce',
    nombre: 'Dulce',
    monto: 50000,
    premio: 'una bebida',
    opciones: ['coca-cola', 'coca-cola-zero', 'hatsu-rosa', 'leche-colanta'],
  },
  {
    id: 'truco',
    nombre: 'Truco',
    monto: 100000,
    premio: 'una galleta New York clásica',
    opciones: ['oreo', 'red-velvet', 'tres-chocolates', 'sea-salt'],
  },
];

export const CONDICIONES_METAS =
  'Un regalo de cada meta por pedido, sobre el valor de los productos. Hasta el 31 de octubre.';
