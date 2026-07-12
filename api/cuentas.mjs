// Endpoint de cuentas de clientes: /api/cuentas
//   POST -> registra/actualiza una cuenta (público; requiere consentimiento).
//   GET  -> lista las cuentas (solo admin, para el panel).
//
// Nota: el registro es público a propósito (cualquier cliente se registra desde
// la web). La lista sí es privada (admin). Guarda datos personales: exige
// `acepta === true` y valida el nombre antes de escribir.
import { conectarDB } from './_lib/mongo.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';
import { requiereAdmin } from './_lib/auth.mjs';

function normalizarIg(s) {
  const v = (s || '').toString().trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

export default async function handler(req, res) {
  try {
    await conectarDB();

    if (req.method === 'POST') {
      const { nombre, edad, instagram, direccion, acepta } = req.body ?? {};
      if (!nombre || !nombre.toString().trim()) {
        res.status(400).json({ error: 'Falta el nombre' });
        return;
      }
      if (acepta !== true) {
        res.status(400).json({ error: 'Falta el consentimiento de datos' });
        return;
      }
      const ig = normalizarIg(instagram);
      const datos = {
        nombre: nombre.toString().trim().slice(0, 80),
        edad: (edad ?? '').toString().trim().slice(0, 3),
        instagram: ig,
        direccion: (direccion ?? '').toString().trim().slice(0, 160),
        acepta: true,
      };

      // Con Instagram: upsert (una cuenta por usuario). Sin él: crea nueva.
      let cuenta;
      if (ig) {
        cuenta = await Cuenta.findOneAndUpdate(
          { instagram: ig },
          { $set: datos },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        ).lean();
      } else {
        cuenta = (await Cuenta.create(datos)).toObject();
      }
      res.status(200).json({ ok: true, id: cuenta._id, puntos: cuenta.puntos ?? 0 });
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
