import type { Producto } from './productos';

// Producto de temporada: el Dracula Milkshake de Halloween 2026.
//
// Vive aquí y no en la base de datos porque es de calendario: se vende en las
// dos sedes hasta el 31 de octubre y al día siguiente tiene que desaparecer
// solo, de la portada, del catálogo y del carrito, sin que nadie tenga que
// acordarse de entrar al panel a borrarlo.
//
// Si mañana el panel lo crea con su propio slug, manda el del panel: ver
// `conTemporada`, que no lo duplica.

/** Fin de la temporada: medianoche del 31 de octubre, hora de Colombia. */
const FIN_TEMPORADA = Date.parse('2026-11-01T00:00:00-05:00');

/** ¿Sigue la temporada? Es una función y no una constante para que cada
    carga de la página lo vuelva a preguntar con la hora de ese momento. */
export const enTemporada = (): boolean => Date.now() < FIN_TEMPORADA;

/** Qué lleva. Es lo que se lee al pie del póster en la portada. */
export const INGREDIENTES_TEMPORADA =
  'Vaso de chocolate, helado de fresa y mermelada Dracula de fresa.';

/** La fecha, tal como la dice el póster. */
export const HASTA_TEMPORADA = 'Hasta el 31 de octubre';

/**
 * El producto tal cual se pide. Los datos son los de la campaña de octubre
 * (dracula-milkshake/copys.md): $ 25.000, vaso de chocolate, helado de fresa y
 * mermelada Dracula de fresa. Las fotos son las reales del vaso; el póster va
 * aparte porque lleva texto y en una tarjeta cuadrada se recortaría.
 */
export const DRACULA: Producto = {
  id: 'dracula-milkshake',
  nombre: 'DRACULA MILKSHAKE',
  descripcion: `${INGREDIENTES_TEMPORADA} Solo hasta el 31 de octubre, en las dos sedes.`,
  fotos: ['dracula-frente.webp', 'dracula-arriba.webp'],
  precio: '$ 25.000',
  categoria: 'milkshakes',
  nuevo: true,
};

/** Póster de campaña (3:4, el mismo formato que el de la Doble Kinder). */
export const FOTO_TEMPORADA = 'fotos/dracula-milkshake.webp';
/** Copia de 64 px que se desenfoca detrás del póster para hacer el halo. */
export const AURA_TEMPORADA = 'fotos/dracula-milkshake-glow.webp';
/** Miniatura del cartel de la portada: recorte de la foto real del vaso
    (dracula-frente.webp, 760×760 desde 120,420, a 200 px). */
export const MINI_TEMPORADA = 'fotos/dracula-mini.webp';

/** ¿Es el producto de temporada, venga del panel o de aquí? */
export function esDeTemporada(p: Producto | undefined): boolean {
  return !!p && (p.id === DRACULA.id || /dracula/i.test(p.nombre));
}

/**
 * El menú con el producto de temporada metido entre los milkshakes, mientras
 * dure la temporada y si el menú no lo trae ya. Pasada la fecha devuelve el
 * menú tal cual.
 */
export function conTemporada(lista: Producto[]): Producto[] {
  if (!enTemporada() || lista.some(esDeTemporada)) return lista;
  const i = lista.findIndex((p) => p.categoria === 'milkshakes');
  if (i < 0) return [...lista, DRACULA];
  return [...lista.slice(0, i + 1), DRACULA, ...lista.slice(i + 1)];
}
