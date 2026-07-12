// Endpoint del catálogo: /api/productos
//   GET  -> lista pública de productos activos (lo que consume la web).
//   POST -> crea un producto (solo admin). Base para el panel de edición.
import { conectarDB } from '../_lib/mongo.mjs';
import { Producto } from '../_lib/models/producto.mjs';
import { requiereAdmin } from '../_lib/auth.mjs';

export default async function handler(req, res) {
  try {
    await conectarDB();

    if (req.method === 'GET') {
      // El panel de administración pide TODOS (incluye ocultos) con ?all=1.
      if (req.query.all === '1') {
        if (!requiereAdmin(req, res)) return;
        const todos = await Producto.find({}).sort({ orden: 1, createdAt: 1 }).lean();
        res.status(200).json(todos);
        return;
      }
      // Público: solo activos y que no estén en pausa vigente (la pausa vence
      // sola cuando su fecha ya pasó).
      const ahora = new Date();
      const productos = await Producto.find({
        activo: true,
        $or: [{ pausadoHasta: null }, { pausadoHasta: { $lte: ahora } }],
      })
        .sort({ orden: 1, createdAt: 1 })
        .lean();
      res.status(200).json(productos);
      return;
    }

    if (req.method === 'POST') {
      if (!requiereAdmin(req, res)) return;
      const creado = await Producto.create(req.body ?? {});
      res.status(201).json(creado);
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/productos:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
