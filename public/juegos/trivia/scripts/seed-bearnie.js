// Siembra el récord "casi perfecto" de BEARNIE en todos los rankings.
// Idempotente: si Bearnie ya tiene puntaje en un juego, no duplica.
// Uso: node scripts/seed-bearnie.js  (requiere MONGODB_URI en .env)
require('dotenv').config();
const connectDB = require('../config/db');
const Score = require('../models/score.model');

const RECORDS = {
  pacman: 99900,
  pasteleria: 999,
  'head-soccer': 99,
  'galleta-al-vuelo': 99,
  catapulta: 9990,
  launcher: 9990,
};

(async () => {
  await connectDB();
  for (const [gameId, points] of Object.entries(RECORDS)) {
    const ya = await Score.exists({ gameId, player: 'BEARNIE' });
    if (ya) {
      console.log(`[Seed] BEARNIE ya reina en ${gameId}.`);
      continue;
    }
    await Score.create({ gameId, player: 'BEARNIE', points });
    console.log(`[Seed] BEARNIE #1 en ${gameId} con ${points} puntos.`);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
