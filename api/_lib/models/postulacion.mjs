// Modelos de "Postula tu negocio": la convocatoria para meter un carrito de
// Crunchy Munch dentro del local de otra gente.
//
// Son DOS colecciones: la postulación del negocio y los votos que recibe.
// Los votos van aparte a propósito (ver abajo, en Voto).
//
// ⚠️ DATOS DE UN NEGOCIO REAL: nombre, @instagram, ciudad y dirección. El
// @instagram del negocio SE PUBLICA en la web cuando la postulación se aprueba
// (es lo que deja que la gente lo mire antes de votarlo), y quien postula lo
// sabe al enviar el formulario. La dirección no se muestra en la portada, pero
// vive aquí: tratarla como dato del negocio, no como dato de mostrador.
import mongoose from 'mongoose';

const PostulacionSchema = new mongoose.Schema(
  {
    negocio: { type: String, required: true, trim: true, maxlength: 80 },
    // Identidad del negocio: un local = una postulación. Si vuelve a postularse
    // con el mismo @, se actualiza la que ya había en vez de crear un duplicado.
    instagram: { type: String, required: true, trim: true, lowercase: true, unique: true },
    // Otra red o contacto (TikTok, WhatsApp…). Opcional: no todos tienen más de una.
    otraRed: { type: String, default: '', trim: true, maxlength: 80 },
    ciudad: { type: String, required: true, trim: true, maxlength: 60 },
    direccion: { type: String, required: true, trim: true, maxlength: 120 },
    // 'pendiente' recién enviada · 'aprobada' visible y votable · 'oculta' rechazada.
    // Nada se publica solo: igual que las opiniones, pasa por /admin.
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'oculta'],
      default: 'pendiente',
      index: true,
    },
  },
  { timestamps: true },
);

// Un voto es un documento propio y NO un contador dentro de la postulación:
// así se puede saber quién votó (para mover su voto) y el conteo nunca se
// desincroniza. El total se calcula agregando esta colección.
const VotoSchema = new mongoose.Schema(
  {
    // Un voto por cuenta en TODA la convocatoria, no uno por negocio: por eso
    // el único es el @instagram del votante y no la pareja (votante, negocio).
    // Votar otra vez mueve este mismo documento a la otra postulación.
    instagram: { type: String, required: true, trim: true, lowercase: true, unique: true },
    postulacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Postulacion',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const Postulacion =
  mongoose.models.Postulacion || mongoose.model('Postulacion', PostulacionSchema);
export const Voto = mongoose.models.Voto || mongoose.model('Voto', VotoSchema);
