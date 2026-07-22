// Endpoint de opiniones de clientes: /api/resenas
//
//   GET                      -> las APROBADAS (público, para la portada).
//   GET  ?ig=@usuario        -> además, la propia opinión de esa cuenta
//                               (aunque siga pendiente), para poder editarla.
//   GET  ?admin=1            -> todas, con su estado (solo admin).
//   POST { instagram, pin, estrellas, texto }
//                            -> crea o reemplaza la opinión de esa cuenta.
//                               Queda PENDIENTE hasta que el admin la apruebe.
//   PUT  { instagram, estado } -> aprobar / ocultar (solo admin).
//   DELETE ?ig=@usuario        -> borrarla del todo (solo admin).
//
// Escribir exige @instagram + código de 4 dígitos: sin eso cualquiera podría
// firmar una opinión con el nombre de otro cliente.
import { conectarDB } from './_lib/mongo.mjs';
import { Resena } from './_lib/models/resena.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';
import { requiereAdmin, normalizarIg, hashPin } from './_lib/auth.mjs';

/** Forma pública: nunca sale el estado ni nada que no se muestre en la web. */
function publica(r) {
  return {
    instagram: r.instagram,
    nombre: r.nombre,
    estrellas: r.estrellas,
    texto: r.texto,
    fecha: r.updatedAt ?? r.createdAt,
  };
}

/** Igual pero con el estado, para el panel de moderación. */
function paraAdmin(r) {
  return { ...publica(r), estado: r.estado };
}

export default async function handler(req, res) {
  try {
    await conectarDB();

    // ───────────────────────── Leer ─────────────────────────
    if (req.method === 'GET') {
      if (req.query.admin) {
        if (!requiereAdmin(req, res)) return;
        const todas = await Resena.find().sort({ createdAt: -1 }).limit(500).lean();
        res.status(200).json({ resenas: todas.map(paraAdmin) });
        return;
      }

      const aprobadas = await Resena.find({ estado: 'aprobada' })
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();

      // La propia opinión del visitante, en cualquier estado: así el formulario
      // puede mostrarle "ya la enviaste, está en revisión" y dejarle editarla.
      let mia = null;
      const ig = normalizarIg(req.query.ig);
      if (ig) {
        const r = await Resena.findOne({ instagram: ig }).lean();
        if (r) mia = paraAdmin(r);
      }

      res.status(200).json({ resenas: aprobadas.map(publica), mia });
      return;
    }

    // ──────────────────── Enviar una opinión ────────────────────
    if (req.method === 'POST') {
      const body = req.body ?? {};
      const ig = normalizarIg(body.instagram);
      const pin = (body.pin ?? '').toString().trim();
      const estrellas = Math.round(Number(body.estrellas));
      const texto = (body.texto ?? '').toString().trim();

      if (!ig || !/^\d{4}$/.test(pin)) {
        res.status(400).json({ error: 'Inicia sesión para opinar.' });
        return;
      }
      if (!(estrellas >= 1 && estrellas <= 5)) {
        res.status(400).json({ error: 'Elige de 1 a 5 estrellas.' });
        return;
      }
      if (texto.length < 10) {
        res.status(400).json({ error: 'Cuéntanos un poco más (mínimo 10 letras).' });
        return;
      }
      if (texto.length > 600) {
        res.status(400).json({ error: 'La opinión es muy larga (máximo 600 letras).' });
        return;
      }

      // La cuenta debe existir Y el código coincidir: es lo único que impide
      // opinar en nombre de otra persona.
      const cuenta = await Cuenta.findOne({ instagram: ig });
      if (!cuenta || !cuenta.pinHash || cuenta.pinHash !== hashPin(ig, pin)) {
        res.status(401).json({ error: 'Instagram o código incorrecto.' });
        return;
      }

      // Una opinión por cuenta: al reenviarla se reemplaza y vuelve a revisión.
      const guardada = await Resena.findOneAndUpdate(
        { instagram: ig },
        {
          $set: {
            nombre: (cuenta.nombre || '').toString().trim().slice(0, 80),
            estrellas,
            texto,
            estado: 'pendiente',
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();

      res.status(200).json({ ok: true, mia: paraAdmin(guardada) });
      return;
    }

    // ──────────────────── Moderar (solo admin) ────────────────────
    if (req.method === 'PUT') {
      if (!requiereAdmin(req, res)) return;
      const ig = normalizarIg((req.body ?? {}).instagram);
      const estado = ((req.body ?? {}).estado ?? '').toString();
      if (!ig || !['pendiente', 'aprobada', 'oculta'].includes(estado)) {
        res.status(400).json({ error: 'Falta el Instagram o el estado es inválido.' });
        return;
      }
      const r = await Resena.findOneAndUpdate({ instagram: ig }, { $set: { estado } }, { new: true }).lean();
      if (!r) {
        res.status(404).json({ error: 'Esa opinión ya no existe.' });
        return;
      }
      res.status(200).json({ ok: true, resena: paraAdmin(r) });
      return;
    }

    if (req.method === 'DELETE') {
      if (!requiereAdmin(req, res)) return;
      const ig = normalizarIg(req.query.ig);
      if (!ig) {
        res.status(400).json({ error: 'Falta el Instagram.' });
        return;
      }
      await Resena.deleteOne({ instagram: ig });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/resenas:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
