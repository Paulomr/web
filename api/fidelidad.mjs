// Tarjeta de fidelidad por sellos: /api/fidelidad
//   GET ?ig=<usuario>  -> estado público de esa cuenta (sellos, meta...).
//   GET (admin)        -> código del día (secreto) para el vendedor.
//   PUT (admin)        -> genera un nuevo código del día.
//   POST { instagram, codigo } -> canjea: valida el código del día y suma 1 sello
//                                  (máx. 1 por cuenta por día). A la meta: premio.
//
// Anti-trampas: los sellos SOLO se suman con el código del día (que genera el
// admin y entrega en compras reales). El servidor manda; el navegador no puede
// auto-asignarse sellos. Cada cuenta suma como máximo 1 sello por día.
import { conectarDB } from './_lib/mongo.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';
import { Fidelidad } from './_lib/models/fidelidad.mjs';
import { esAdmin, requiereAdmin } from './_lib/auth.mjs';

const SIN_AMBIGUOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function hoyBogota() {
  // Fecha en hora Colombia (UTC-5), como YYYY-MM-DD.
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function nuevoCodigo() {
  let c = '';
  for (let i = 0; i < 6; i++) c += SIN_AMBIGUOS[Math.floor(Math.random() * SIN_AMBIGUOS.length)];
  return c;
}

function normalizarIg(s) {
  const v = (s || '').toString().trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

async function configFidelidad() {
  return (
    (await Fidelidad.findOne({ clave: 'fidelidad' })) ||
    (await Fidelidad.create({ clave: 'fidelidad' }))
  );
}

export default async function handler(req, res) {
  try {
    await conectarDB();
    const cfg = await configFidelidad();

    if (req.method === 'GET') {
      const ig = normalizarIg(req.query?.ig);
      if (ig) {
        const c = await Cuenta.findOne({ instagram: ig }).lean();
        res.status(200).json({
          sellos: c?.sellos ?? 0,
          tarjetas: c?.tarjetas ?? 0,
          estrellas: c?.puntos ?? 0, // total de estrellas del perfil (juegos)
          meta: cfg.meta,
          umbral: cfg.umbral,
          fecha: hoyBogota(),
        });
        return;
      }
      // Sin ig: solo el admin ve el código del día.
      if (esAdmin(req)) {
        res.status(200).json({ codigoDia: cfg.codigoDia, fecha: cfg.fecha, meta: cfg.meta, umbral: cfg.umbral });
        return;
      }
      res.status(200).json({ meta: cfg.meta, umbral: cfg.umbral, fecha: hoyBogota() });
      return;
    }

    if (req.method === 'PUT') {
      if (!requiereAdmin(req, res)) return;
      cfg.codigoDia = nuevoCodigo();
      cfg.fecha = hoyBogota();
      if (req.body?.umbral) cfg.umbral = Math.max(0, Math.round(Number(req.body.umbral) || 0));
      if (req.body?.meta) cfg.meta = Math.max(1, Math.round(Number(req.body.meta) || 10));
      await cfg.save();
      res.status(200).json({ codigoDia: cfg.codigoDia, fecha: cfg.fecha, meta: cfg.meta, umbral: cfg.umbral });
      return;
    }

    if (req.method === 'POST') {
      const ig = normalizarIg(req.body?.instagram);
      const codigo = (req.body?.codigo || '').toString().trim().toUpperCase();
      if (!ig) {
        res.status(400).json({ error: 'Agrega tu Instagram para activar tu tarjeta.' });
        return;
      }
      if (!codigo) {
        res.status(400).json({ error: 'Falta el código.' });
        return;
      }
      const hoy = hoyBogota();
      if (!cfg.codigoDia || cfg.fecha !== hoy || cfg.codigoDia !== codigo) {
        res.status(400).json({ error: 'Código inválido o vencido. Pídele a la tienda el de hoy.' });
        return;
      }
      const c =
        (await Cuenta.findOne({ instagram: ig })) ||
        (await Cuenta.create({ nombre: ig.replace('@', ''), instagram: ig, acepta: true }));
      if (c.ultimoSello === hoy) {
        res.status(409).json({ error: 'Ya sumaste tu sello de hoy 💗', sellos: c.sellos, tarjetas: c.tarjetas, meta: cfg.meta });
        return;
      }
      c.sellos = (c.sellos ?? 0) + 1;
      c.ultimoSello = hoy;
      let premio = false;
      if (c.sellos >= cfg.meta) {
        c.sellos = 0;
        c.tarjetas = (c.tarjetas ?? 0) + 1;
        premio = true;
      }
      await c.save();
      res.status(200).json({ ok: true, sellos: c.sellos, tarjetas: c.tarjetas, meta: cfg.meta, premio });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/fidelidad:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
