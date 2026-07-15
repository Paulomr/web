// Catálogo real de Crunchy Munch (Rionegro y Marinilla), tomado del
// catálogo de WhatsApp Business. Precios en pesos colombianos.
//
// Cada producto puede tener VARIAS fotos (fotos[]): la tarjeta las rota
// automáticamente. Un producto sin fotos muestra a Bearnie de portada.

/** Números de WhatsApp por sede (formato internacional sin + ni espacios). */
export const WHATSAPP_SEDES = {
  'san-antonio': '573233879652',
  marinilla: '573215265493',
} as const;

/** Número por defecto (San Antonio) para los enlaces rápidos del catálogo. */
export const WHATSAPP = WHATSAPP_SEDES['san-antonio'];

export type Categoria = 'cookies' | 'crookies' | 'milkshakes' | 'minis' | 'bebidas';

/** Etiquetas visibles de cada categoría, en orden de presentación. */
export const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: 'cookies', label: 'NEW YORK COOKIES' },
  { id: 'minis', label: 'MINI COOKIES' },
  { id: 'milkshakes', label: 'MILKSHAKES' },
  { id: 'crookies', label: 'NEW YORK CROOKIES' },
  { id: 'bebidas', label: 'DRINKLAB' },
];

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  /** Fotos en public/fotos/ (vacío = portada con Bearnie). */
  fotos: string[];
  /** Precio visible. Vacío = consultar. */
  precio: string;
  /** Dato corto extra (gramaje, tamaño). */
  detalle?: string;
  categoria: Categoria;
  /** Marca "nuevo" en la tarjeta. */
  nuevo?: boolean;
}

export const PRODUCTOS: Producto[] = [
  // ---------- NEW YORK COOKIES ----------
  {
    id: 'birthday',
    nombre: 'BIRTHDAY',
    descripcion: 'Galleta sorpresa con relleno de temporada. ¡Pregunta cuál es el relleno actual!',
    fotos: ['bearnie-0019.webp', 'bearnie-0006.webp', 'bearnie-0025.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'kinder',
    nombre: 'KINDER',
    descripcion: 'La más icónica: repleta de chocolate Kinder y rellena de Nutella.',
    fotos: ['bearnie-0228.webp', 'bearnie-0234.webp', 'bearnie-0245.webp'],
    precio: '$ 15.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'ferrero',
    nombre: 'FERRERO',
    descripcion: 'Chunks de chocolate semiamargo y un Ferrero entero por dentro.',
    fotos: ['bearnie-0045.webp', 'bearnie-0033.webp'],
    precio: '$ 15.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'oreo',
    nombre: 'OREO',
    descripcion: 'Piensa en un McFlurry de Oreo: galleta mezclada con Oreo y rellena de muuucho arequipe de la mejor calidad.',
    fotos: ['bearnie-0139.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'red-velvet',
    nombre: 'RED VELVET',
    descripcion: 'Rellena de cheesecake y coronada con lluvia de chocolate blanco.',
    fotos: ['bearnie-0121.webp', 'bearnie-0117.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'smores',
    nombre: "SMORE'S",
    descripcion: 'Rellena de chocolate y coronada con marshmellow dorado. Más chocolate que galleta.',
    fotos: ['bearnie-0393.webp', 'bearnie-0391.webp', 'bearnie-0395.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'reeses',
    nombre: "REESE'S",
    descripcion: '¿Te gusta el maní? Relleno de crema de maní, coronada con Reese’s y chocolate blanco.',
    fotos: ['bearnie-0100.webp', 'bearnie-0086.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'sea-salt',
    nombre: 'SEA SALT',
    descripcion: 'Una galleta de puro chocolate y sal marina: el contraste perfecto.',
    fotos: ['bearnie-0061.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'macadamia',
    nombre: 'MACADAMIA',
    descripcion: 'Una clásica rellena de mucho chocolate blanco y macadamias.',
    fotos: ['bearnie-0178.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'pie-limon',
    nombre: 'PIE LIMÓN',
    descripcion: 'Galleta sultana con relleno cremoso y corona de limón mandarino.',
    fotos: ['bearnie-0330.webp', 'bearnie-0321.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'pie-maracuya',
    nombre: 'PIE MARACUYÁ',
    descripcion: 'Galleta sultana con relleno y corona de maracuyá.',
    fotos: ['bearnie-0294.webp', 'bearnie-0289.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },
  {
    id: 'tres-chocolates',
    nombre: '3 CHOCOLATES',
    descripcion: 'Galleta de chocolate con trozos de chocolate blanco y relleno de Nutella.',
    fotos: ['bearnie-0263.webp', 'bearnie-0267.webp'],
    precio: '$ 13.000',
    detalle: '120 G',
    categoria: 'cookies',
  },

  // ---------- CROOKIES ----------
  {
    id: 'crookie-kinder',
    nombre: 'NY CROOKIE KINDER (NUTELLA)',
    descripcion: 'Croissant hojaldrado con queso, coronado con masa de galleta y relleno de Nutella y Kinder.',
    fotos: ['bearnie-0559.webp', 'bearnie-0566.webp'],
    precio: '$ 25.000',
    categoria: 'crookies',
  },
  {
    id: 'crookie-doble-kinder',
    nombre: 'NY CROOKIE DOBLE KINDER (NUTELLA)',
    descripcion: 'La nueva locura: doble Kinder sobre nuestro croissant hojaldrado con queso y Nutella.',
    fotos: [],
    precio: '$ 25.000',
    categoria: 'crookies',
    nuevo: true,
  },
  {
    id: 'crookie-triple-chocolate',
    nombre: 'NY CROOKIE TRIPLE CHOCOLATE (NUTELLA)',
    descripcion: 'Croissant hojaldrado con queso, masa de galleta de chocolate y corazón de Nutella.',
    fotos: ['bearnie-0609.webp', 'bearnie-0601.webp', 'bearnie-0588.webp'],
    precio: '$ 25.000',
    categoria: 'crookies',
  },
  {
    id: 'crookie-red-velvet',
    nombre: 'NY CROOKIE RED VELVET (CHEESECAKE)',
    descripcion: 'Croissant hojaldrado con queso, red velvet y relleno de cheesecake.',
    fotos: ['bearnie-0577.webp', 'bearnie-0572.webp'],
    precio: '$ 25.000',
    categoria: 'crookies',
  },

  // ---------- MILKSHAKES (helado de tu galleta favorita) ----------
  {
    id: 'milkshake-cookies-cream',
    nombre: 'MILKSHAKE COOKIES & CREAM',
    descripcion: 'Helado de tu galleta favorita batido y coronado con crumble de galleta.',
    fotos: ['bearnie-0805.webp', 'bearnie-0825.webp'],
    precio: '$ 25.000',
    detalle: '450 G',
    categoria: 'milkshakes',
  },
  {
    id: 'milkshake-fresa',
    nombre: 'MILKSHAKE FRESA',
    descripcion: 'Cremoso de fresa con crumble de red velvet y fresas liofilizadas.',
    fotos: ['bearnie-0648.webp', 'bearnie-0630.webp'],
    precio: '$ 25.000',
    detalle: '450 G',
    categoria: 'milkshakes',
  },
  {
    id: 'milkshake-red-velvet',
    nombre: 'MILKSHAKE RED VELVET',
    descripcion: 'Batido de red velvet coronado con crumble rojo y crema.',
    fotos: ['bearnie-1180.webp'],
    precio: '$ 25.000',
    detalle: '450 G',
    categoria: 'milkshakes',
  },

  // ---------- MINI COOKIES ----------
  {
    id: 'caja-minicookies',
    nombre: 'CAJA MINICOOKIES (4 PERSONAS)',
    descripcion: 'Caja de 450 gramos (≈90 minicookies) acompañada de 2 toppings.',
    fotos: ['bearnie-0513.webp', 'bearnie-0537.webp'],
    precio: '$ 50.000',
    detalle: '450 G',
    categoria: 'minis',
  },
  {
    id: 'vaso-minicookies',
    nombre: 'VASO MINICOOKIES (2 PERSONAS)',
    descripcion: 'Vaso de 220 gramos (≈40 minicookies) acompañado de 1 topping.',
    fotos: ['bearnie-0433.webp', 'bearnie-0507.webp'],
    precio: '$ 25.000',
    detalle: '220 G',
    categoria: 'minis',
  },

  // ---------- BEBIDAS ----------
  {
    id: 'matcha',
    nombre: 'MATCHA LATTE',
    descripcion: 'Matcha cremoso sobre leche fría con hielo, en vaso Crunchy Munch.',
    fotos: ['bearnie-0927.webp', 'bearnie-0939.webp', 'bearnie-0953.webp', 'bearnie-0960.webp'],
    precio: '$ 12.000',
    categoria: 'bebidas',
  },
  {
    id: 'mango-matcha',
    nombre: 'MANGO MATCHA',
    descripcion: 'Matcha con mango sobre leche fría con hielo: dulce, frutal y cremoso.',
    fotos: [],
    precio: '$ 14.000',
    categoria: 'bebidas',
    nuevo: true,
  },
  {
    id: 'strawberry-matcha',
    nombre: 'STRAWBERRY MATCHA',
    descripcion: 'Matcha con fresa sobre leche fría con hielo: el dúo de moda.',
    fotos: [],
    precio: '$ 14.000',
    categoria: 'bebidas',
    nuevo: true,
  },
  {
    id: 'chai',
    nombre: 'CHAI HELADO',
    descripcion: 'Chai especiado sobre leche fría con hielo y canela.',
    fotos: ['bearnie-0990.webp'],
    precio: '$ 12.000',
    categoria: 'bebidas',
  },
  {
    id: 'hatsu-rosa',
    nombre: 'HATSU SODA ROSA',
    descripcion: 'Soda Hatsu de frutos rojos, la compañera oficial de las galletas.',
    fotos: [],
    precio: '',
    categoria: 'bebidas',
  },
  {
    id: 'hatsu-verde',
    nombre: 'HATSU SODA VERDE',
    descripcion: 'Soda Hatsu verde, fresca y burbujeante.',
    fotos: [],
    precio: '',
    categoria: 'bebidas',
  },
  {
    id: 'hatsu-naranja',
    nombre: 'HATSU SODA NARANJA',
    descripcion: 'Soda Hatsu naranja, cítrica y liviana.',
    fotos: [],
    precio: '',
    categoria: 'bebidas',
  },
  {
    id: 'coca-cola',
    nombre: 'COCA-COLA',
    descripcion: 'Coca-Cola bien fría, tamaño personal.',
    fotos: [],
    precio: '',
    categoria: 'bebidas',
  },
  {
    id: 'coca-cola-zero',
    nombre: 'COCA-COLA ZERO',
    descripcion: 'Coca-Cola Zero bien fría, tamaño personal.',
    fotos: [],
    precio: '',
    categoria: 'bebidas',
  },
  {
    id: 'leche-colanta',
    nombre: 'LECHE COLANTA PERSONAL',
    descripcion: 'Leche Colanta tetrapack personal: el combo clásico con galleta.',
    fotos: [],
    precio: '',
    categoria: 'bebidas',
  },
];

/**
 * URL final de una foto. Las subidas nuevas guardan una URL completa
 * (https://…, de Vercel Blob); las viejas guardan solo el nombre del archivo
 * en /fotos. Este helper resuelve ambos casos.
 */
export function urlFoto(foto: string): string {
  if (!foto) return '';
  return /^https?:\/\//i.test(foto) ? foto : 'fotos/' + foto;
}

/** Enlace de pedido directo por WhatsApp con mensaje prellenado. */
export function linkPedido(p: Producto): string {
  const msg = `Hola Crunchy Munch! Quiero pedir: ${p.nombre}`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}
