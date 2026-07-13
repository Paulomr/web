// Ranking global por juego (estrellas), servido por /api/scores.
// Cada jugador aparece con su @instagram y su mejor cantidad de estrellas.

export interface ScoreRow {
  instagram: string;
  estrellas: number;
  puntos: number;
}

export interface RankingGlobal {
  rows: ScoreRow[];
  total: number;
}

/** Top N del juego + total de jugadores. Silencioso si el backend no responde. */
export async function fetchRankingGlobal(gameId: string, limit = 10): Promise<RankingGlobal> {
  try {
    const res = await fetch(`/api/scores?gameId=${encodeURIComponent(gameId)}&top=${limit}`);
    if (!res.ok) return { rows: [], total: 0 };
    const d = (await res.json()) as Partial<RankingGlobal>;
    return { rows: Array.isArray(d.rows) ? d.rows : [], total: Number(d.total) || 0 };
  } catch {
    return { rows: [], total: 0 };
  }
}
