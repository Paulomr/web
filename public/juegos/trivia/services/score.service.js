const connectDB = require('../config/db');
const Score = require('../models/score.model');

// Capa de acceso a datos de puntajes.
// Cada función asegura la conexión (cacheada) antes de tocar la BD.
async function crear({ gameId, player, points }) {
  await connectDB();
  return Score.create({ gameId, player, points });
}

async function top(gameId, limit = 10) {
  // Tope defensivo: entre 1 y 100 filas.
  const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  await connectDB();
  // String() defensivo: nunca pasar objetos (inyección de operadores) a la query.
  return Score.find({ gameId: String(gameId) })
    .sort({ points: -1, createdAt: 1 })
    .limit(n)
    .select('player points createdAt -_id')
    .lean();
}

module.exports = { crear, top };
