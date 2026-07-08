/* PANICO LACTEO — bootstrap: cablea DOM, desbloquea audio, monta el RAF loop de
   paso fijo, navegacion entre pantallas y toda la logica de juego integrada:
   crocancia, charcos, horno, racha, glaseado, antojos. */

import {
  TILE, COLS, speedFor, frightenedFor, ANTOJO_TRIGGERS, ANTOJOS, ANTOJO_DUR,
  PTS_MIGA, PTS_POWER, EXTRA_LIFE_AT, CROCANCIA_MAX, DANO_SALPICADA, DANO_CHARCO_PS,
  HORNO_CURA_PS, HORNO_QUEMA, INVULN_S, HIT_FREEZE_S, RACHA_VENTANA_S, RACHA_UMBRALES,
  BONUS_CROCANTE, CHARCO_SPEED,
} from './config.js';
import { parseMaze, reponerPellets } from './maze.js';
import { Player } from './player.js';
import { GhostManager } from './ghosts.js';
import {
  drawMazeToOffscreen, ajustarCanvas, drawFrame, ANCHO_LOGICO, ALTO_LOGICO,
} from './render.js';
import { juego, ESTADO, nuevaPartida, setEstado, estadoCrocancia } from './state.js';
import { datos, marcarTutorialVisto, registrarPartida } from './storage.js';
import {
  desbloquear, alternarMute, estaMute, sfx, pausarMusica, reanudarMusica,
  volumenMusica, glaseadoMusica,
} from './audio.js';
import { control, cablearInput, cablearDpad, DIRS } from './input.js';
import {
  actualizarJuice, emitirParticulas, popup, flash, flashVineta, shake, zoomPunch,
  confeti, limpiarJuice, reducedMotion,
} from './juice.js';
import {
  charcos, limpiarCharcos, crearCharco, actualizarCharcos, charcoEn, evaporarCharco,
} from './charcos.js';
import { horno, iniciarHorno, actualizarHorno, estadoHorno } from './horno.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const hud = $('hud');
const dpad = $('dpad');
const muteBtn = $('mute');
const pauseBtn = $('pauseBtn');
const rotate = $('rotate');

const screens = {
  start: $('start'), howto: $('howto'), pause: $('pause'),
  level: $('level'), gameover: $('gameover'),
};

const elScore = $('hud-score');
const elRecord = $('hud-record');
const elLevel = $('hud-level');
const elLives = $('hud-lives');
const elCroc = $('croc-fill');
const elCrocIcon = $('croc-icon');
const elRacha = $('hud-racha');

let maze = parseMaze();
let player = new Player(maze);
let gm = new GhostManager(maze);
let restantes = maze.total;
let antojo = { activa: false, x: 9, y: 11, color: '#f2a7c0', valor: 300, t: 0, pop: 0, idx: 0 };
let antojosGatillados = 0;
let tiempoGlobal = 0;
let glaseadoActivo = false;

const RESERVA_PX = 66; // HUD arriba; el d-pad flota, no resta al canvas

let audioListo = false;
function unlock() { if (audioListo) return; audioListo = true; desbloquear(); }
window.addEventListener('pointerdown', unlock, { once: false });
window.addEventListener('keydown', unlock, { once: false });

function pintarMute() { muteBtn.textContent = estaMute() ? '🔇' : '🔊'; }
muteBtn.addEventListener('click', () => { alternarMute(); pintarMute(); });
control.onMute = () => { alternarMute(); pintarMute(); };
pintarMute();

function mostrar(nombre) {
  for (const k in screens) screens[k].classList.add('hidden');
  if (nombre && screens[nombre]) screens[nombre].classList.remove('hidden');
}

function irMenu() {
  setEstado(ESTADO.MENU);
  hud.classList.add('hidden');
  dpad.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  glaseadoMusica(false);
  mostrar('start');
  pintarPortada();
  reanudarMusica();
}

function pintarPortada() {
  $('start-record').textContent = `RECORD ${datos.record.toLocaleString('es-CO')} · NIVEL ${datos.nivelMax}`;
}

function iniciarPartida() {
  nuevaPartida();
  maze = parseMaze();
  player = new Player(maze);
  gm = new GhostManager(maze);
  limpiarJuice();
  limpiarCharcos();
  cargarNivel(true);
}

function cargarNivel(reset) {
  if (!reset) reponerPellets(maze);
  restantes = contarComestibles();
  player.reset();
  gm.iniciarNivel(juego.level, maze.total);
  iniciarHorno(maze.hornoPos);
  limpiarCharcos();
  antojo.activa = false;
  antojosGatillados = 0;
  glaseadoActivo = false;
  glaseadoMusica(false);
  drawMazeToOffscreen(maze, { chocolate: juego.level % 2 === 0 });
  control.nextDir = null;
  hud.classList.remove('hidden');
  pauseBtn.classList.remove('hidden');
  if (matchMedia('(pointer:coarse)').matches) dpad.classList.remove('hidden');
  mostrar(null);
  actualizarHud();
  iniciarCountdown();
}

function contarComestibles() {
  let n = 0;
  for (let y = 0; y < maze.grid.length; y++)
    for (let x = 0; x < COLS; x++) {
      const c = maze.grid[y][x];
      if (c.hasPellet || c.hasPower) n++;
    }
  return n;
}

function iniciarCountdown() {
  setEstado(ESTADO.READY);
  juego.countdown = 3;
  juego.timer = 0;
  sfx.ronda();
  screens.level.classList.add('hidden');
}

// ---- HUD ----
function actualizarHud() {
  elScore.textContent = juego.score.toLocaleString('es-CO');
  elRecord.textContent = Math.max(datos.record, juego.score).toLocaleString('es-CO');
  elLevel.textContent = juego.level;
  elLives.innerHTML = '';
  for (let i = 0; i < juego.lives; i++) {
    const c = document.createElement('span');
    c.className = 'vida';
    elLives.appendChild(c);
  }
  pintarCrocancia();
  pintarRacha();
}

function pintarCrocancia() {
  const pct = Math.max(0, Math.min(100, juego.crocancia));
  elCroc.style.width = pct + '%';
  const est = estadoCrocancia();
  elCrocIcon.textContent = est === 'firme' ? '🍪' : (est === 'humeda' ? '🍪' : '😖');
  elCroc.parentElement.classList.toggle('croc-baja', pct < 20);
  elCrocIcon.classList.toggle('croc-triste', pct < 35);
}

function pintarRacha() {
  if (juego.rachaMult > 1) {
    elRacha.textContent = 'RACHA x' + juego.rachaMult;
    elRacha.classList.remove('hidden');
  } else {
    elRacha.classList.add('hidden');
  }
}

let scoreTick = 0;
function sumar(pts) {
  juego.score += pts;
  scoreTick = 1;
  if (!juego.extraDada && juego.score >= EXTRA_LIFE_AT) {
    juego.extraDada = true;
    juego.lives++;
    sfx.vidaExtra();
    flash(0.4);
  }
  actualizarHud();
}

function setCrocancia(v) {
  juego.crocancia = Math.max(0, Math.min(CROCANCIA_MAX, v));
  pintarCrocancia();
}

// ---- comer miga ----
function alComer(power, tx, ty) {
  restantes--;
  gm.comioPellet();
  if (power) {
    sumar(PTS_POWER);
    sfx.power();
    flashVineta(0.5, 'rgba(244,196,48,ALPHA)');
    zoomPunch(0.03);
    setCrocancia(CROCANCIA_MAX);
    // romper racha? No: power no rompe. Mantener.
    const dur = frightenedFor(juego.level);
    if (gm.activarFrightened(dur)) {
      player.glaseado = dur;
      glaseadoActivo = true;
      glaseadoMusica(true);
    }
  } else {
    // racha
    juego.rachaT = 0;
    juego.racha++;
    const prevMult = juego.rachaMult;
    juego.rachaMult = juego.racha >= RACHA_UMBRALES[1] ? 3 : (juego.racha >= RACHA_UMBRALES[0] ? 2 : 1);
    if (juego.rachaMult > prevMult) {
      sfx.rachaUp(juego.rachaMult);
      if (!reducedMotion) emitirParticulas(centro(tx), centro(ty), 10, ['#f4c430', '#ffd971'], { spd: 55, grav: 20, vida: 0.5, r: 1.6 });
      pintarRacha();
    }
    sumar(PTS_MIGA * juego.rachaMult);
    sfx.miga(juego.rachaMult);
    const chispas = juego.rachaMult > 1 ? 4 : 2;
    emitirParticulas(centro(tx), centro(ty), chispas, ['#f4c430', '#ffd971'], { spd: 30, grav: 80, vida: 0.35, r: juego.rachaMult > 1 ? 1.6 : 1.1, up: 20 });
  }
  gm.actualizarHervor(restantes, maze.total);
  // antojos
  if (antojosGatillados < ANTOJO_TRIGGERS.length &&
      (maze.total - restantes) >= ANTOJO_TRIGGERS[antojosGatillados]) {
    gatillarAntojo();
    antojosGatillados++;
  }
  if (restantes <= 0) ganarNivel();
}

const centro = (t) => t * TILE + TILE / 2;

function gatillarAntojo() {
  const idx = Math.min(juego.level - 1, ANTOJOS.length - 1);
  const a = ANTOJOS[idx];
  antojo.activa = true;
  antojo.x = maze.antojoPos.x; antojo.y = maze.antojoPos.y;
  antojo.color = a.color; antojo.valor = a.valor; antojo.nombre = a.nombre;
  antojo.t = 0; antojo.pop = 0; antojo.idx = idx;
}

function romperRacha() {
  juego.racha = 0;
  juego.rachaMult = 1;
  pintarRacha();
}

// ---- ganar nivel ----
function ganarNivel() {
  setEstado(ESTADO.LEVEL);
  juego.timer = 0;
  glaseadoActivo = false;
  glaseadoMusica(false);
  sfx.nivel();
  confeti(ANCHO_LOGICO / 2, ALTO_LOGICO / 2, ANCHO_LOGICO * 0.6);
  let bonus = 0;
  if (juego.crocancia > 70) { bonus = BONUS_CROCANTE; sumar(bonus); }
  $('level-title').textContent = `NIVEL ${juego.level} LISTO!`;
  $('level-bonus').textContent = bonus > 0 ? '+' + bonus.toLocaleString('es-CO') + ' CROCANTE BONUS' : '';
  $('level-bonus').classList.toggle('hidden', bonus === 0);
  screens.level.classList.remove('hidden');
}

// ---- ablandarse (perder vida) ----
function ablandarse() {
  setEstado(ESTADO.DYING);
  juego.timer = 0;
  player.dead = true;
  player.deathT = 0;
  glaseadoActivo = false;
  glaseadoMusica(false);
  sfx.muerte();
  shake(5);
  volumenMusica(0.15);
  emitirParticulas(player.x, player.y, 12, ['#e8a84c', '#c98634', '#6b4226'], { spd: 60, grav: 140, vida: 0.9, r: 2 });
}

// ---- salpicada (leche te moja) ----
function salpicada(gh) {
  if (player.invuln > 0 || player.glaseado > 0) return;
  // direccion opuesta a la leche
  const dx = player.x - gh.x, dy = player.y - gh.y;
  let dirOp;
  if (Math.abs(dx) > Math.abs(dy)) dirOp = dx > 0 ? 'der' : 'izq';
  else dirOp = dy > 0 ? 'abajo' : 'arriba';
  player.golpear(dirOp, INVULN_S);
  setCrocancia(juego.crocancia - DANO_SALPICADA);
  romperRacha();
  // charco en la casilla del impacto
  const t = player.tile();
  const colorCharco = colorLeche(gh);
  crearCharco(((t.x % COLS) + COLS) % COLS, t.y, colorCharco);
  juego.freeze = HIT_FREEZE_S;
  sfx.salpicada();
  flashVineta(0.55, gh.nombre === 'fresita' ? 'rgba(229,103,155,ALPHA)' : 'rgba(232,236,244,ALPHA)');
  shake(4);
  emitirParticulas(player.x, player.y, 8, [colorCharco, '#ffffff'], { spd: 70, grav: 120, vida: 0.55, r: 2, up: 10 });
  popup(player.x, player.y - TILE * 0.4, '-' + DANO_SALPICADA, '#e5679b', 15);
  if (juego.crocancia <= 0) ablandarse();
}

function colorLeche(gh) {
  switch (gh.nombre) {
    case 'fresita': return '#e5679b';
    case 'lactea': return '#e8ecf4';
    case 'moka': return '#6b4226';
    case 'kumis': return '#f6ecd9';
  }
  return '#e8ecf4';
}

// ---- pausa ----
function alternarPausa() {
  if (juego.estado === ESTADO.PLAY || juego.estado === ESTADO.READY) {
    setEstado(ESTADO.PAUSE);
    mostrar('pause');
    pausarMusica();
  } else if (juego.estado === ESTADO.PAUSE) {
    reanudar();
  }
}
function reanudar() {
  mostrar(null);
  setEstado(juego.countdown > 0 ? ESTADO.READY : ESTADO.PLAY);
  reanudarMusica();
  if (glaseadoActivo) glaseadoMusica(true);
}
control.onPausa = () => {
  if ([ESTADO.PLAY, ESTADO.READY, ESTADO.PAUSE].includes(juego.estado)) alternarPausa();
};
pauseBtn.addEventListener('click', alternarPausa);

// auto-pausa al perder foco
document.addEventListener('visibilitychange', () => {
  if (document.hidden && juego.estado === ESTADO.PLAY) alternarPausa();
});

// ---- game over ----
function gameOver() {
  setEstado(ESTADO.GAMEOVER);
  hud.classList.add('hidden');
  dpad.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  volumenMusica(0.35);
  const esRecord = registrarPartida(juego.score, juego.level);
  // Ranking global de Crunchy Munch (silencioso si el backend está apagado).
  if (window.CrunchyScores) window.CrunchyScores.submit('pacman', juego.score);
  $('go-score').textContent = juego.score.toLocaleString('es-CO');
  $('go-record').textContent = datos.record.toLocaleString('es-CO');
  $('go-level').textContent = juego.level;
  $('go-leches').textContent = juego.lechesMordidas;
  const nr = $('go-newrecord');
  const bernie = $('go-bernie');
  if (esRecord) {
    nr.classList.remove('hidden');
    bernie.src = 'assets/bernie/bernie-celebrando.png';
    confeti(ANCHO_LOGICO / 2, ALTO_LOGICO / 3, ANCHO_LOGICO * 0.7);
  } else {
    nr.classList.add('hidden');
    bernie.src = 'assets/bernie/bernie-sorpresa.png';
  }
  mostrar('gameover');
}

// ---- colisiones jugador <-> leches ----
function chequearColisiones() {
  const pt = player.tile();
  for (const gh of gm.lista) {
    if (gh.estado === 'ojos' || gh.estado === 'casa' || gh.estado === 'rellenando') continue;
    const gt = gh.tile();
    const dpix = Math.hypot(gh.x - player.x, gh.y - player.y);
    const mismoTile = gt.x === pt.x && gt.y === pt.y;
    if (mismoTile || dpix < TILE * 0.6) {
      if (gh.frightened) {
        const pts = gm.morderLeche(gh);
        sumar(pts);
        juego.lechesMordidas++;
        sfx.morder(Math.min(gm.chain - 1, 3));
        popup(gh.x, gh.y, String(pts), '#f4c430', 16);
        emitirParticulas(gh.x, gh.y, 14, [colorLeche(gh), '#ffffff'], { spd: 85, grav: 100, vida: 0.6, r: 2.2 });
        juego.freeze = 0.25;
        zoomPunch(0.02);
      } else {
        salpicada(gh);
      }
      return;
    }
  }
}

// ---- velocidad por leche ----
function velLeche(gh) {
  const s = speedFor(juego.level);
  if (gh.estado === 'ojos' || gh.estado === 'rellenando') return s.eyes;
  if (gh.frightened) return s.fright;
  const t = gh.tile();
  const cel = maze.grid[t.y]?.[((t.x % COLS) + COLS) % COLS];
  if (cel && cel.tunel) return s.tunnel;
  if (gh.nombre === 'fresita' && gh.hervor) return s.leche * 1.12;
  return s.leche;
}

// ---- charcos y horno del jugador ----
function actualizarEntorno(dt) {
  const t = player.tile();
  const tx = ((t.x % COLS) + COLS) % COLS;

  // charco bajo el jugador
  const ch = charcoEn(tx, t.y);
  if (ch) {
    if (player.glaseado > 0) {
      // glaseado seca el charco
      const seco = evaporarCharco(tx, t.y);
      if (seco) {
        sumar(20);
        popup(centro(tx), centro(t.y), '+20', '#f2a7c0', 12);
        emitirParticulas(centro(tx), centro(t.y), 6, ['#f2a7c0', '#ffffff'], { spd: 40, grav: -30, vida: 0.5, r: 1.4 });
        sfx.charco();
      }
      player.enCharco = false;
    } else {
      player.enCharco = true;
      setCrocancia(juego.crocancia - DANO_CHARCO_PS * dt);
      if (Math.random() < dt * 3) sfx.charco();
      if (juego.crocancia <= 0) { ablandarse(); return; }
    }
  } else {
    player.enCharco = false;
  }

  // horno
  const encima = tx === horno.x && t.y === horno.y;
  player.enHorno = encima && estadoHorno() !== 'cooldown';
  const ev = actualizarHorno(dt, encima);
  if (ev === 'curando') {
    setCrocancia(juego.crocancia + HORNO_CURA_PS * dt);
    if (!reducedMotion && Math.random() < dt * 8) {
      emitirParticulas(centro(horno.x) + (Math.random() - 0.5) * TILE * 0.5, centro(horno.y), 1, ['#ffd971', '#ff9a3d'], { spd: 20, grav: -60, vida: 0.5, r: 1.2 });
    }
    if (Math.random() < dt * 4) sfx.horno();
  } else if (ev === 'quemadura') {
    setCrocancia(juego.crocancia - HORNO_QUEMA);
    // expulsion 1 casilla en la direccion opuesta a donde entro (usar dir actual invertida)
    const op = { der: 'izq', izq: 'der', arriba: 'abajo', abajo: 'arriba' }[player.dir] || 'abajo';
    player.golpear(op, 0.6);
    sfx.quemadura();
    flashVineta(0.6, 'rgba(255,90,61,ALPHA)');
    shake(5);
    emitirParticulas(player.x, player.y, 10, ['#ff9a3d', '#ff5a3d', '#ffd971'], { spd: 80, grav: 60, vida: 0.6, r: 2 });
    popup(player.x, player.y - TILE * 0.4, 'QUEMADA', '#ff5a3d', 12);
    if (juego.crocancia <= 0) ablandarse();
  }
}

// ---- eventos de leches (charcos/estornudos) ----
function procesarEventoLeche(ev, gh) {
  if (!ev) return;
  if (ev.tipo === 'charco') {
    crearCharco(((ev.x % COLS) + COLS) % COLS, ev.y, colorLeche(gh));
  } else if (ev.tipo === 'estornudo') {
    sfx.estornudo();
    popup(gh.x, gh.y - TILE * 0.6, 'ACHUS!', '#f4c430', 13);
    if (!reducedMotion) emitirParticulas(gh.x, gh.y, 8, ['#f6ecd9', '#ffffff'], { spd: 70, grav: 30, vida: 0.5, r: 1.6 });
    for (const tl of ev.tiles) crearCharco(((tl.x % COLS) + COLS) % COLS, tl.y, colorLeche(gh));
  }
}

// ---- simulacion paso fijo ----
function simular(dt) {
  tiempoGlobal += dt;
  actualizarJuice(dt);
  actualizarCharcos(dt);
  if (scoreTick > 0) scoreTick = Math.max(0, scoreTick - dt * 4);

  switch (juego.estado) {
    case ESTADO.READY: {
      juego.timer += dt;
      const nuevo = 3 - Math.floor(juego.timer);
      if (nuevo !== juego.countdown && nuevo >= 0) {
        juego.countdown = nuevo;
        if (nuevo > 0) sfx.tick();
      }
      // las leches se rellenan visualmente durante el countdown (ya en casa)
      if (juego.timer >= 3) {
        juego.countdown = -1;
        sfx.go();
        setEstado(ESTADO.PLAY);
        volumenMusica(0.35);
      }
      break;
    }
    case ESTADO.PLAY: {
      if (juego.freeze > 0) {
        juego.freeze -= dt;
        for (const gh of gm.lista) {
          if (gh.estado === 'ojos') gh.update(dt, velLeche(gh), player, gm.fresita, null, juego.level);
        }
        break;
      }
      if (control.nextDir) { player.nextDir = control.nextDir; control.nextDir = null; }
      let sp = speedFor(juego.level).player;
      // frenado por estado
      if (player.enCharco && player.glaseado <= 0) sp *= CHARCO_SPEED;
      if (estadoCrocancia() === 'empapada' && player.glaseado <= 0) sp *= 0.92;
      player.update(dt, sp, alComer);

      // glaseado terminando -> restaurar musica
      if (glaseadoActivo && player.glaseado <= 0) {
        glaseadoActivo = false;
        glaseadoMusica(false);
      }

      gm.actualizarSalidas(dt);
      gm.actualizarFases(dt);
      gm.actualizarFrightened(dt);
      // sincronizar glaseado del jugador con frightened restante
      if (player.glaseado > 0 && gm.frightT > 0) player.glaseado = gm.frightT;
      for (const gh of gm.lista) {
        const ev = gh.update(dt, velLeche(gh), player, gm.fresita, null, juego.level);
        procesarEventoLeche(ev, gh);
      }

      actualizarEntorno(dt);
      if (juego.estado !== ESTADO.PLAY) break; // ablandarse pudo cambiar estado

      // racha timer
      juego.rachaT += dt;
      if (juego.rachaT > RACHA_VENTANA_S && juego.rachaMult > 1) {
        romperRacha();
      } else if (juego.rachaT > RACHA_VENTANA_S) {
        juego.racha = 0;
      }

      // antojo
      if (antojo.activa) {
        antojo.t += dt;
        antojo.pop = Math.min(1, antojo.pop + dt * 4);
        const dpix = Math.hypot(centro(antojo.x) - player.x, centro(antojo.y) - player.y);
        if (dpix < TILE * 0.8) {
          antojo.activa = false;
          sumar(antojo.valor);
          sfx.antojo();
          popup(centro(antojo.x), centro(antojo.y), String(antojo.valor), '#e5679b', 15);
          emitirParticulas(centro(antojo.x), centro(antojo.y), 10, ['#f2a7c0', '#e5679b', '#ffd971'], { spd: 70, grav: 120, vida: 0.6, r: 2 });
        } else if (antojo.t >= ANTOJO_DUR) {
          antojo.activa = false;
        }
      }

      chequearColisiones();
      break;
    }
    case ESTADO.DYING: {
      juego.timer += dt;
      player.deathT = Math.min(1.2, player.deathT + dt);
      if (juego.timer >= 1.4) {
        juego.lives--;
        setCrocancia(CROCANCIA_MAX);
        romperRacha();
        actualizarHud();
        if (juego.lives <= 0) {
          gameOver();
        } else {
          player.reset();
          gm.respawn();
          limpiarCharcos();
          iniciarHorno(maze.hornoPos);
          control.nextDir = null;
          volumenMusica(0.35);
          iniciarCountdown();
        }
      }
      break;
    }
    case ESTADO.LEVEL: {
      juego.timer += dt;
      if (juego.timer >= 2.5) {
        juego.level++;
        cargarNivel(false);
      }
      break;
    }
    default: break;
  }
}

// ---- RAF loop ----
const STEP = 1 / 60;
let ultimo = performance.now();
let acum = 0;

function loop(ahora) {
  requestAnimationFrame(loop);
  let dt = (ahora - ultimo) / 1000;
  ultimo = ahora;
  if (dt > 0.25) dt = 0.25;

  const corriendo = [ESTADO.READY, ESTADO.PLAY, ESTADO.DYING, ESTADO.LEVEL].includes(juego.estado);
  if (corriendo) {
    acum += dt;
    let guard = 0;
    while (acum >= STEP && guard < 6) { simular(STEP); acum -= STEP; guard++; }
    if (guard >= 6) acum = 0;
  } else {
    actualizarJuice(dt);
    acum = 0;
  }

  if (juego.estado !== ESTADO.MENU) {
    drawFrame(canvas, maze, player, gm.lista, antojo, tiempoGlobal);
    dibujarOverlayCanvas();
  }
}

function dibujarOverlayCanvas() {
  const rd = $('ready');
  if (juego.estado === ESTADO.READY && juego.countdown >= 0) {
    rd.classList.remove('hidden');
    $('ready-num').textContent = juego.countdown === 0 ? 'CRUNCH!' : String(juego.countdown);
  } else {
    rd.classList.add('hidden');
  }
}

// ---- resize / rotate ----
function onResize() {
  ajustarCanvas(canvas, RESERVA_PX);
  chequearRotate();
}
function chequearRotate() {
  const coarse = matchMedia('(pointer:coarse)').matches;
  const landscape = window.innerWidth > window.innerHeight;
  const bajo = window.innerHeight < 480;
  if (coarse && landscape && bajo) rotate.classList.add('visible');
  else rotate.classList.remove('visible');
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// ---- botones ----
$('btn-jugar').addEventListener('click', () => { unlock(); iniciarPartida(); });
$('btn-howto').addEventListener('click', () => { mostrar('howto'); irCard(0); });
$('btn-howto-cerrar').addEventListener('click', () => {
  marcarTutorialVisto();
  mostrar(juego.estado === ESTADO.MENU || juego.estado === ESTADO.READY && juego.countdown === 3 ? 'start' : (juego.estado === ESTADO.PAUSE ? 'pause' : null));
  if (juego.estado === ESTADO.MENU) mostrar('start');
});
$('btn-reanudar').addEventListener('click', reanudar);
$('btn-reiniciar').addEventListener('click', () => { mostrar(null); iniciarPartida(); });
$('btn-menu').addEventListener('click', irMenu);
$('btn-howto-pausa') && $('btn-howto-pausa').addEventListener('click', () => { mostrar('howto'); irCard(0); });
$('btn-otra').addEventListener('click', () => { unlock(); iniciarPartida(); });
$('btn-portada').addEventListener('click', irMenu);

// d-pad toggle (en pausa)
const dpadToggle = $('dpad-toggle');
if (dpadToggle) {
  dpadToggle.addEventListener('change', () => {
    if (dpadToggle.checked) dpad.classList.remove('force-hidden');
    else dpad.classList.add('force-hidden');
  });
}

// carrusel tutorial
let cardIdx = 0;
const cardsEl = $('howto-cards');
const dotsEl = $('howto-dots');
function irCard(i) {
  const cards = cardsEl ? cardsEl.children.length : 0;
  if (!cards) return;
  cardIdx = Math.max(0, Math.min(cards - 1, i));
  cardsEl.style.transform = `translateX(${-cardIdx * 100}%)`;
  if (dotsEl) [...dotsEl.children].forEach((d, k) => d.classList.toggle('on', k === cardIdx));
}
$('howto-prev') && $('howto-prev').addEventListener('click', () => irCard(cardIdx - 1));
$('howto-next') && $('howto-next').addEventListener('click', () => irCard(cardIdx + 1));

const vol = $('vol');
if (vol) {
  vol.value = 35;
  vol.addEventListener('input', () => volumenMusica(vol.value / 100));
}

control.onConfirm = () => {
  if (juego.estado === ESTADO.MENU) { unlock(); iniciarPartida(); }
  else if (juego.estado === ESTADO.GAMEOVER) { unlock(); iniciarPartida(); }
  else if (juego.estado === ESTADO.PAUSE) reanudar();
};

// ---- init ----
cablearInput(canvas);
cablearDpad(dpad);
onResize();
irMenu();

if (!datos.tutorialVisto) {
  setTimeout(() => { if (juego.estado === ESTADO.MENU) { mostrar('howto'); irCard(0); } }, 400);
}

// Hook de QA solo con ?qa=1 — expone estado interno para pruebas automatizadas.
if (typeof location !== 'undefined' && /[?&]qa=1/.test(location.search)) {
  window.__PL = {
    juego, horno,
    get player() { return player; },
    get gm() { return gm; },
    get charcos() { return charcos; },
    estado: () => juego.estado,
    setDir: (k) => { control.nextDir = k; },
    leches: () => gm.lista.map((g) => ({ n: g.nombre, x: +g.x.toFixed(1), y: +g.y.toFixed(1), estado: g.estado, modo: g.modo, fright: g.frightened, hervor: g.hervor })),
    pjTile: () => player.tile(),
    darGlaseado: () => { const d = frightenedFor(juego.level); if (gm.activarFrightened(d)) { player.glaseado = d; } },
    forzarCroc: (v) => { juego.crocancia = v; },
    ganar: () => ganarNivel(),
    nivel: () => juego.level,
  };
}

requestAnimationFrame(loop);
