// Canje de premio: cuando un cliente reclama un premio, se crea un código de un
// solo uso que el vendedor confirma/entrega en /admin. Anti-trampa: la
// elegibilidad se valida y descuenta en el servidor al reclamar.
import mongoose from 'mongoose';

const CanjeSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true },
    instagram: { type: String, required: true, lowercase: true, trim: true },
    tipo: { type: String, required: true }, // 'sellos' | 'estrellas'
    descripcion: { type: String, default: '' },
    valor: { type: Number, default: 0 }, // COP (0 si es en especie)
    entregado: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Canje = mongoose.models.Canje || mongoose.model('Canje', CanjeSchema);
