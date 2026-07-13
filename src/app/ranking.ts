// Ranking del juego. Regla de la marca: BEARNIE siempre es #1, con su barra
// dorada brillante al 98%. Debajo, los jugadores reales (por @instagram) con su
// mejor cantidad de estrellas.

export interface FilaRanking {
  /** @instagram del jugador, 'Bearnie' o el tuyo. */
  nombre: string;
  estrellas: number;
  /** Ancho de la barra (0–100). */
  pct: number;
  /** Fila dorada de Bearnie (#1). */
  bernie?: boolean;
  /** Fila del usuario actual. */
  tu?: boolean;
}

/**
 * Construye el ranking con Bearnie fija en el #1 (98%, dorado) y debajo las
 * filas reales del servidor. `miIg` resalta la fila propia.
 */
export function rankingConBernie(
  rows: { instagram: string; estrellas: number }[],
  miIg: string | null,
): FilaRanking[] {
  const bernie: FilaRanking = { nombre: 'Bearnie', estrellas: 3, pct: 98, bernie: true };
  const mi = (miIg || '').toLowerCase();
  const filas: FilaRanking[] = rows.map((r) => ({
    nombre: r.instagram,
    estrellas: r.estrellas,
    pct: Math.max(8, Math.min(96, Math.round((r.estrellas / 3) * 96))),
    tu: mi !== '' && r.instagram.toLowerCase() === mi,
  }));
  return [bernie, ...filas];
}
