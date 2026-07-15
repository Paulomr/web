// Pedidos: /api/pedidos
//   POST { codigo, instagram, ...datos, items[] }  (público) -> registra el
//        pedido cuando el cliente lo envía por WhatsApp. Idempotente por código.
//   GET  ?codigo=CM-...           (admin) -> el pedido + el cliente + su historial.
//   GET  ?ig=@usuario             (admin) -> pedidos de esa cuenta.
//   GET                            (admin) -> últimos pedidos (lista).
import { conectarDB } from './_lib/mongo.mjs';
import { Pedido } from './_lib/models/pedido.mjs';
import { Cuenta } from './_lib/models/cuenta.mjs';
import { requiereAdmin } from './_lib/auth.mjs';

function normalizarIg(s) {
  const v = (s || '').toString().trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

const txt = (s, max) => (s ?? '').toString().trim().slice(0, max);

function cuentaPublica(c) {
  if (!c) return null;
  return {
    nombre: c.nombre ?? '',
    edad: c.edad ?? '',
    instagram: c.instagram ?? '',
    direccion: c.direccion ?? '',
    puntos: c.puntos ?? 0,
    sellos: c.sellos ?? 0,
    tarjetas: c.tarjetas ?? 0,
    cuponUsado: !!c.cuponUsado,
    creada: c.createdAt ?? null,
  };
}

export default async function handler(req, res) {
  try {
    await conectarDB();

    // ── Registrar un pedido (público) ──
    if (req.method === 'POST') {
      const body = req.body ?? {};
      const codigo = txt(body.codigo, 24).toUpperCase();
      if (!/^CM-\d{6}-[A-Z0-9]{4}$/.test(codigo)) {
        res.status(400).json({ error: 'Código inválido' });
        return;
      }
      const items = Array.isArray(body.items)
        ? body.items.slice(0, 60).map((i) => ({
            id: txt(i?.id, 60),
            nombre: txt(i?.nombre, 120),
            cantidad: Math.max(1, Math.min(999, Math.round(Number(i?.cantidad) || 1))),
            precioUnit: Math.max(0, Math.min(1e8, Math.round(Number(i?.precioUnit) || 0))),
          }))
        : [];
      const datos = {
        codigo,
        instagram: normalizarIg(body.instagram),
        nombre: txt(body.nombre, 80),
        telefono: txt(body.telefono, 40),
        sede: txt(body.sede, 40),
        entrega: txt(body.entrega, 20),
        pago: txt(body.pago, 20),
        direccion: txt(body.direccion, 200),
        referencia: txt(body.referencia, 200),
        notas: txt(body.notas, 300),
        items,
        subtotal: Math.max(0, Math.min(1e9, Math.round(Number(body.subtotal) || 0))),
        descuento: Math.max(0, Math.min(1e9, Math.round(Number(body.descuento) || 0))),
        total: Math.max(0, Math.min(1e9, Math.round(Number(body.total) || 0))),
        cupon: !!body.cupon,
        hayConsultar: !!body.hayConsultar,
      };
      // Idempotente: si el cliente reenvía el mismo código, no duplica.
      await Pedido.updateOne({ codigo }, { $setOnInsert: datos }, { upsert: true });
      res.status(200).json({ ok: true, codigo });
      return;
    }

    if (req.method === 'GET') {
      if (!requiereAdmin(req, res)) return;

      // Buscar por código: pedido + cliente + historial de esa cuenta.
      const codigo = (req.query?.codigo || '').toString().trim().toUpperCase();
      if (codigo) {
        const pedido = await Pedido.findOne({ codigo }).lean();
        if (!pedido) {
          res.status(404).json({ error: 'No hay ningún pedido con ese código.' });
          return;
        }
        const ig = pedido.instagram || '';
        const [cuenta, historial] = await Promise.all([
          ig ? Cuenta.findOne({ instagram: ig }).lean() : null,
          ig ? Pedido.find({ instagram: ig }).sort({ createdAt: -1 }).limit(100).lean() : [pedido],
        ]);
        res.status(200).json({
          pedido,
          cuenta: cuentaPublica(cuenta),
          historial,
          totalPedidos: historial.length,
        });
        return;
      }

      // Pedidos de una cuenta.
      const ig = normalizarIg(req.query?.ig);
      if (ig) {
        const historial = await Pedido.find({ instagram: ig }).sort({ createdAt: -1 }).limit(100).lean();
        res.status(200).json({ historial, totalPedidos: historial.length });
        return;
      }

      // Lista de los últimos pedidos.
      const limit = Math.max(1, Math.min(200, parseInt(req.query?.limit, 10) || 50));
      const pedidos = await Pedido.find().sort({ createdAt: -1 }).limit(limit).lean();
      res.status(200).json({ pedidos, total: pedidos.length });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/pedidos:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
