// Acceso al ranking de puntajes que expone el backend (Express + MongoDB).
// Mismo backend que la trivia, levantado en el puerto 3000.

export interface ScoreRow {
  player: string;
  points: number;
  createdAt?: string;
}

const API = 'http://localhost:3000/api/scores';

/** Top N de un juego. Devuelve [] si el backend no responde: la UI nunca se rompe. */
export async function fetchTopScores(gameId: string, limit = 10): Promise<ScoreRow[]> {
  try {
    const res = await fetch(`${API}/${encodeURIComponent(gameId)}/top?limit=${limit}`);
    if (!res.ok) return [];
    return (await res.json()) as ScoreRow[];
  } catch {
    return [];
  }
}
