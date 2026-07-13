// Mejor resultado por juego y por jugador (identificado por Instagram).
// Se guarda el MEJOR (más estrellas; a igualdad, más puntos): así no se farmea
// repitiendo rondas fáciles. Un documento por (gameId, instagram).
import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true },
    instagram: { type: String, required: true, lowercase: true, trim: true },
    estrellas: { type: Number, default: 0 }, // 0..3
    puntos: { type: Number, default: 0 }, // desempate / referencia
  },
  { timestamps: true },
);

ScoreSchema.index({ gameId: 1, instagram: 1 }, { unique: true });
ScoreSchema.index({ gameId: 1, estrellas: -1, puntos: -1 });

export const Score = mongoose.models.Score || mongoose.model('Score', ScoreSchema);
