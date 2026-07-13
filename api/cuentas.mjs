// Endpoint de cuentas de clientes: /api/cuentas
//   POST { accion:'login', instagram, pin } -> inicia sesión, devuelve la cuenta.
//   POST { ...datos, pin } -> registra/actualiza (público; requiere consentimiento).
//   GET  -> lista las cuentas (solo admin, para el panel).
//
// El "pin" es un código de 4 dígitos (contraseña ligera). Se guarda hasheado,
// no en claro. Nota: 4 dígitos es baja seguridad (apto para fidelidad de una
// tienda, no para datos sensibles). Identidad = @instagram.
import crypto from 'node:crypto';
import { conectarDB } from './_lib/mongo.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';
import { requiereAdmin } from './_lib/auth.mjs';

function normalizarIg(s) {
  const v = (s || '').toString().trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

function hashPin(ig, pin) {
  return crypto.createHash('sha256').update(`${ig}:${pin}:crunchy-pin-v1`).digest('hex');
}

// Cuenta pública (sin el hash) para devolver al cliente.
function publica(c) {
  return {
    nombre: c.nombre ?? '',
    edad: c.edad ?? '',
    instagram: c.instagram ?? '',
    direccion: c.direccion ?? '',
    acepta: !!c.acepta,
    puntos: c.puntos ?? 0,
    sellos: c.sellos ?? 0,
    tarjetas: c.tarjetas ?? 0,
    ultimoSello: c.ultimoSello ?? '',
  };
}

export default async function handler(req, res) {
  try {
    await conectarDB();

    if (req.method === 'POST') {
      const body = req.body ?? {};

      // ── Inicio de sesión ──
      if (body.accion === 'login') {
        const ig = normalizarIg(body.instagram);
        const pin = (body.pin ?? '').toString().trim();
        if (!ig || !/^\d{4}$/.test(pin)) {
          res.status(400).json({ error: 'Instagram y código de 4 dígitos.' });
          return;
        }
        const c = await Cuenta.findOne({ instagram: ig });
        if (!c || !c.pinHash || c.pinHash !== hashPin(ig, pin)) {
          res.status(401).json({ error: 'Instagram o código incorrecto.' });
          return;
        }
        res.status(200).json({ ok: true, cuenta: publica(c) });
        return;
      }

      // ── Registro / actualización de perfil ──
      const { nombre, edad, instagram, direccion, acepta } = body;
      if (!nombre || !nombre.toString().trim()) {
        res.status(400).json({ error: 'Falta el nombre' });
        return;
      }
      if (acepta !== true) {
        res.status(400).json({ error: 'Falta el consentimiento de datos' });
        return;
      }
      const ig = normalizarIg(instagram);
      const pin = (body.pin ?? '').toString().trim();
      const puntos = Math.max(0, Math.min(100000, Math.round(Number(body.puntos) || 0)));

      // Si se envía un pin, validarlo y proteger contra robo de cuenta ajena.
      const existente = ig ? await Cuenta.findOne({ instagram: ig }) : null;
      if (pin) {
        if (!/^\d{4}$/.test(pin)) {
          res.status(400).json({ error: 'El código debe ser de 4 dígitos.' });
          return;
        }
        if (existente && existente.pinHash && existente.pinHash !== hashPin(ig, pin)) {
          res.status(409).json({ error: 'Ese Instagram ya tiene cuenta. Inicia sesión con tu código.' });
          return;
        }
      }

      const datos = {
        nombre: nombre.toString().trim().slice(0, 80),
        edad: (edad ?? '').toString().trim().slice(0, 3),
        instagram: ig,
        direccion: (direccion ?? '').toString().trim().slice(0, 160),
        acepta: true,
      };
      // Fija el pin solo si viene uno y la cuenta aún no tiene (o coincide).
      if (pin && (!existente || !existente.pinHash)) datos.pinHash = hashPin(ig, pin);

      let cuenta;
      if (ig) {
        cuenta = await Cuenta.findOneAndUpdate(
          { instagram: ig },
          { $set: datos, $max: { puntos } },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        ).lean();
      } else {
        cuenta = (await Cuenta.create({ ...datos, puntos })).toObject();
      }
      res.status(200).json({ ok: true, cuenta: publica(cuenta) });
      return;
    }

    if (req.method === 'GET') {
      if (!requiereAdmin(req, res)) return;
      const cuentas = await Cuenta.find().sort({ createdAt: -1 }).limit(1000).lean();
      res.status(200).json(cuentas);
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/cuentas:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
