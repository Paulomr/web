// Endpoint de "Postula tu negocio": /api/postulaciones
//
// La convocatoria CERRÓ el 2026-10-14: la página /postula y el marcador del
// hero ya no existen, así que el público no puede postular ni votar. Lo que se
// recibió sigue en la base y se queda accesible desde el panel, para poder
// escribirles a esos negocios. Por eso aquí solo vive lo del administrador:
//
//   GET  ?admin=1             -> todas, con su estado y sus votos (solo admin).
//   DELETE ?id=               -> borrarla junto con sus votos (solo admin).
//
// Cualquier otra petición (la portada vieja en caché, un bot) recibe 410:
// "ya no existe", que es la verdad, y no un 404 que parezca un error nuestro.
import { conectarDB } from './_lib/mongo.mjs';
import { Postulacion, Voto } from './_lib/models/postulacion.mjs';
import { requiereAdmin } from './_lib/auth.mjs';

/** Los datos del negocio, sin el estado de moderación. */
function publica(p, votos) {
  return {
    id: p._id.toString(),
    negocio: p.negocio,
    instagram: p.instagram,
    otraRed: p.otraRed ?? '',
    ciudad: p.ciudad,
    direccion: p.direccion,
    votos,
    // La fecha de postulación, no la de la última edición.
    fecha: p.createdAt ?? p.updatedAt,
  };
}

/** Con el estado, para el panel de moderación. */
function paraAdmin(p, votos) {
  return { ...publica(p, votos), estado: p.estado };
}

/**
 * Cuenta los votos de las postulaciones dadas y los devuelve como
 * { '<id>': n }. El conteo se agrega cada vez en lugar de guardarse en la
 * postulación: un contador denormalizado se desincroniza al primer voto que se
 * mueve o a la primera postulación borrada, y entonces el ranking miente.
 */
async function contarVotos(postulaciones) {
  const ids = postulaciones.map((p) => p._id);
  if (!ids.length) return {};
  const filas = await Voto.aggregate([
    { $match: { postulacion: { $in: ids } } },
    { $group: { _id: '$postulacion', n: { $sum: 1 } } },
  ]);
  const votos = {};
  for (const f of filas) votos[f._id.toString()] = f.n;
  return votos;
}

export default async function handler(req, res) {
  // ─────────────── Lo público: la convocatoria ya cerró ───────────────
  // Va antes de conectar: no hace falta abrir la base para decir que no.
  if (req.method === 'POST' || (req.method === 'GET' && !req.query.admin)) {
    res.status(410).json({ error: 'La convocatoria ya cerró.' });
    return;
  }

  try {
    await conectarDB();

    // ─────────────────────── Leer (solo admin) ───────────────────────
    if (req.method === 'GET') {
      if (!requiereAdmin(req, res)) return;
      const todas = await Postulacion.find().sort({ createdAt: -1 }).limit(500).lean();
      const votos = await contarVotos(todas);
      res.status(200).json({
        postulaciones: todas.map((p) => paraAdmin(p, votos[p._id.toString()] ?? 0)),
      });
      return;
    }

    // ──────────────────── Borrar (solo admin) ────────────────────
    if (req.method === 'DELETE') {
      if (!requiereAdmin(req, res)) return;
      const id = (req.query.id ?? '').toString().trim();
      if (!id.match(/^[0-9a-f]{24}$/i)) {
        res.status(400).json({ error: 'Falta la postulación.' });
        return;
      }
      // Los votos se van con ella: si quedaran sueltos, sus dueños seguirían
      // apareciendo como "ya votaste" por un negocio que ya no existe.
      await Postulacion.deleteOne({ _id: id });
      await Voto.deleteMany({ postulacion: id });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/postulaciones:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
