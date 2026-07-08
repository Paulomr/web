require('dotenv').config();
const path = require('path');
const express = require('express');
const concursoRoutes = require('./routes/concurso.routes');
const scoreRoutes = require('./routes/score.routes');

const app = express();

// CORS: la web Angular (puerto 4200) y los juegos que sirve consumen esta API
// desde otro origen. Sin dependencia extra: cabeceras a mano.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Parseo del body: imprescindible para que req.body NO llegue undefined.
// Con tope de tamaño: los payloads del juego son diminutos.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sirve los archivos estáticos del frontend (aquí el propio index.html).
app.use(express.static(path.join(__dirname)));

// Assets de marca e ilustraciones (logos, Bernie, doodles): montaje explícito.
// OJO deploy: en Vercel estos archivos deben viajar en el bundle del lambda vía
// "includeFiles" de vercel.json (mismo patrón que js/** y butter.png). Si faltan
// allí, express.static no los encuentra y el catch-all SPA responde index.html
// (HTML donde el navegador espera una imagen) -> logo roto en producción.
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Favicon: responde limpio para que no caiga en el manejador de errores.
app.get('/favicon.ico', (req, res) => res.status(204).end());

// La conexión a BD se asegura en la capa de servicio (serverless-friendly):
// así las validaciones y los 404 de API responden aunque la BD esté caída.

// --- API ---
app.use('/api/concursos', concursoRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/chat', require('./routes/chat.routes'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Rutas de API desconocidas: 404 en JSON (que no caigan al catch-all del SPA).
app.all('/api/*', (req, res) => res.status(404).json({ error: 'Ruta de API no encontrada' }));

// Catch-all SPA: cualquier ruta no-API devuelve index.html.
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Middleware global de manejo de errores (al final de todo).
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err);
  // JSON malformado o body demasiado grande -> error del cliente, no 500.
  const status = err.status || err.statusCode;
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({ error: 'Solicitud inválida' });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Local: levanta servidor. En Vercel se exporta el app como handler.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`[Server] Escuchando en el puerto ${PORT}.`));
}

module.exports = app;
