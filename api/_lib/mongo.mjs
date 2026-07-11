// Conexión a MongoDB para las funciones serverless de Vercel.
//
// En serverless, cada llamada puede arrancar en un "contenedor" nuevo. Si
// abriéramos una conexión por llamada, agotaríamos la base de datos. Por eso
// cacheamos la conexión en una variable global y la reutilizamos: es el patrón
// oficial recomendado para Mongoose + Vercel/serverless.
//
// ⚠️ RELLENAR EN VERCEL Y EN TU .env LOCAL:
//    MONGODB_URI = la cadena de conexión de MongoDB Atlas
//    (ej: mongodb+srv://usuario:clave@cluster0.xxxx.mongodb.net/crunchymunch)
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Cache entre invocaciones (sobrevive mientras el contenedor siga vivo).
let cache = globalThis.__mongo;
if (!cache) cache = globalThis.__mongo = { conn: null, promise: null };

export async function conectarDB() {
  if (!MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
  }
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // permite reintentar en la siguiente llamada
    throw err;
  }
  return cache.conn;
}
