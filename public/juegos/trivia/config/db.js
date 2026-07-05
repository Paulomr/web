const mongoose = require('mongoose');

// Conexión cacheada (apta para serverless/Vercel): no reconecta en cada invocación
// y NO usa process.exit (eso mataría la función y daría 500).
let cached = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta MONGODB_URI en las variables de entorno.');

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!cached) {
    cached = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log('[DB] MongoDB conectado.');
        return m;
      })
      .catch((err) => {
        cached = null; // permite reintentar en la próxima petición
        throw err;
      });
  }
  return cached;
}

module.exports = connectDB;
