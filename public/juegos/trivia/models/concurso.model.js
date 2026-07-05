const mongoose = require('mongoose');

const concursoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    instagram: { type: String, required: true, trim: true },
    aciertos: { type: Number, default: 0, min: 0 },
    tiempo_ms: { type: Number, default: 0, min: 0 },
    estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' },
    fechaInscripcion: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Concurso', concursoSchema);
