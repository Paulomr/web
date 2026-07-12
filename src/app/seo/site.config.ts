/**
 * ============================================================================
 *  CONFIGURACIÓN SEO CENTRAL — Crunchy Munch
 * ============================================================================
 *  Este es el ÚNICO archivo de código que necesitas tocar para el SEO por
 *  página. El SeoService lo lee y actualiza el <title>, la descripción, el
 *  canonical y las etiquetas Open Graph cada vez que cambias de sección.
 *
 *  👉 Busca  RELLENAR  para ver lo que debes completar.
 * ============================================================================
 */

export const SITE = {
  /**
   * ⬇️ RELLENAR: tu dominio (con https, SIN barra final).
   *    Debe ser EXACTAMENTE el mismo que pusiste en:
   *      · src/index.html
   *      · public/robots.txt
   *      · public/sitemap.xml
   *    Sin dominio propio aún → usa el de Vercel, p. ej.
   *    'https://crunchy-munch.vercel.app'
   */
  url: 'https://www.crunchy-munch.com',

  nombre: 'MUNDO CRUNCHY MUNCH',

  /** Se añade al final de cada título de página: "… · MUNDO CRUNCHY MUNCH". */
  sufijoTitulo: 'MUNDO CRUNCHY MUNCH',

  /** Imagen por defecto al compartir (relativa al dominio). 1200×630 ideal. */
  imagenCompartir: '/fotos/og-crunchy-munch.jpg',
};

/** Metadatos por ruta. La clave es la ruta exacta ('' = inicio). */
export interface PageSeo {
  title: string;
  description: string;
  /** Imagen propia de la página (opcional; si no, usa SITE.imagenCompartir). */
  image?: string;
}

export const PAGES: Record<string, PageSeo> = {
  // Inicio
  '': {
    title: 'Galletas estilo Nueva York en Rionegro y Marinilla',
    description:
      'Crunchy Munch: galletas New York style, crookies, milkshakes y minis recién horneadas. Sedes en San Antonio de Pereira (Rionegro) y Marinilla, Antioquia. Pide por WhatsApp.',
  },

  // Catálogo / menú
  catalogo: {
    title: 'Catálogo y menú — NY Cookies, crookies y milkshakes',
    description:
      'Mira el menú completo de Crunchy Munch: galletas estilo Nueva York, crookies, milkshakes, mini cookies y bebidas. Elige y pide directo por WhatsApp en Rionegro o Marinilla.',
  },

  // Sedes
  sedes: {
    title: 'Sedes en Rionegro (San Antonio de Pereira) y Marinilla',
    description:
      'Visita Crunchy Munch: sede San Antonio de Pereira (Rionegro), abierta todos los días de 12 m a 8 pm con DrinkLab (matcha, chai, café y granizados), y sede Marinilla. Horarios, mapa y cómo llegar.',
  },

  // Galería
  galeria: {
    title: 'Galería — nuestras galletas y sedes',
    description:
      'Fotos de las galletas, milkshakes y sedes de Crunchy Munch en San Antonio de Pereira (Rionegro) y Marinilla. Conoce a Bearnie y nuestro estilo New York.',
  },

  // Minijuegos
  minijuegos: {
    title: 'Minijuegos — juega y gana con Bearnie',
    description:
      'Diviértete con los minijuegos de Crunchy Munch: pacman, fútbol, catapulta, trivia y más. Juega en tu navegador y compite por el mejor puntaje.',
  },
};
