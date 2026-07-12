// Sube una imagen a Vercel Blob (almacén de archivos) y devuelve su URL pública.
// Solo admin. La imagen llega ya optimizada (achicada) desde el navegador como
// base64, así que el cuerpo es pequeño y rápido.
//
// ⚠️ RELLENAR EN VERCEL: crea un store de tipo "Blob" (Storage -> Create ->
//    Blob) y conéctalo al proyecto. Eso crea sola la variable BLOB_READ_WRITE_TOKEN.
import { put } from '@vercel/blob';
import { requiereAdmin } from './_lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  if (!requiereAdmin(req, res)) return;

  try {
    const { nombre, tipo, data } = req.body ?? {};
    if (!data || typeof data !== 'string') {
      res.status(400).json({ error: 'Falta la imagen' });
      return;
    }

    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > 4 * 1024 * 1024) {
      res.status(413).json({ error: 'La imagen es muy grande' });
      return;
    }

    const contentType = typeof tipo === 'string' && tipo.startsWith('image/') ? tipo : 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const base = String(nombre || 'foto')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9-]/gi, '_')
      .slice(0, 40);

    const blob = await put(`productos/${base}.${ext}`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
    });

    res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('Error en /api/upload:', err);
    res.status(500).json({ error: 'No se pudo subir la imagen (¿configuraste Vercel Blob?)' });
  }
}
