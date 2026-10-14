// "Postula tu negocio": la convocatoria para llevar un carrito de Crunchy Munch
// a locales de otra gente. CERRÓ el 2026-10-14: la página /postula y el
// marcador del hero se retiraron (están en el historial de git).
//
// Lo único que queda es el archivo de lo que llegó, que el panel de /admin
// sigue mostrando para poder escribirles a esos negocios. Este es su contrato.

/** Una postulación tal y como la devuelve /api/postulaciones?admin=1. */
export interface Postulacion {
  /** id de Mongo, en texto. Es lo que se manda al borrar. */
  id: string;
  /** Nombre del local. */
  negocio: string;
  /** @instagram del negocio. Es su identidad: uno por negocio. */
  instagram: string;
  /** Otra red o contacto, si lo dejaron (TikTok, WhatsApp…). Puede ir vacío. */
  otraRed: string;
  ciudad: string;
  direccion: string;
  /** Votos que alcanzó a juntar. Los cuenta el servidor. */
  votos: number;
  fecha: string;
}

/** Estado de moderación con el que quedó cuando cerró la convocatoria. */
export type EstadoPostulacion = 'pendiente' | 'aprobada' | 'oculta';

/** Postulación con su estado, para el panel de /admin. */
export interface PostulacionAdmin extends Postulacion {
  estado: EstadoPostulacion;
}
