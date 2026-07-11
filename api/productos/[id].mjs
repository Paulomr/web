// Endpoint de un producto concreto: /api/productos/:id  (id = slug, ej 'kinder')
//   GET    -> un producto (público).
//   PUT    -> edita (solo admin). Base para el panel de edición del menú.
//   DELETE -> lo oculta (activo=false) sin borrarlo (solo admin).
import { conectarDB } from '../_lib/mongo.mjs';
import { Producto } from '../_lib/models/producto.mjs';
import { requiereAdmin } from '../_lib/auth.mjs';

export default async function handler(req, res) {
  const { id } = req.query; // slug del producto

  try {
    await conectarDB();

    if (req.method === 'GET') {
      const producto = await Producto.findOne({ slug: id }).lean();
      if (!producto) {
        res.status(404).json({ error: 'Producto no encontrado' });
        return;
      }
      res.status(200).json(producto);
      return;
    }

    if (req.method === 'PUT') {
      if (!requiereAdmin(req, res)) return;
      const actualizado = await Producto.findOneAndUpdate(
        { slug: id },
        req.body ?? {},
        { new: true, runValidators: true },
      );
      if (!actualizado) {
        res.status(404).json({ error: 'Producto no encontrado' });
        return;
      }
      res.status(200).json(actualizado);
      return;
    }

    if (req.method === 'DELETE') {
      if (!requiereAdmin(req, res)) return;
      // Borrado "suave": lo ocultamos para no perder historial.
      const oculto = await Producto.findOneAndUpdate(
        { slug: id },
        { activo: false },
        { new: true },
      );
      if (!oculto) {
        res.status(404).json({ error: 'Producto no encontrado' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('Error en /api/productos/:id:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}
