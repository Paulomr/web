// "Postula tu negocio": la convocatoria para llevar un carrito de Crunchy Munch
// a locales de otra gente.
//
// Este archivo es el CONTRATO compartido: lo usan la página /postula, el
// recuadro de votados del hero, la ventana del terciopelo y el panel de
// moderación. La forma de los datos y los textos de la dinámica viven aquí y
// en ningún otro sitio, para que las cuatro piezas no se contradigan.

/** Una postulación tal y como la devuelve /api/postulaciones. */
export interface Postulacion {
  /** id de Mongo, en texto. Es lo que se manda al votar. */
  id: string;
  /** Nombre del local. */
  negocio: string;
  /** @instagram del negocio. Es su identidad: uno por negocio. */
  instagram: string;
  /** Otra red o contacto, si lo dejaron (TikTok, WhatsApp…). Puede ir vacío. */
  otraRed: string;
  ciudad: string;
  direccion: string;
  /** Votos acumulados. Lo calcula el servidor, nunca el navegador. */
  votos: number;
  fecha: string;
}

/** Lo que se envía al postular. */
export interface NuevaPostulacion {
  negocio: string;
  instagram: string;
  otraRed: string;
  ciudad: string;
  direccion: string;
}

/** Estados de moderación. Igual que en las opiniones: nada se publica solo. */
export type EstadoPostulacion = 'pendiente' | 'aprobada' | 'oculta';

/** Postulación con su estado, para el panel de /admin. */
export interface PostulacionAdmin extends Postulacion {
  estado: EstadoPostulacion;
}

/** Cuántos negocios se muestran en el recuadro del hero. */
export const TOP_VOTADOS = 4;

/** Ruta de la página de la convocatoria. */
export const RUTA_POSTULA = '/postula';

// ---------------------------------------------------------------------------
// Textos de la dinámica
// ---------------------------------------------------------------------------
//
// Los recuadros que van apareciendo mientras se recorre el video de /postula.
// `desde` y `hasta` son fracción del recorrido (0–1) y están calzados con los
// cortes del video (15 s): cada recuadro entra cuando cambia el plano, no en
// un momento cualquiera.
//
// Los cinco tramos miden lo MISMO (0,172) y van separados por 0,03, y las dos
// cosas importan:
//   · Anchos. Con los 0,15 y huecos de 0,05 de la primera versión el recuadro
//     se iba antes de terminar de leerlo, y entre uno y otro quedaban ratos de
//     video sin nada encima.
//   · Iguales. Repartidos a ojo, el último quedaba en 0,115 y —restados los
//     fundidos de 0,045 de cada lado— aguantaba 50 px de scroll a plena
//     opacidad frente a los ~520 de los demás. Se leía a la carrera.
// Si se vuelven a tocar estos números hay que mirar TAMBIÉN el alto de la
// sección en postula.css: es lo que decide cuánto scroll cuesta cada fracción
// y, con eso, cuántos segundos dura cada recuadro en pantalla.
//
// ⚠️ Son las condiciones que se le prometen a un negocio real. Están escritas
// a propósito SIN cifras, plazos ni exclusividad: nada de "sin arriendo",
// "cada mes" ni "el ganador se lleva X". Si se quiere concretar algo de eso,
// se escribe aquí y se revisa antes de publicar.
export interface PasoPostulacion {
  /** Rótulo corto: '01', '02'… o vacío para el recuadro de apertura. */
  numero: string;
  titulo: string;
  texto: string;
  /** Fracción del recorrido en que entra y sale. */
  desde: number;
  hasta: number;
}

export const PASOS: PasoPostulacion[] = [
  {
    numero: '',
    titulo: 'De qué se trata',
    texto:
      'Un carrito de Crunchy Munch, montado dentro de tu local. Tú pones el espacio y la gente que ya entra por tu puerta; nosotros ponemos el carrito, las galletas y la marca.',
    desde: 0.02,
    hasta: 0.192,
  },
  {
    numero: '01',
    titulo: 'Quién puede postular',
    texto:
      'Cualquier negocio con público: restaurante, café, bar, tienda, gimnasio, peluquería. No importa el tamaño. Importa que entre gente.',
    desde: 0.222,
    hasta: 0.394,
  },
  {
    numero: '02',
    titulo: 'Qué nos cuentas',
    texto:
      'El nombre de tu negocio, tus redes y dónde queda. Nada más. Si necesitamos algo, te escribimos por ahí mismo.',
    desde: 0.424,
    hasta: 0.596,
  },
  {
    numero: '03',
    titulo: 'La gente decide',
    texto:
      'Tu postulación queda publicada y quien tenga cuenta en Crunchy Munch puede votarla. Un voto por cuenta, para que el conteo sea de verdad.',
    desde: 0.626,
    hasta: 0.798,
  },
  {
    numero: '04',
    titulo: 'Los cuatro de arriba',
    texto:
      'Los cuatro negocios más votados salen en la portada de Crunchy Munch. Desde ahí hablamos contigo. Postular no te compromete a nada.',
    desde: 0.828,
    hasta: 1,
  },
];

// ---------------------------------------------------------------------------
// Validación (la misma que aplica el servidor, para avisar antes de enviar)
// ---------------------------------------------------------------------------

/** '@negocio' en minúsculas, o '' si viene vacío. Igual que en el backend. */
export function normalizarIg(s: string): string {
  const v = (s || '').trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

/**
 * Revisa el formulario y devuelve el primer problema en lenguaje llano, o ''
 * si está listo. El servidor vuelve a comprobarlo todo: esto es solo para no
 * hacerle dar un viaje en balde a quien está escribiendo.
 */
export function revisarPostulacion(p: NuevaPostulacion): string {
  if (p.negocio.trim().length < 2) return 'Escribe el nombre de tu negocio.';
  if (p.negocio.trim().length > 80) return 'El nombre es muy largo (máximo 80 letras).';
  if (!normalizarIg(p.instagram)) return 'Escribe el Instagram de tu negocio.';
  if (normalizarIg(p.instagram).length > 40) return 'Ese Instagram es demasiado largo.';
  if (p.otraRed.trim().length > 80) return 'Ese contacto es muy largo (máximo 80 letras).';
  if (p.ciudad.trim().length < 3) return 'Escribe la ciudad donde queda.';
  if (p.ciudad.trim().length > 60) return 'El nombre de la ciudad es muy largo.';
  if (p.direccion.trim().length < 5) return 'Escribe la dirección o el barrio.';
  if (p.direccion.trim().length > 120) return 'La dirección es muy larga (máximo 120 letras).';
  return '';
}
