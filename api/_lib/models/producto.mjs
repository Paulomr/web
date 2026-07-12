// Modelo "Producto": la forma de cada galleta/bebida en la base de datos.
// Mongoose valida estos campos automáticamente (parte de "muy estable":
// no entra basura a la base de datos).
import mongoose from 'mongoose';

const CATEGORIAS = ['cookies', 'crookies', 'milkshakes', 'minis', 'bebidas'];

const ProductoSchema = new mongoose.Schema(
  {
    // "slug" es el identificador legible (el mismo 'id' que ya usábamos en el
    // catálogo, ej: 'kinder'). Único para que no se repita.
    slug: { type: String, required: true, unique: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    fotos: { type: [String], default: [] },
    precio: { type: String, default: '' }, // texto visible, ej: "$ 15.000"
    detalle: { type: String, default: '' }, // gramaje/tamaño, ej: "120 G"
    categoria: { type: String, required: true, enum: CATEGORIAS },
    nuevo: { type: Boolean, default: false },
    // Para ordenar en el catálogo y poder ocultar sin borrar.
    orden: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
    // Pausa temporal: oculto en la web hasta esta fecha (null = no pausado).
    // Sirve para "desactivar por un día" (vuelve solo) o dejarlo con 'activo'
    // en false para ocultarlo indefinidamente.
    pausadoHasta: { type: Date, default: null },
  },
  { timestamps: true }, // createdAt / updatedAt automáticos
);

// Evita redefinir el modelo si el contenedor serverless ya lo cargó.
export const Producto =
  mongoose.models.Producto || mongoose.model('Producto', ProductoSchema);

export { CATEGORIAS };
