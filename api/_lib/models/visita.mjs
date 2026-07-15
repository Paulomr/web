// Visita (pageview) de la web, para las estadísticas de tráfico del panel.
// Un documento por navegación. `sessionId` es un id anónimo del navegador
// (no identifica a la persona): sirve para contar visitantes únicos.
import mongoose from 'mongoose';

const VisitaSchema = new mongoose.Schema(
  {
    sessionId: { type: String, default: '', index: true },
    path: { type: String, default: '' },
    // true si había sesión de cliente al visitar (para separar registrados).
    registrado: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Para las consultas por rango de fecha (tráfico por día/mes/año, "en vivo").
VisitaSchema.index({ createdAt: -1 });

export const Visita = mongoose.models.Visita || mongoose.model('Visita', VisitaSchema);
