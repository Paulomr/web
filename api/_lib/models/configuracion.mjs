// Configuración del sitio: un único documento (clave 'site') con los textos
// editables, qué minijuegos se muestran y los datos de sedes (horarios, etc.).
// Se usa Mixed para permitir campos flexibles sin migraciones.
import mongoose from 'mongoose';

const ConfiguracionSchema = new mongoose.Schema(
  {
    clave: { type: String, default: 'site', unique: true },
    textos: { type: mongoose.Schema.Types.Mixed, default: {} },
    juegos: { type: mongoose.Schema.Types.Mixed, default: {} },
    sedes: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true, minimize: false },
);

export const Configuracion =
  mongoose.models.Configuracion || mongoose.model('Configuracion', ConfiguracionSchema);
