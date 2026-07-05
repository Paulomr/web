// Valida el laberinto 19x21 de PANICO LACTEO: flood-fill de conectividad,
// conteo de migas/powers, callejones sin salida, intersecciones. Correr: node _mazecheck.mjs
const MAPA = [
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
const W = 19, H = 21;
let ok = true;
MAPA.forEach((r, y) => { if (r.length !== W) { console.log('ANCHO malo fila', y, '=', r.length); ok = false; } });
if (MAPA.length !== H) { console.log('ALTO malo', MAPA.length); ok = false; }

const walk = (c) => c !== '#' && c !== '-' && c !== 'N'; // transitable por jugador (no muro, no puerta, no interior nevera)
let pel = 0, pow = 0, tunel = 0, puerta = 0, horno = 0, spawn = 0;
const powerPos = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = MAPA[y][x];
  if (c === '.') pel++;
  else if (c === 'o') { pow++; powerPos.push([x, y]); }
  else if (c === 'T') tunel++;
  else if (c === '-') puerta++;
  else if (c === 'H') horno++;
  else if (c === 'P') spawn++;
}
console.log({ migas: pel, powers: pow, tunel, puerta, horno, spawn });
console.log('powers en:', powerPos.map(p => `(${p[0]},${p[1]})`).join(' '));

// Simetria especular de muros sobre columna 9 (centro)
let asim = 0;
const isW = (x, y) => MAPA[y][x] === '#';
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (isW(x, y) !== isW(W - 1 - x, y)) { asim++; if (asim <= 10) console.log('asimetria', x, y); }
}
console.log('muros asimetricos:', asim);

// Flood-fill desde spawn (9,17) con warp de tunel en fila 9
const key = (x, y) => x + ',' + y;
let sx = 9, sy = 17;
const seen = new Set([key(sx, sy)]);
const stk = [[sx, sy]];
while (stk.length) {
  const [x, y] = stk.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let nx = x + dx, ny = y + dy;
    if (ny < 0 || ny >= H) continue;
    // warp horizontal (tunel fila 9)
    if (nx < 0) nx = W - 1;
    else if (nx >= W) nx = 0;
    const c = MAPA[ny][nx];
    if (!walk(c)) continue;
    const k = key(nx, ny);
    if (!seen.has(k)) { seen.add(k); stk.push([nx, ny]); }
  }
}
let transit = 0, inan = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = MAPA[y][x];
  if (walk(c)) transit++;
  if ((c === '.' || c === 'o') && !seen.has(key(x, y))) { inan++; if (inan <= 10) console.log('inalcanzable', x, y); }
}
console.log('casillas transitables:', transit, '| alcanzadas:', seen.size);
console.log('comestibles inalcanzables:', inan);

// Callejones sin salida (1 solo vecino transitable) e intersecciones de 4 vias
let deadends = 0, inter4 = 0, inter3 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = MAPA[y][x];
  if (!walk(c) || c === 'T') continue;
  let vec = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let nx = x + dx, ny = y + dy;
    if (ny < 0 || ny >= H) continue;
    if (nx < 0) nx = W - 1; else if (nx >= W) nx = 0;
    if (walk(MAPA[ny][nx])) vec++;
  }
  if (vec === 1) { deadends++; if (deadends <= 10) console.log('callejon', x, y); }
  if (vec === 4) inter4++;
  if (vec === 3) inter3++;
}
console.log('callejones sin salida:', deadends, '| intersecciones 4-via:', inter4, '| 3-via:', inter3);
console.log('OK:', ok && inan === 0 && deadends === 0);
