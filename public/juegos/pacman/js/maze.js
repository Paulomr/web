/* Mapa de PANICO LACTEO (19x21) + parser a grilla + repuesto de migas.
   Chars: # muro, . miga, o power-galleta, ' ' transitable sin miga,
   - puerta nevera (solo leches), N interior nevera, T boca de tunel (warp fila 9),
   H horno, P spawn del jugador (mirando izquierda). */

import { COLS, ROWS } from './config.js';

export const MAPA = [
  '###################',
  '#o.......#.......o#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###.#.###.####',
  '####.#       #.####',
  '####.# ##-## #.####',
  'T      #NNN#      T',
  '####.# ##### #.####',
  '#....#       #....#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#.#.#.#.##.#',
  '#....#...H...#....#',
  '#.##.#.#.#.#.#.##.#',
  '#....#...P...#....#',
  '#.##.###.#.###.##.#',
  '#o...............o#',
  '###################',
];

export function parseMaze() {
  const grid = [];
  let total = 0;
  const warpFila = 9;
  const powerPos = [];
  let hornoPos = { x: 9, y: 15 };
  let spawnPos = { x: 9, y: 17 };
  for (let y = 0; y < ROWS; y++) {
    const fila = [];
    const linea = MAPA[y] || '';
    for (let x = 0; x < COLS; x++) {
      const c = linea[x] || ' ';
      let tipo = 'vacio', walkable = true, hasPellet = false, hasPower = false,
        puerta = false, tunel = false, nevera = false, horno = false;
      if (c === '#') { tipo = 'muro'; walkable = false; }
      else if (c === '.') { tipo = 'miga'; hasPellet = true; total++; }
      else if (c === 'o') { tipo = 'power'; hasPower = true; total++; powerPos.push({ x, y }); }
      else if (c === '-') { tipo = 'puerta'; walkable = false; puerta = true; }
      else if (c === 'N') { tipo = 'nevera'; walkable = false; nevera = true; }
      else if (c === 'T') { tipo = 'tunel'; tunel = true; }
      else if (c === 'H') { tipo = 'horno'; horno = true; hornoPos = { x, y }; }
      else if (c === 'P') { tipo = 'spawn'; spawnPos = { x, y }; }
      fila.push({ tipo, walkable, hasPellet, hasPower, puerta, tunel, nevera, horno });
    }
    grid.push(fila);
  }
  return {
    grid,
    total,
    warpFila,
    powerPos,
    hornoPos,
    spawnJugador: { x: spawnPos.x, y: spawnPos.y }, // (9,17) mirando izquierda
    antojoPos: { x: 9, y: 11 },
    // nevera: rect interior (cols 7-11 filas 8-10) y puerta.
    casa: { x0: 7, x1: 11, y0: 8, y1: 10, puerta: { x: 9, y: 8 } },
    // spawns dentro/sobre la nevera.
    spawns: {
      fresita: { x: 9, y: 7 },   // arranca fuera, sobre la puerta
      lactea: { x: 9, y: 9 },    // sale de una
      moka: { x: 8, y: 9 },
      kumis: { x: 10, y: 9 },
    },
  };
}

// Rehidrata migas/power sobre una grilla ya parseada (reponer nivel).
export function reponerPellets(maze) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = MAPA[y][x] || ' ';
      const cel = maze.grid[y][x];
      cel.hasPellet = c === '.';
      cel.hasPower = c === 'o';
    }
  }
}

export function tileAt(maze, x, y) {
  if (y < 0 || y >= ROWS) return null;
  const xi = ((x % COLS) + COLS) % COLS; // envolver para warp
  return maze.grid[y][xi];
}

// permitePuerta: leches saliendo/ojos cruzan la puerta y el interior de la nevera.
export function isWall(maze, x, y, permitePuerta = false) {
  const t = tileAt(maze, x, y);
  if (!t) return true;
  if (t.puerta || t.nevera) return !permitePuerta;
  return !t.walkable;
}
