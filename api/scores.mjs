// Ranking global por juego, con estrellas: /api/scores
//   POST { gameId, instagram, estrellas, puntos } -> guarda el MEJOR resultado
//        del jugador en ese juego y actualiza el total de estrellas de su perfil.
//   GET  ?gameId=X&top=N -> { rows:[{instagram,estrellas,puntos}], total }
//
// Anti-farmeo: se guarda solo el mejor (no acumula por repetir). Identidad por
// Instagram (el mismo del perfil). El total del perfil = suma de los mejores.
import { conectarDB } from './_lib/mongo.mjs';
import { Score } from './_lib/models/score.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';

function normalizarIg(s) {
  const v = (s || '').toString().trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

// Recalcula el total de estrellas del perfil (suma de los mejores por juego).
async function actualizarPerfil(ig) {
  const agg = await Score.aggregate([
    { $match: { instagram: ig } },
    { $group: { _id: '$instagram', total: { $sum: '$estrellas' } } },
  ]);
  const total = agg[0]?.total ?? 0;
  await Cuenta.updateOne({ instagram: ig }, { $set: { puntos: total } });
  return total;
}

export default async function handler(req, res) {
  try {
    await conectarDB();

    if (req.method === 'POST') {
      const gameId = (req.body?.gameId || '').toString().trim().slice(0, 40);
      const ig = normalizarIg(req.body?.instagram);
      const estrellas = Math.max(0, Math.min(3, Math.round(Number(req.body?.estrellas) || 0)));
      const puntos = Math.max(0, Math.min(1e9, Math.round(Number(req.body?.puntos) || 0)));
      if (!gameId || !ig) {
        res.status(400).json({ error: 'Faltan datos' });
        return;
      }
      const previo = await Score.findOne({ gameId, instagram: ig });
      let mejor = false;
      if (!previo) {
        await Score.create({ gameId, instagram: ig, estrellas, puntos });
        mejor = true;
      } else if (estrellas > previo.estrellas || (estrellas === previo.estrellas && puntos > previo.puntos)) {
        previo.estrellas = estrellas;
        previo.puntos = puntos;
        await previo.save();
        mejor = true;
      }
      const total = await actualizarPerfil(ig);
      res.status(200).json({ ok: true, mejor, estrellas, totalPerfil: total });
      return;
    }

    if (req.method === 'GET') {
      const gameId = (req.query?.gameId || '').toString().trim();
      if (!gameId) {
        res.status(400).json({ error: 'Falta gameId' });
        return;
      }
      const limit = Math.max(1, Math.min(50, parseInt(req.query?.top, 10) || 10));
      const [rows, total] = await Promise.all([
        Score.find({ gameId }).sort({ estrellas: -1, puntos: -1, updatedAt: 1 }).limit(limit).lean(),
        Score.countDocuments({ gameId }),
      ]);
      res.status(200).json({
        rows: rows.map((r) => ({ instagram: r.instagram, estrellas: r.estrellas, puntos: r.puntos })),
        total,
      });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/scores:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
