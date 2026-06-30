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
  /** Identificador único (usado en la URL del reproductor). */
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
  /** Nota opcional (por ejemplo, requisitos para ejecutarlo). */
  note?: string;
}

export const GAMES: Game[] = [
  {
    id: 'head-soccer',
    name: 'Head Soccer (Bears)',
    kind: 'static',
    url: 'juegos/headSoccer/bear-soccer-phaser.html',
    description: 'Juego de fútbol 1v1 hecho con Phaser. Se ejecuta en el navegador.',
    icon: '⚽',
    cover: 'linear-gradient(135deg, #22c55e 0%, #0ea5e9 100%)',
    note: 'Requiere conexión a internet (carga Phaser desde CDN).',
  },
  {
    id: 'trivia',
    name: 'Trivia / Concursos',
    kind: 'server',
    url: 'http://localhost:3000',
    description: 'Trivia con backend Node.js (Express + MongoDB).',
    icon: '🧠',
    cover: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    note: 'Necesita el backend levantado en el puerto 3000 y una MONGODB_URI configurada.',
  },
];

export function findGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}
