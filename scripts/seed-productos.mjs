// Semilla: sube el menú actual (el mismo de src/app/productos.ts) a MongoDB.
// Se ejecuta con:  npm run seed
// (npm run seed transpila productos.ts a scripts/_productos.gen.mjs y corre esto.)
//
// Lee MONGODB_URI del archivo .env (no imprime la clave en ningún momento).
import fs from 'node:fs';
import mongoose from 'mongoose';
import { Producto } from '../api/_lib/models/producto.mjs';
import { PRODUCTOS } from './_productos.gen.mjs';

// --- Carga simple del .env (sin dependencias) ---
try {
  const env = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const linea of env.split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  /* sin .env: se usa el entorno del sistema */
}

const uri = process.env.MONGODB_URI;
if (!uri || uri.includes('PEGA_AQUI')) {
  console.error('❌ Falta MONGODB_URI en el .env (o quedó el texto de ejemplo).');
  process.exit(1);
}

console.log('Conectando a MongoDB…');
await mongoose.connect(uri);

let n = 0;
for (let i = 0; i < PRODUCTOS.length; i++) {
  const p = PRODUCTOS[i];
  await Producto.updateOne(
    { slug: p.id },
    {
      $set: {
        slug: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion ?? '',
        fotos: p.fotos ?? [],
        precio: p.precio ?? '',
        detalle: p.detalle ?? '',
        categoria: p.categoria,
        nuevo: Boolean(p.nuevo),
        orden: i,
        activo: true,
      },
    },
    { upsert: true },
  );
  n++;
}

console.log(`✅ Semilla lista: ${n} productos en la base "crunchymunch".`);
await mongoose.disconnect();
