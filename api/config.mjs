// Endpoint de configuración del sitio: /api/config
//   GET -> configuración pública (textos, minijuegos, sedes).
//   PUT -> guarda la configuración (solo admin, desde el panel).
import { conectarDB } from './_lib/mongo.mjs';
import { Configuracion } from './_lib/models/configuracion.mjs';
import { requiereAdmin } from './_lib/auth.mjs';

export default async function handler(req, res) {
  try {
    await conectarDB();

    if (req.method === 'GET') {
      const cfg = await Configuracion.findOne({ clave: 'site' }).lean();
      res.status(200).json(cfg ?? {});
      return;
    }

    if (req.method === 'PUT') {
      if (!requiereAdmin(req, res)) return;
      const { textos, juegos, sedes, galeria } = req.body ?? {};
      const set = {};
      if (textos !== undefined) set.textos = textos;
      if (juegos !== undefined) set.juegos = juegos;
      if (sedes !== undefined) set.sedes = sedes;
      if (galeria !== undefined) set.galeria = Array.isArray(galeria) ? galeria.slice(0, 200) : [];
      const cfg = await Configuracion.findOneAndUpdate(
        { clave: 'site' },
        { $set: set },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();
      res.status(200).json(cfg);
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/config:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
