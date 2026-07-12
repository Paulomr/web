// Catálogo central de minijuegos integrados en la aplicación.
//
// Cada juego declara CÓMO se ejecuta dentro de Angular mediante un iframe:
//  - kind 'static': es un HTML autocontenido que vive en `public/` y Angular
//    lo sirve en la raíz. La `url` es relativa (p. ej. 'juegos/headSoccer/...').
//  - kind 'server': es una app con su propio backend (Node/Express + BD) que
//    corre como proceso aparte. La `url` apunta a ese servidor (p. ej.
//    'http://localhost:3000'). Mientras el servidor no esté levantado, el
//    juego mostrará un aviso en lugar de cargar.
export type GameKind = 'static' | 'server';

export interface Game {
  /** Identificador único (usado en la URL del reproductor y en los scores). */
  id: string;
  /** Nombre visible del minijuego. */
  name: string;
  /** Cómo se ejecuta: estático en `public/` o servidor externo. */
  kind: GameKind;
  /** URL que carga el iframe del juego. */
  url: string;
  /** Descripción breve mostrada en la tarjeta. */
  description: string;
  /** Emoji usado como icono en la portada de la tarjeta. */
  icon: string;
  /** Fondo (gradiente CSS) de la portada de la tarjeta. */
  cover: string;
  /** Minitrailer en video (webm) grabado del juego; si falta, se usa la
   *  mini-escena animada en CSS de la portada. */
  trailer?: string;
  /** Nota opcional (por ejemplo, requisitos para ejecutarlo). */
  note?: string;
}

export const GAMES: Game[] = [
  {
    id: 'pacman',
    name: 'Pacman',
    kind: 'static',
    url: 'juegos/pacman/index.html',
    description: 'El clásico laberinto: come todos los puntos y escapa de los fantasmas.',
    icon: '👻',
    cover: 'linear-gradient(135deg, #f9e6b8 0%, #f9d1e5 100%)',
    trailer: 'juegos/trailers/pacman.mp4',
  },
  {
    id: 'pasteleria',
    name: 'Pastelería',
    kind: 'static',
    url: 'juegos/pasteleria/index.html',
    description: 'Prepara y decora dulces contra reloj en la cocina de Crunchy Munch.',
    icon: '🧁',
    cover: 'linear-gradient(135deg, #f9d1e5 0%, #e6d9f6 100%)',
  },
  {
    id: 'head-soccer',
    name: 'HeadBear Soccer',
    kind: 'static',
    url: 'juegos/headSoccer/index.html',
    description: 'Fútbol 1v1 de ositos hecho con Phaser. Se ejecuta en el navegador.',
    icon: '⚽',
    cover: 'linear-gradient(135deg, #cdeef5 0%, #d8f2dc 100%)',
    trailer: 'juegos/trailers/head-soccer.webm',
    note: 'Requiere conexión a internet (carga Phaser desde CDN).',
  },
  {
    id: 'catapulta',
    name: 'Catapulta',
    kind: 'static',
    url: 'juegos/catapulta/index.html',
    description: 'Apunta, calcula la fuerza y lanza. Física y puntería en cada tiro.',
    icon: '🎯',
    cover: 'linear-gradient(135deg, #e6d9f6 0%, #cdeef5 100%)',
  },
  {
    id: 'trivia',
    name: 'Reto Crunchy',
    kind: 'static',
    url: 'juegos/trivia/index.html',
    description: '20 preguntas, 25 segundos por pregunta. Demuestra cuánto sabes de Crunchy Munch.',
    icon: '🧠',
    cover: 'linear-gradient(135deg, #f9d1e5 0%, #f9e6b8 100%)',
    trailer: 'juegos/trailers/trivia.mp4',
  },
];

export function findGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}
