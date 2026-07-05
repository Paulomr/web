const connectDB = require('../config/db');
const Concurso = require('../models/concurso.model');

// Capa de acceso a datos / lógica de negocio.
// Cada función asegura la conexión (cacheada) antes de tocar la BD.
async function crear(data) {
  try {
    await connectDB();
    return await Concurso.create({
      nombre: data.nombre,
      instagram: data.instagram,
      aciertos: data.aciertos,
      tiempo_ms: data.tiempo_ms,
    });
  } catch (err) {
    console.error('[Service] Error al crear concurso:', err.message);
    throw err;
  }
}

async function top(limit = 10) {
  // Tope defensivo: entre 1 y 500 filas (el frontend pide hasta 500 para el ranking).
  const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 500);
  await connectDB();
  return Concurso.find()
    .sort({ aciertos: -1, tiempo_ms: 1 })
    .limit(n)
    .select('nombre instagram aciertos tiempo_ms -_id')
    .lean();
}

async function existePorInstagram(instagram) {
  // String() defensivo: nunca pasar objetos (inyección de operadores) a la query.
  await connectDB();
  const doc = await Concurso.exists({ instagram: String(instagram) });
  return Boolean(doc);
}

// Duplicado por mismo Instagram O mismo nombre.
async function existeDuplicado({ nombre, instagram }) {
  const or = [];
  if (instagram) or.push({ instagram: String(instagram) });
  if (nombre) or.push({ nombre: String(nombre) });
  if (!or.length) return false;
  await connectDB();
  const doc = await Concurso.exists({ $or: or });
  return Boolean(doc);
}

module.exports = { crear, top, existePorInstagram, existeDuplicado };
