const service = require('../services/score.service');

// Valida y persiste el puntaje de una partida.
async function crear(req, res, next) {
  try {
    const { gameId, player, points } = req.body || {};

    const id = typeof gameId === 'string' ? gameId.trim() : '';
    const who = typeof player === 'string' ? player.trim() : '';
    const pts = Number(points);

    if (!id) return res.status(400).json({ error: 'Falta gameId' });
    if (!who) return res.status(400).json({ error: 'Falta player' });
    if (!Number.isFinite(pts) || pts < 0) {
      return res.status(400).json({ error: 'points debe ser un número >= 0' });
    }

    const doc = await service.crear({ gameId: id, player: who.slice(0, 24), points: Math.round(pts) });
    res.status(201).json({ ok: true, score: { player: doc.player, points: doc.points } });
  } catch (err) {
    next(err);
  }
}

// Top N de un juego (por defecto 10).
async function top(req, res, next) {
  try {
    const rows = await service.top(req.params.gameId, req.query.limit);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, top };
