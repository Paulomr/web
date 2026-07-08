const mongoose = require('mongoose');

// Puntaje de un minijuego. Un documento por partida terminada.
const scoreSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, trim: true, lowercase: true },
    player: { type: String, required: true, trim: true, maxlength: 24 },
    points: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// El ranking siempre consulta "top N de un juego": índice compuesto directo.
scoreSchema.index({ gameId: 1, points: -1 });

module.exports = mongoose.model('Score', scoreSchema);
