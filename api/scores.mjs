// Ranking global por juego, con estrellas por NIVEL: /api/scores
//   POST { gameId, nivel, instagram, estrellas, puntos } -> guarda el MEJOR
//        resultado del jugador en ese nivel y actualiza el total de su perfil.
//   GET  ?gameId=X&top=N -> { rows:[{instagram,estrellas,puntos}], total }
//        donde estrellas = suma de las estrellas del jugador en ese juego.
//
// Anti-farmeo: se guarda solo el mejor por nivel (no acumula por repetir).
// El total del perfil = suma de los mejores de TODOS los niveles y juegos.
import { conectarDB } from './_lib/mongo.mjs';
import { Score } from './_lib/models/score.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';

function normalizarIg(s) {
  const v = (s || '').toString().trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

// Migración: el modelo anterior tenía un índice único (gameId, instagram) que
// impide guardar varios niveles por juego. Lo eliminamos una vez por arranque.
async function limpiarIndiceViejo() {
  if (globalThis.__scoreIdxFix) return;
  globalThis.__scoreIdxFix = true;
  try {
    await Score.collection.dropIndex('gameId_1_instagram_1');
  } catch {
    /* no existía: ok */
  }
}

// Recalcula el total de estrellas del perfil (suma de todos los niveles/juegos).
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
    await limpiarIndiceViejo();

    if (req.method === 'POST') {
      const gameId = (req.body?.gameId || '').toString().trim().slice(0, 40);
      const nivel = (req.body?.nivel || 'u').toString().trim().slice(0, 24) || 'u';
      const ig = normalizarIg(req.body?.instagram);
      const estrellas = Math.max(0, Math.min(3, Math.round(Number(req.body?.estrellas) || 0)));
      const puntos = Math.max(0, Math.min(1e9, Math.round(Number(req.body?.puntos) || 0)));
      if (!gameId || !ig) {
        res.status(400).json({ error: 'Faltan datos' });
        return;
      }
      const previo = await Score.findOne({ gameId, nivel, instagram: ig });
      let mejor = false;
      if (!previo) {
        await Score.create({ gameId, nivel, instagram: ig, estrellas, puntos });
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
      const [rows, jugadores] = await Promise.all([
        Score.aggregate([
          { $match: { gameId } },
          {
            $group: {
              _id: '$instagram',
              estrellas: { $sum: '$estrellas' },
              puntos: { $sum: '$puntos' },
            },
          },
          { $sort: { estrellas: -1, puntos: -1 } },
          { $limit: limit },
        ]),
        Score.distinct('instagram', { gameId }),
      ]);
      res.status(200).json({
        rows: rows.map((r) => ({ instagram: r._id, estrellas: r.estrellas, puntos: r.puntos })),
        total: jugadores.length,
      });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/scores:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
