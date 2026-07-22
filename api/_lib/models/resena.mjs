// Modelo "Resena": opiniones que dejan los clientes registrados en la web.
//
// Solo se publican las que el administrador aprueba desde /admin: hasta
// entonces quedan en 'pendiente' y no las ve nadie más que él.
//
// ⚠️ DATO PERSONAL: guarda el @instagram y el nombre de quien opina. Ambos son
// visibles en la portada cuando la reseña se aprueba, y el cliente lo sabe al
// enviarla (se le avisa en el formulario).
import mongoose from 'mongoose';

const ResenaSchema = new mongoose.Schema(
  {
    // Identidad del autor: el mismo @instagram con el que se registró.
    // Único: cada cuenta tiene UNA opinión (si la vuelve a enviar, la reemplaza).
    instagram: { type: String, required: true, trim: true, lowercase: true, unique: true },
    // Nombre mostrado, copiado de la cuenta al momento de opinar.
    nombre: { type: String, required: true, trim: true },
    estrellas: { type: Number, required: true, min: 1, max: 5 },
    texto: { type: String, required: true, trim: true, maxlength: 600 },
    // 'pendiente' recién enviada · 'aprobada' visible en la web · 'oculta' rechazada.
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'oculta'],
      default: 'pendiente',
      index: true,
    },
  },
  { timestamps: true },
);

export const Resena = mongoose.models.Resena || mongoose.model('Resena', ResenaSchema);
