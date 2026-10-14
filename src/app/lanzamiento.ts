import { Producto } from './productos';

// Lanzamiento vigente: la galleta nueva que protagoniza la portada.
//
// Lo comparten el cartel de aviso (`cartel-nuevo`) y la sección de terciopelo
// (`producto-nuevo`), para que los dos hablen SIEMPRE del mismo producto y de
// la misma foto. Si mañana sale otra galleta, se cambia aquí y en los archivos
// de public/fotos/, y no hay que tocar ninguno de los dos componentes.

/** id del <section> del lanzamiento: es el destino al que salta el cartel. */
export const ANCLA_LANZAMIENTO = 'nuevo-producto';

/**
 * Slug del producto en el menú. Ojo: el panel lo guardó como "Doble Kinder"
 * (con espacio y mayúsculas), así que la comparación va normalizada y no por
 * igualdad literal.
 */
const SLUG = 'doble-kinder';

/** "Doble Kinder" → "doble-kinder". */
const normalizar = (s: string): string => s.toLowerCase().trim().replace(/\s+/g, '-');

/**
 * Busca el producto del lanzamiento en el menú vigente, de lo más preciso a lo
 * más laxo. Las dos últimas pasadas se limitan a `cookies` a propósito: sin ese
 * filtro, "NY CROOKIE DOBLE KINDER" se colaría como si fuera la galleta.
 */
export function buscarLanzamiento(lista: Producto[]): Producto | undefined {
  const cookies = lista.filter((p) => p.categoria === 'cookies');
  return (
    lista.find((p) => normalizar(p.id) === SLUG) ??
    cookies.find((p) => normalizar(p.nombre).includes(SLUG)) ??
    cookies.find((p) => p.nuevo)
  );
}

/**
 * Respaldo si la base no responde y el menú local tampoco la trae: la sección
 * es una pieza de campaña, así que tiene que verse entera igual. La foto no
 * necesita respaldo porque es un archivo del propio sitio.
 */
export const LANZAMIENTO_RESPALDO = {
  nombre: 'COOKIE DOBLE KINDER',
  descripcion:
    'Nuestra galleta más famosa, ahora con más Kinder que nunca y rellena de crema Kinder.',
  precio: '$ 16.000',
  detalle: '125 G',
} as const;

/** Póster de campaña (3:4) y sus dos derivados. Viven en public/fotos/. */
export const FOTO_LANZAMIENTO = 'fotos/doble-kinder.webp';
/** Copia diminuta (64 px) que se desenfoca detrás del póster para hacer el halo. */
export const AURA_LANZAMIENTO = 'fotos/doble-kinder-glow.webp';
/** Recorte cuadrado de la galleta, para el cartel de aviso. */
export const MINI_LANZAMIENTO = 'fotos/doble-kinder-mini.webp';
