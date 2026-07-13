// Configuración de la tarjeta de fidelidad (documento único).
// Guarda el "código del día" que el vendedor entrega en cada compra que califica.
import mongoose from 'mongoose';

const FidelidadSchema = new mongoose.Schema(
  {
    clave: { type: String, default: 'fidelidad', unique: true },
    // Código del día (secreto): el cliente lo canjea para sumar 1 sello.
    codigoDia: { type: String, default: '' },
    // Fecha (YYYY-MM-DD, hora Colombia) para la que vale el código.
    fecha: { type: String, default: '' },
    // Compra mínima para dar sello (referencia visible; el vendedor la controla).
    umbral: { type: Number, default: 25000 },
    // Sellos que completan una tarjeta.
    meta: { type: Number, default: 10 },
  },
  { timestamps: true },
);

export const Fidelidad =
  mongoose.models.Fidelidad || mongoose.model('Fidelidad', FidelidadSchema);
