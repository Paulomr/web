const service = require('../services/concurso.service');

// Cierre de participación: 25 de junio 2026, 8:00 PM hora Colombia (UTC-5).
const FECHA_CIERRE = new Date('2026-06-25T20:00:00-05:00');

// Normaliza el usuario de Instagram: minúsculas, sin espacios y con '@' inicial.
function normIg(v) {
  if (typeof v !== 'string') return '';
  let ig = v.trim().toLowerCase().replace(/\s+/g, '');
  if (ig && !ig.startsWith('@')) ig = '@' + ig;
  return ig.slice(0, 40);
}

// Sanea el body: solo strings/números planos con topes.
// Evita inyección NoSQL (objetos tipo {$ne:...}) y valores fuera de rango.
function sanitizar(body) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim().slice(0, 60) : '';
  const instagram = normIg(body.instagram);
  const aciertos = Math.min(Math.max(parseInt(body.aciertos, 10) || 0, 0), 100);
  const tiempo_ms = Math.min(Math.max(parseInt(body.tiempo_ms, 10) || 0, 0), 86400000);
  return { nombre, instagram, aciertos, tiempo_ms };
}

// Capa de red (HTTP). Solo orquesta req/res.
async function crear(req, res) {
  try {
    // Validación obligatoria de cierre en el backend.
    if (new Date() > FECHA_CIERRE) {
      return res.status(403).json({ error: 'El concurso ha finalizado' });
    }
    const datos = sanitizar(req.body || {});
    if (!datos.nombre || !datos.instagram) {
      return res.status(400).json({ error: 'nombre e instagram son obligatorios' });
    }
    // Prevención de duplicados (mismo Instagram o mismo nombre).
    if (await service.existeDuplicado(datos)) {
      return res.status(409).json({ error: 'Ese usuario o Instagram ya participó' });
    }
    const creado = await service.crear(datos);
    return res.status(201).json(creado);
  } catch (err) {
    console.error('[Controller] Error al crear:', err.message);
    if (err.name === 'ValidationError') return res.status(400).json({ error: 'Datos inválidos' });
    return res.status(500).json({ error: 'Error interno al guardar' });
  }
}

async function top(req, res) {
  try {
    const data = await service.top(req.query.limit);
    return res.json(data);
  } catch (err) {
    console.error('[Controller] Error en top:', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function existe(req, res) {
  try {
    const instagram = normIg(req.query.instagram);
    if (!instagram) {
      return res.status(400).json({ error: 'instagram es obligatorio' });
    }
    const exists = await service.existePorInstagram(instagram);
    return res.json({ exists });
  } catch (err) {
    console.error('[Controller] Error en existe:', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { crear, top, existe };
