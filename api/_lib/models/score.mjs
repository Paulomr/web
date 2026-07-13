// Mejor resultado por juego, NIVEL y jugador (identificado por Instagram).
// Se guarda el MEJOR por nivel (más estrellas; a igualdad, más puntos): así el
// total suma las estrellas de todos los niveles (como Angry Birds) sin farmeo.
// Un documento por (gameId, nivel, instagram).
import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true },
    nivel: { type: String, default: 'u' }, // nivel/día dentro del juego
    instagram: { type: String, required: true, lowercase: true, trim: true },
    estrellas: { type: Number, default: 0 }, // 0..3 por nivel
    puntos: { type: Number, default: 0 }, // desempate / referencia
  },
  { timestamps: true },
);

ScoreSchema.index({ gameId: 1, nivel: 1, instagram: 1 }, { unique: true });
ScoreSchema.index({ gameId: 1, instagram: 1 });

export const Score = mongoose.models.Score || mongoose.model('Score', ScoreSchema);
