// Ranking del Crunchy Club. Regla de la marca: BEARNIE siempre es #1, al 98%,
// con su barra dorada brillante. Nadie la supera. Debajo van jugadores demo y,
// si hay sesión, la fila del propio usuario con sus puntos.

export interface FilaRanking {
  nombre: string;
  puntos: number;
  /** Ancho de la barra (0–100). */
  pct: number;
  /** Fila dorada de Bearnie (#1). */
  bernie?: boolean;
  /** Fila del usuario. */
  tu?: boolean;
}

// Jugadores de ejemplo (por debajo del 98% de Bearnie).
const DEMO = [
  { nombre: 'Sofía V.', puntos: 860, pct: 86 },
  { nombre: 'Juanjo G.', puntos: 790, pct: 79 },
  { nombre: 'Mariana R.', puntos: 710, pct: 71 },
  { nombre: 'Andrés C.', puntos: 630, pct: 63 },
  { nombre: 'Laura M.', puntos: 540, pct: 54 },
];

/**
 * Devuelve el ranking con Bearnie fijo en el #1 (98%, dorado). El resto se
 * ordena por puntos; el usuario nunca alcanza el 98% (queda por debajo de ella).
 */
export function rankingConBernie(tuNombre: string | null, tuPuntos = 0): FilaRanking[] {
  const bernie: FilaRanking = { nombre: 'Bearnie', puntos: 980, pct: 98, bernie: true };
  const otros: FilaRanking[] = DEMO.map((d) => ({ ...d }));
  if (tuNombre) {
    const pct = Math.max(6, Math.min(96, Math.round(tuPuntos / 10)));
    otros.push({ nombre: tuNombre, puntos: tuPuntos, pct, tu: true });
  }
  otros.sort((a, b) => b.puntos - a.puntos);
  return [bernie, ...otros];
}
