// Arte de marca de Crunchy Munch, servido desde public/arte/.
//
// A diferencia de FOTOS (la sesión de fotos, todas 1000×1500), aquí cada pieza
// tiene su propia forma: pop-art cuadrado, pósters verticales, banners
// ultra-anchos y tres piezas en video. Por eso cada una lleva sus medidas
// reales: el mosaico reserva el hueco con `aspect-ratio` antes de que cargue
// y así la cuadrícula no da el salto al terminar de bajar cada imagen.
export interface Arte {
  /** Nombre del archivo dentro de public/arte/ (sin extensión para los videos). */
  archivo: string;
  /** El video se reproduce en bucle y silenciado; la imagen es estática. */
  tipo: 'imagen' | 'video';
  ancho: number;
  alto: number;
  alt: string;
}

export const ARTE: Arte[] = [
  {
    archivo: 'nngh.webp',
    tipo: 'imagen',
    ancho: 1400,
    alto: 1400,
    alt: 'Ilustración pop-art: la pata de Bearnie con sombrero sobre un estallido azul y el rótulo NNGH',
  },
  {
    archivo: 'kaboom.webp',
    tipo: 'imagen',
    ancho: 1400,
    alto: 1400,
    alt: 'Ilustración pop-art amarilla: Bearnie saltando de la silla con el rótulo KABOOM',
  },
  {
    archivo: 'slurrrp.webp',
    tipo: 'imagen',
    ancho: 1400,
    alto: 1400,
    alt: 'Ilustración pop-art: Bearnie con sombrero bebiendo de una taza, con el rótulo SLURRRP',
  },
  {
    archivo: 'diner.webp',
    tipo: 'imagen',
    ancho: 1400,
    alto: 781,
    alt: 'Bearnie merendando galletas en una cafetería rosa de los años cincuenta',
  },
  {
    archivo: 'poster-bigsips.webp',
    tipo: 'imagen',
    ancho: 792,
    alto: 1400,
    alt: 'Póster vintage de Bearnie: café, galletas y el lema Big Sips, Bigger Smiles',
  },
  {
    archivo: 'caja-cielo.webp',
    tipo: 'imagen',
    ancho: 1400,
    alto: 788,
    alt: 'Los ositos asomándose desde dentro de la caja abierta contra el cielo',
  },
  {
    archivo: 'banco.webp',
    tipo: 'imagen',
    ancho: 1400,
    alto: 792,
    alt: 'Bearnie sentado en un banco con una bolsa de galletas que brilla',
  },
  {
    archivo: 'banner-1.webp',
    tipo: 'imagen',
    ancho: 2400,
    alto: 1028,
    alt: "Banner al estilo japonés con el rótulo Bearnie's y el oso con gafas de sol",
  },
  {
    archivo: 'banner-2.webp',
    tipo: 'imagen',
    ancho: 2400,
    alto: 1028,
    alt: "Segundo banner al estilo japonés con el rótulo Bearnie's",
  },
  {
    archivo: 'samurai-neon',
    tipo: 'video',
    ancho: 540,
    alto: 968,
    alt: 'Bearnie con kimono y mirada encendida, rodeado de un aura de neón',
  },
  {
    archivo: 'samurai-dulces',
    tipo: 'video',
    ancho: 540,
    alto: 968,
    alt: 'Bearnie con kimono y katana caminando por un paisaje de dulces al atardecer',
  },
  {
    archivo: 'samurai-bambu',
    tipo: 'video',
    ancho: 540,
    alto: 968,
    alt: 'Bearnie con kimono bajo la lluvia en un bosque de bambú',
  },
];

/** Los dos banners ultra-anchos, que la portada usa en su tira horizontal. */
export const ARTE_BANNERS = ARTE.filter((a) => a.archivo.startsWith('banner-'));
