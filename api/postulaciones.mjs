// Endpoint de "Postula tu negocio": /api/postulaciones
//
//   GET                       -> las APROBADAS, de más a menos votadas (público).
//   GET  ?ig=@usuario         -> además, a quién votó esa cuenta (para marcarlo).
//   GET  ?admin=1             -> todas, con su estado y sus votos (solo admin).
//   POST { negocio, instagram, otraRed, ciudad, direccion }
//                             -> postula un negocio. Queda PENDIENTE.
//   POST { accion:'votar', id, instagram, pin }
//                             -> vota por una postulación aprobada.
//   PUT  { id, estado }       -> aprobar / ocultar (solo admin).
//   DELETE ?id=               -> borrarla junto con sus votos (solo admin).
//
// Las dos escrituras piden cosas distintas a propósito:
//   · POSTULAR no exige cuenta. Quien postula es un negocio que llega de fuera,
//     y obligarlo a registrarse antes de saber de qué va mataría la convocatoria.
//     El spam lo frena la moderación: nada se publica sin aprobarse.
//   · VOTAR sí exige cuenta (@instagram + código de 4 dígitos). Sin eso una sola
//     persona infla el conteo y el ranking deja de significar nada.
import { conectarDB } from './_lib/mongo.mjs';
import { Postulacion, Voto } from './_lib/models/postulacion.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';
import { requiereAdmin, normalizarIg, hashPin } from './_lib/auth.mjs';

/** Forma pública: lo que se pinta en la web. Nunca sale el estado. */
function publica(p, votos) {
  return {
    id: p._id.toString(),
    negocio: p.negocio,
    instagram: p.instagram,
    otraRed: p.otraRed ?? '',
    ciudad: p.ciudad,
    direccion: p.direccion,
    votos,
    // La fecha de postulación, no la de la última edición: se usa para
    // desempatar el ranking y reenviar el formulario no debe cambiar el puesto.
    fecha: p.createdAt ?? p.updatedAt,
  };
}

/** Igual pero con el estado, para el panel de moderación. */
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

/** Ranking: más votos primero y, en empate, la que se postuló antes. */
function porVotos(a, b) {
  return b.votos - a.votos || new Date(a.fecha) - new Date(b.fecha);
}

/** Los mismos límites que aplica el formulario, en el mismo orden y con los
 *  mismos textos: si aquí dijeran otra cosa, el visitante vería dos mensajes
 *  distintos para el mismo error. Devuelve '' si está todo bien. */
function revisar({ negocio, instagram, otraRed, ciudad, direccion }) {
  if (negocio.length < 2) return 'Escribe el nombre de tu negocio.';
  if (negocio.length > 80) return 'El nombre es muy largo (máximo 80 letras).';
  if (!instagram) return 'Escribe el Instagram de tu negocio.';
  if (instagram.length > 40) return 'Ese Instagram es demasiado largo.';
  if (otraRed.length > 80) return 'Ese contacto es muy largo (máximo 80 letras).';
  if (ciudad.length < 3) return 'Escribe la ciudad donde queda.';
  if (ciudad.length > 60) return 'El nombre de la ciudad es muy largo.';
  if (direccion.length < 5) return 'Escribe la dirección o el barrio.';
  if (direccion.length > 120) return 'La dirección es muy larga (máximo 120 letras).';
  return '';
}

export default async function handler(req, res) {
  try {
    await conectarDB();

    // ───────────────────────── Leer ─────────────────────────
    if (req.method === 'GET') {
      if (req.query.admin) {
        if (!requiereAdmin(req, res)) return;
        const todas = await Postulacion.find().sort({ createdAt: -1 }).limit(500).lean();
        const votos = await contarVotos(todas);
        res.status(200).json({
          postulaciones: todas.map((p) => paraAdmin(p, votos[p._id.toString()] ?? 0)),
        });
        return;
      }

      // El orden real (por votos) se arma abajo, pero la consulta se ordena por
      // llegada para que el tope de 200 sea siempre el mismo corte y no uno
      // distinto en cada petición.
      const aprobadas = await Postulacion.find({ estado: 'aprobada' })
        .sort({ createdAt: 1 })
        .limit(200)
        .lean();
      const votos = await contarVotos(aprobadas);
      const lista = aprobadas
        .map((p) => publica(p, votos[p._id.toString()] ?? 0))
        .sort(porVotos);

      // A quién votó el visitante, para que su tarjeta salga marcada y no
      // parezca que puede volver a votar por la misma.
      let miVoto = '';
      const ig = normalizarIg(req.query.ig);
      if (ig) {
        const v = await Voto.findOne({ instagram: ig }).lean();
        if (v) miVoto = v.postulacion.toString();
      }

      res.status(200).json({ postulaciones: lista, miVoto });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};

      // ──────────────────────── Votar ────────────────────────
      if (body.accion === 'votar') {
        const ig = normalizarIg(body.instagram);
        const pin = (body.pin ?? '').toString().trim();
        const id = (body.id ?? '').toString().trim();

        if (!ig || !/^\d{4}$/.test(pin)) {
          res.status(400).json({ error: 'Inicia sesión para votar.' });
          return;
        }

        // La cuenta debe existir Y el código coincidir: es lo único que impide
        // votar en nombre de otra persona.
        const cuenta = await Cuenta.findOne({ instagram: ig });
        if (!cuenta || !cuenta.pinHash || cuenta.pinHash !== hashPin(ig, pin)) {
          res.status(401).json({ error: 'Instagram o código incorrecto.' });
          return;
        }

        // Solo se vota lo que está publicado: si no, se podrían votar
        // postulaciones ocultas o pendientes adivinando su id.
        const p = id.match(/^[0-9a-f]{24}$/i) ? await Postulacion.findById(id).lean() : null;
        if (!p || p.estado !== 'aprobada') {
          res.status(404).json({ error: 'Esa postulación ya no está en la convocatoria.' });
          return;
        }

        // Un voto por cuenta en toda la convocatoria: si ya votó, este mismo
        // documento cambia de negocio. Mover el voto, nunca sumar otro.
        await Voto.findOneAndUpdate(
          { instagram: ig },
          { $set: { postulacion: p._id } },
          { upsert: true, setDefaultsOnInsert: true },
        );

        res.status(200).json({ ok: true });
        return;
      }

      // ────────────────────── Postular un negocio ──────────────────────
      const datos = {
        negocio: (body.negocio ?? '').toString().trim(),
        instagram: normalizarIg(body.instagram),
        otraRed: (body.otraRed ?? '').toString().trim(),
        ciudad: (body.ciudad ?? '').toString().trim(),
        direccion: (body.direccion ?? '').toString().trim(),
      };

      const problema = revisar(datos);
      if (problema) {
        res.status(400).json({ error: problema });
        return;
      }

      // Un negocio = un @instagram = una postulación. Si vuelve a enviarla
      // (corrigió la dirección, cambió de sede), se reemplaza y vuelve a
      // revisión, igual que una opinión reenviada.
      const guardada = await Postulacion.findOneAndUpdate(
        { instagram: datos.instagram },
        { $set: { ...datos, estado: 'pendiente' } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();

      // Si el negocio ya estaba y se repostuló, sus votos siguen ahí: hay que
      // contarlos, no devolver un cero que no es verdad.
      const votosGuardada = await contarVotos([guardada]);
      res
        .status(200)
        .json({ ok: true, postulacion: paraAdmin(guardada, votosGuardada[guardada._id.toString()] ?? 0) });
      return;
    }

    // ──────────────────── Moderar (solo admin) ────────────────────
    if (req.method === 'PUT') {
      if (!requiereAdmin(req, res)) return;
      const id = ((req.body ?? {}).id ?? '').toString().trim();
      const estado = ((req.body ?? {}).estado ?? '').toString();
      if (!id.match(/^[0-9a-f]{24}$/i) || !['pendiente', 'aprobada', 'oculta'].includes(estado)) {
        res.status(400).json({ error: 'Falta la postulación o el estado es inválido.' });
        return;
      }
      const p = await Postulacion.findByIdAndUpdate(id, { $set: { estado } }, { new: true }).lean();
      if (!p) {
        res.status(404).json({ error: 'Esa postulación ya no existe.' });
        return;
      }
      const votos = await contarVotos([p]);
      res.status(200).json({ ok: true, postulacion: paraAdmin(p, votos[p._id.toString()] ?? 0) });
      return;
    }

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
