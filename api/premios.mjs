// Premios y canjes: /api/premios
//   POST { instagram, tipo } -> reclama un premio: valida elegibilidad, descuenta
//        en el servidor y crea un código de un solo uso. tipo: 'sellos'|'estrellas'.
//   GET  (admin) -> lista de canjes (pendientes primero).
//   PUT  (admin) { codigo, entregado } -> marca un canje como entregado.
//
// Conversiones:
//   - sellos:    cada tarjeta completa (10 sellos) = $60.000 COP.
//   - estrellas: 15 estrellas (los 5 juegos al 100%) = crookie + 2 galletas + postal.
import { conectarDB } from './_lib/mongo.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';
import { Canje } from './_lib/models/canje.mjs';
import { requiereAdmin } from './_lib/auth.mjs';

const META_ESTRELLAS = 15;
const VALOR_SELLOS = 60000;
const SIN_AMBIGUOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizarIg(s) {
  const v = (s || '').toString().trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

function nuevoCodigo() {
  let c = 'P';
  for (let i = 0; i < 5; i++) c += SIN_AMBIGUOS[Math.floor(Math.random() * SIN_AMBIGUOS.length)];
  return c;
}

export default async function handler(req, res) {
  try {
    await conectarDB();

    if (req.method === 'POST') {
      const ig = normalizarIg(req.body?.instagram);
      const tipo = (req.body?.tipo || '').toString();
      if (!ig) {
        res.status(400).json({ error: 'Falta el Instagram' });
        return;
      }
      const c = await Cuenta.findOne({ instagram: ig });
      if (!c) {
        res.status(404).json({ error: 'Cuenta no encontrada' });
        return;
      }

      let descripcion = '';
      let valor = 0;
      if (tipo === 'sellos') {
        if ((c.tarjetas ?? 0) < 1) {
          res.status(400).json({ error: 'Aún no completas una tarjeta de sellos.' });
          return;
        }
        c.tarjetas -= 1;
        descripcion = '$60.000 para gastar en Crunchy Munch';
        valor = VALOR_SELLOS;
      } else if (tipo === 'estrellas') {
        if ((c.puntos ?? 0) < META_ESTRELLAS) {
          res.status(400).json({ error: 'Completa los 5 juegos al 100% (15 estrellas).' });
          return;
        }
        if (c.premioEstrellas) {
          res.status(409).json({ error: 'Ya reclamaste el premio maestro.' });
          return;
        }
        c.premioEstrellas = true;
        descripcion = '1 crookie + 2 galletas + postal coleccionable';
        valor = 0;
      } else {
        res.status(400).json({ error: 'Tipo de premio inválido' });
        return;
      }

      // Código único (reintenta ante colisión rarísima).
      let codigo = nuevoCodigo();
      for (let i = 0; i < 4 && (await Canje.exists({ codigo })); i++) codigo = nuevoCodigo();

      await c.save();
      await Canje.create({ codigo, instagram: ig, tipo, descripcion, valor });
      res.status(200).json({ ok: true, codigo, descripcion });
      return;
    }

    if (req.method === 'GET') {
      if (!requiereAdmin(req, res)) return;
      const canjes = await Canje.find().sort({ entregado: 1, createdAt: -1 }).limit(500).lean();
      res.status(200).json(canjes);
      return;
    }

    if (req.method === 'PUT') {
      if (!requiereAdmin(req, res)) return;
      const codigo = (req.body?.codigo || '').toString().trim().toUpperCase();
      if (!codigo) {
        res.status(400).json({ error: 'Falta el código' });
        return;
      }
      const canje = await Canje.findOneAndUpdate(
        { codigo },
        { $set: { entregado: req.body?.entregado !== false } },
        { new: true },
      ).lean();
      if (!canje) {
        res.status(404).json({ error: 'Código no encontrado' });
        return;
      }
      res.status(200).json({ ok: true, canje });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/premios:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
