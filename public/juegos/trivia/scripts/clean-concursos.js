// Vacía ÚNICAMENTE la colección de participantes del concurso (modelo Concurso).
// Ninguna otra colección es tocada. Uso: node scripts/clean-concursos.js
require('dotenv').config();
const mongoose = require('mongoose');
const Concurso = require('../models/concurso.model');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const { deletedCount } = await Concurso.deleteMany({}); // solo colección 'concursos'
    console.log(`[clean] Eliminados ${deletedCount} documentos de 'concursos'.`);
  } catch (err) {
    console.error('[clean] Error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
