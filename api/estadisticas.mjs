// Estadísticas del negocio: /api/estadisticas
//   POST { sessionId, path, registrado }  (público) -> registra un pageview.
//   GET                                    (admin)   -> métricas agregadas:
//        usuarios, jugadores por juego, tráfico por día/mes/año y "en vivo",
//        pedidos e ingresos.
import { conectarDB } from './_lib/mongo.mjs';
import { Visita } from './_lib/models/visita.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';
import { Score } from './_lib/models/score.mjs';
import { Pedido } from './_lib/models/pedido.mjs';
import { requiereAdmin } from './_lib/auth.mjs';

// Zona horaria del negocio (para que "hoy", los días y meses cuadren en Colombia).
const TZ = 'America/Bogota';

const txt = (s, max) => (s ?? '').toString().trim().slice(0, max);

/** Agrupa una colección por día/mes/año (según formato) en un rango. */
function agrupar(Model, formato, clave, match) {
  return Model.aggregate([
    ...(match ? [{ $match: match }] : []),
    {
      $group: {
        _id: { $dateToString: { date: '$createdAt', format: formato, timezone: TZ } },
        n: { $sum: 1 },
        sesiones: { $addToSet: '$sessionId' },
      },
    },
    { $project: { _id: 0, [clave]: '$_id', n: 1, sesiones: { $size: '$sesiones' } } },
    { $sort: { [clave]: 1 } },
  ]);
}

export default async function handler(req, res) {
  try {
    await conectarDB();

    // ── Registrar un pageview (público) ──
    if (req.method === 'POST') {
      const body = req.body ?? {};
      await Visita.create({
        sessionId: txt(body.sessionId, 40),
        path: txt(body.path, 120),
        registrado: !!body.registrado,
      });
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'GET') {
      if (!requiereAdmin(req, res)) return;

      const ahora = new Date();
      const hace30 = new Date(ahora.getTime() - 30 * 864e5);
      const hace12sem = new Date(ahora.getTime() - 84 * 864e5); // 12 semanas
      const hace12m = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1);
      const hace5min = new Date(ahora.getTime() - 5 * 60000);
      const hoyStr = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(ahora);

      const [
        usuariosTotal,
        usuariosConIg,
        jugadoresIg,
        porJuego,
        rankingEstrellas,
        visitasPorDia,
        visitasPorSemana,
        visitasPorMes,
        visitasPorAnio,
        enVivoSesiones,
        totalVisitas,
        pedidosPorDia,
        pedidosAgg,
      ] = await Promise.all([
        Cuenta.estimatedDocumentCount(),
        Cuenta.countDocuments({ instagram: { $ne: '' } }),
        Score.distinct('instagram'),
        Score.aggregate([
          {
            $group: {
              _id: '$gameId',
              jugadores: { $addToSet: '$instagram' },
              estrellas: { $sum: '$estrellas' },
              partidas: { $sum: 1 },
            },
          },
          { $project: { _id: 0, gameId: '$_id', jugadores: { $size: '$jugadores' }, estrellas: 1, partidas: 1 } },
        ]),
        // Ranking de estrellas por persona (suma de todos los juegos/niveles).
        Score.aggregate([
          {
            $group: {
              _id: '$instagram',
              estrellas: { $sum: '$estrellas' },
              juegos: { $addToSet: '$gameId' },
            },
          },
          { $project: { _id: 0, instagram: '$_id', estrellas: 1, juegos: { $size: '$juegos' } } },
          { $match: { estrellas: { $gt: 0 } } },
          { $sort: { estrellas: -1, juegos: -1 } },
          { $limit: 100 },
        ]),
        agrupar(Visita, '%Y-%m-%d', 'dia', { createdAt: { $gte: hace30 } }),
        agrupar(Visita, '%G-%V', 'semana', { createdAt: { $gte: hace12sem } }),
        agrupar(Visita, '%Y-%m', 'mes', { createdAt: { $gte: hace12m } }),
        agrupar(Visita, '%Y', 'anio', null),
        Visita.distinct('sessionId', { createdAt: { $gte: hace5min } }),
        Visita.estimatedDocumentCount(),
        Pedido.aggregate([
          { $match: { createdAt: { $gte: hace30 } } },
          {
            $group: {
              _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: TZ } },
              n: { $sum: 1 },
              ingresos: { $sum: '$total' },
            },
          },
          { $project: { _id: 0, dia: '$_id', n: 1, ingresos: 1 } },
          { $sort: { dia: 1 } },
        ]),
        Pedido.aggregate([{ $group: { _id: null, total: { $sum: 1 }, ingresos: { $sum: '$total' } } }]),
      ]);

      const hoyDia = visitasPorDia.find((d) => d.dia === hoyStr);
      const pedidosHoy = pedidosPorDia.find((d) => d.dia === hoyStr);
      const pedTotal = pedidosAgg[0]?.total ?? 0;
      const ingresos = pedidosAgg[0]?.ingresos ?? 0;

      res.status(200).json({
        usuarios: { total: usuariosTotal, conInstagram: usuariosConIg },
        jugadores: { total: jugadoresIg.length },
        juegos: porJuego,
        ranking: rankingEstrellas,
        trafico: {
          totalVisitas,
          enVivo: enVivoSesiones.length,
          visitasHoy: hoyDia?.n ?? 0,
          visitantesHoy: hoyDia?.sesiones ?? 0,
          porDia: visitasPorDia,
          porSemana: visitasPorSemana,
          porMes: visitasPorMes,
          porAnio: visitasPorAnio,
        },
        pedidos: {
          total: pedTotal,
          hoy: pedidosHoy?.n ?? 0,
          ingresos,
          ticketPromedio: pedTotal ? Math.round(ingresos / pedTotal) : 0,
          porDia: pedidosPorDia,
        },
        generado: ahora.toISOString(),
      });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/estadisticas:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
