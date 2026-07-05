/* Las 4 leches: clase Leche + IA por personalidad + gestor de fases
   scatter/chase/frightened/eyes, nevera con dot-counters y salida escalonada.
   Rasgos: Fresita hervor, Lactea patrulla perimetro, Moka suelta charcos,
   Kumis estornuda. */

import {
  TILE, COLS, ROWS, SCATTER_CORNERS, PERIMETRO, phasesFor, houseThresholds,
  idleReleaseSecs, fresitaHervorLevel, kumisEstornudo, MOKA_CADA, MOKA_CADA_N2,
} from './config.js';
import { isWall } from './maze.js';
import { DIRS } from './input.js';

const centro = (t) => t * TILE + TILE / 2;
const OPUESTO = { arriba: 'abajo', abajo: 'arriba', izq: 'der', der: 'izq' };
const ORDEN = ['arriba', 'izq', 'abajo', 'der']; // desempate

export class Leche {
  constructor(nombre, maze) {
    this.nombre = nombre;
    this.maze = maze;
    this.reset();
  }

  reset() {
    const s = this.maze.spawns[this.nombre];
    this.x = centro(s.x);
    this.y = centro(s.y);
    this.dir = this.nombre === 'fresita' ? 'izq' : (this.nombre === 'lactea' ? 'arriba' : 'arriba');
    this.estado = this.nombre === 'fresita' ? 'fuera' : 'casa'; // casa|saliendo|fuera|ojos|rellenando
    this.modo = 'scatter';
    this.frightened = false;
    this.frightBlink = false;
    this.bobT = Math.random() * Math.PI * 2;
    this.fase = Math.random() * Math.PI * 2; // fase de la onda liquida
    this.pendingReverse = false;
    this.hervor = false;         // Fresita
    this.rellenoT = 0;           // animacion de rellenado del vaso vacio
    this.perimIdx = 0;           // Lactea: indice de esquina del perimetro
    this.mokaCasillas = 0;       // Moka: casillas recorridas desde ultimo charco
    this.mokaUltTile = null;
    this.estornudoT = 2 + Math.random() * 3; // Kumis: cuenta para estornudar
    this.estornudando = 0;       // segundos de pausa de estornudo
  }

  tile() {
    return { x: Math.floor(this.x / TILE), y: Math.floor(this.y / TILE) };
  }

  objetivo(player, fresita) {
    if (this.estado === 'ojos' || this.estado === 'rellenando') {
      const p = this.maze.casa.puerta;
      return { x: p.x, y: p.y };
    }
    if (this.frightened) return null;
    const pt = player.tile();
    const pd = DIRS[player.dir];

    // Fresita en hervor: chase permanente (ignora scatter).
    const scatter = this.modo === 'scatter' && !(this.nombre === 'fresita' && this.hervor);
    if (scatter) {
      if (this.nombre === 'lactea') {
        // patrulla el anillo perimetral en sentido horario
        return PERIMETRO[this.perimIdx];
      }
      const c = SCATTER_CORNERS[this.nombre];
      return { x: c.x, y: c.y };
    }

    switch (this.nombre) {
      case 'fresita':
        return { x: pt.x, y: pt.y };
      case 'lactea': {
        // 4 adelante, con el bug clasico al mirar arriba.
        let tx = pt.x + pd.x * 4, ty = pt.y + pd.y * 4;
        if (player.dir === 'arriba') { tx -= 4; }
        return { x: tx, y: ty };
      }
      case 'moka': {
        // pinza: vector Fresita->(2 adelante), duplicado.
        let px = pt.x + pd.x * 2, py = pt.y + pd.y * 2;
        if (player.dir === 'arriba') px -= 2;
        const ft = fresita.tile();
        return { x: ft.x + 2 * (px - ft.x), y: ft.y + 2 * (py - ft.y) };
      }
      case 'kumis': {
        const kt = this.tile();
        const dist2 = (kt.x - pt.x) ** 2 + (kt.y - pt.y) ** 2;
        if (dist2 > 64) return { x: pt.x, y: pt.y };
        const c = SCATTER_CORNERS.kumis;
        return { x: c.x, y: c.y };
      }
    }
    return { x: pt.x, y: pt.y };
  }

  transitable(tx, ty) {
    const permitePuerta = this.estado === 'ojos' || this.estado === 'saliendo' || this.estado === 'rellenando';
    return !isWall(this.maze, tx, ty, permitePuerta);
  }

  decidir(player, fresita) {
    const t = this.tile();
    const opciones = [];
    for (const dir of ORDEN) {
      if (dir === OPUESTO[this.dir] && !this.pendingReverse) continue;
      const d = DIRS[dir];
      if (this.transitable(t.x + d.x, t.y + d.y)) opciones.push(dir);
    }
    this.pendingReverse = false;
    if (opciones.length === 0) {
      const rev = OPUESTO[this.dir];
      const d = DIRS[rev];
      if (this.transitable(t.x + d.x, t.y + d.y)) this.dir = rev;
      return;
    }
    if (opciones.length === 1) { this.dir = opciones[0]; return; }
    if (this.frightened) {
      this.dir = opciones[(Math.random() * opciones.length) | 0];
      return;
    }
    const obj = this.objetivo(player, fresita);
    // Lactea: al llegar cerca de su esquina de perimetro, avanzar a la siguiente.
    if (this.nombre === 'lactea' && this.modo === 'scatter') {
      const dd = (t.x - obj.x) ** 2 + (t.y - obj.y) ** 2;
      if (dd <= 2) this.perimIdx = (this.perimIdx + 1) % PERIMETRO.length;
    }
    let mejor = opciones[0], mejorD = Infinity;
    for (const dir of opciones) {
      const d = DIRS[dir];
      const nx = t.x + d.x, ny = t.y + d.y;
      const dist = (nx - obj.x) ** 2 + (ny - obj.y) ** 2;
      if (dist < mejorD) { mejorD = dist; mejor = dir; }
    }
    this.dir = mejor;
  }

  moverCasa(dt) {
    this.bobT += dt * 3;
    const s = this.maze.spawns[this.nombre];
    this.y = centro(s.y) + Math.sin(this.bobT) * 2;
    this.x = centro(s.x);
  }

  salir(dt, speed) {
    const puerta = this.maze.casa.puerta;
    const px = centro(puerta.x), py = centro(puerta.y);
    const dx = px - this.x, dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    const paso = speed * dt;
    if (dist <= paso + 0.5) {
      this.x = px; this.y = py;
      this.estado = 'fuera';
      this.dir = 'izq';
      this.pendingReverse = false;
    } else {
      this.x += (dx / dist) * paso;
      this.y += (dy / dist) * paso;
    }
  }

  entrarNevera(dt, speed, onEmpezarRelleno) {
    // ojos que llegaron a la puerta bajan al centro y empiezan a rellenarse.
    const s = this.maze.spawns.lactea;
    const tx = centro(s.x), ty = centro(s.y);
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const paso = speed * dt;
    if (dist <= paso + 0.5) {
      this.x = tx; this.y = ty;
      this.estado = 'rellenando';
      this.rellenoT = 0;
      this.frightened = false;
      this.frightBlink = false;
      if (onEmpezarRelleno) onEmpezarRelleno();
    } else {
      this.x += (dx / dist) * paso;
      this.y += (dy / dist) * paso;
    }
  }

  // Devuelve evento: null | {tipo:'charco'} | {tipo:'estornudo', tiles:[...]}
  update(dt, speed, player, fresita, onEmpezarRelleno, nivel) {
    let evento = null;

    if (this.estado === 'casa') { this.moverCasa(dt); this.fase += dt * 3; return null; }
    if (this.estado === 'saliendo') { this.salir(dt, speed); this.fase += dt * 4; return null; }
    if (this.estado === 'rellenando') {
      // el vaso se rellena 3 s dentro de la nevera y vuelve a salir.
      this.rellenoT += dt;
      const s = this.maze.spawns.lactea;
      this.x = centro(s.x); this.y = centro(s.y);
      this.fase += dt * 2;
      if (this.rellenoT >= 3) {
        this.estado = 'saliendo';
        this.pendingReverse = false;
      }
      return null;
    }

    const puerta = this.maze.casa.puerta;
    if (this.estado === 'ojos') {
      const py = centro(puerta.y);
      const px = centro(puerta.x);
      if (Math.abs(this.x - px) < TILE && this.y <= py + 1 && this.y >= py - TILE) {
        this.entrarNevera(dt, speed, onEmpezarRelleno);
        this.fase += dt * 6;
        return null;
      }
    }

    // Kumis estornudando: se detiene brevemente.
    if (this.nombre === 'kumis' && this.estornudando > 0) {
      this.estornudando = Math.max(0, this.estornudando - dt);
      this.fase += dt * 6;
      return null;
    }

    // Movimiento por casillas.
    let rem = speed * dt;
    const pasoMax = TILE / 2;
    while (rem > 0) {
      const inc = Math.min(rem, pasoMax);
      const t = this.tile();
      const cx = centro(t.x), cy = centro(t.y);
      const enC = Math.abs(this.x - cx) < 0.6 && Math.abs(this.y - cy) < 0.6;
      if (enC) {
        this.x = cx; this.y = cy;
        this.decidir(player, fresita);
        // rasgo Moka: soltar charco cada N casillas en chase
        if (this.nombre === 'moka' && this.estado === 'fuera' && !this.frightened && this.modo === 'chase') {
          const key = t.x + ',' + t.y;
          if (this.mokaUltTile !== key) {
            this.mokaUltTile = key;
            this.mokaCasillas++;
            const cada = nivel >= 2 ? MOKA_CADA_N2 : MOKA_CADA;
            if (this.mokaCasillas >= cada) {
              this.mokaCasillas = 0;
              if (!evento) evento = { tipo: 'charco', x: t.x, y: t.y };
            }
          }
        }
      }
      const d2 = DIRS[this.dir];
      if (this.transitable(t.x + d2.x, t.y + d2.y) === false && enC) {
        this.decidir(player, fresita);
      }
      const d3 = DIRS[this.dir];
      this.x += d3.x * inc;
      this.y += d3.y * inc;
      rem -= inc;
      if (this.x < -TILE / 2) this.x += COLS * TILE;
      else if (this.x > COLS * TILE + TILE / 2) this.x -= COLS * TILE;
    }
    this.bobT += dt * 6;
    this.fase += dt * 5;

    // rasgo Kumis: estornudo aleatorio (solo fuera, sin panico).
    if (this.nombre === 'kumis' && this.estado === 'fuera' && !this.frightened) {
      this.estornudoT -= dt;
      if (this.estornudoT <= 0) {
        const [lo, hi] = kumisEstornudo(nivel);
        this.estornudoT = lo + Math.random() * (hi - lo);
        this.estornudando = 0.4;
        const t = this.tile();
        const tiles = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (this.transitable(t.x + dx, t.y + dy)) tiles.push({ x: t.x + dx, y: t.y + dy });
        }
        evento = { tipo: 'estornudo', x: t.x, y: t.y, tiles };
      }
    }

    return evento;
  }
}

export class GhostManager {
  constructor(maze) {
    this.maze = maze;
    this.fresita = new Leche('fresita', maze);
    this.lactea = new Leche('lactea', maze);
    this.moka = new Leche('moka', maze);
    this.kumis = new Leche('kumis', maze);
    this.lista = [this.fresita, this.lactea, this.moka, this.kumis];
  }

  iniciarNivel(level, totalPellets) {
    this.level = level;
    this.total = totalPellets;
    this.fases = phasesFor(level);
    this.faseIdx = 0;
    this.faseT = 0;
    this.modo = this.fases[0].modo;
    this.frightT = 0;
    this.frightDur = 0;
    this.chain = 0;
    this.dotCounter = 0;
    this.idleT = 0;
    this.umbrales = houseThresholds(level);
    this.lista.forEach((g) => { g.reset(); g.modo = this.modo; });
    this.lactea.estado = 'casa';
    this.moka.estado = 'casa';
    this.kumis.estado = 'casa';
    this._salidas = { lactea: false, moka: false, kumis: false };
    this._lacteaT = 0;
  }

  respawn() {
    this.lista.forEach((g) => {
      const s = this.maze.spawns[g.nombre];
      g.x = centro(s.x); g.y = centro(s.y);
      g.frightened = false; g.frightBlink = false;
      g.estado = g.nombre === 'fresita' ? 'fuera' : 'casa';
      g.modo = this.modo;
      g.dir = g.nombre === 'fresita' ? 'izq' : 'arriba';
      g.pendingReverse = false;
      g.hervor = false;
      g.estornudando = 0;
    });
    this.lactea.estado = 'casa';
    this.moka.estado = 'casa';
    this.kumis.estado = 'casa';
    this._salidas = { lactea: false, moka: false, kumis: false };
    this._lacteaT = 0;
    this.frightT = 0; this.frightDur = 0; this.chain = 0;
    this.idleT = 0;
  }

  hayFrightened() {
    return this.lista.some((g) => g.frightened && g.estado !== 'ojos' && g.estado !== 'rellenando');
  }

  comioPellet() {
    this.dotCounter++;
    this.idleT = 0;
  }

  actualizarSalidas(dt) {
    this.idleT += dt;
    this._lacteaT += dt;
    if (!this._salidas.lactea && this.lactea.estado === 'casa' && this._lacteaT > 0.5) {
      this.lactea.estado = 'saliendo'; this._salidas.lactea = true;
    }
    if (!this._salidas.moka && this.moka.estado === 'casa' &&
        (this.dotCounter >= this.umbrales.moka || this._lacteaT >= 8)) {
      this.moka.estado = 'saliendo'; this._salidas.moka = true;
    }
    if (!this._salidas.kumis && this.kumis.estado === 'casa' && this.dotCounter >= this.umbrales.kumis) {
      this.kumis.estado = 'saliendo'; this._salidas.kumis = true;
    }
    const limite = idleReleaseSecs(this.level);
    if (this.idleT >= limite) {
      for (const n of ['lactea', 'moka', 'kumis']) {
        if (this[n].estado === 'casa') { this[n].estado = 'saliendo'; this._salidas[n] = true; break; }
      }
      this.idleT = 0;
    }
  }

  actualizarFases(dt) {
    if (this.hayFrightened()) return;
    const fase = this.fases[this.faseIdx];
    if (!fase || fase.dur === Infinity) return;
    this.faseT += dt;
    if (this.faseT >= fase.dur) {
      this.faseT = 0;
      this.faseIdx = Math.min(this.faseIdx + 1, this.fases.length - 1);
      const nuevo = this.fases[this.faseIdx].modo;
      this.modo = nuevo;
      this.lista.forEach((g) => {
        g.modo = nuevo;
        if (g.estado === 'fuera' && !g.frightened) g.pendingReverse = true;
      });
    }
  }

  // marca hervor de Fresita segun migas restantes (o permanente desde n5).
  actualizarHervor(restantes, total) {
    const frac = total > 0 ? restantes / total : 1;
    this.fresita.hervor = this.level >= fresitaHervorLevel() || frac < 0.30;
  }

  activarFrightened(dur) {
    if (dur <= 0) { this.chain = 0; return false; }
    this.frightDur = dur;
    this.frightT = dur;
    this.chain = 0;
    this.lista.forEach((g) => {
      if (g.estado === 'fuera' || g.estado === 'saliendo') {
        g.frightened = true;
        g.frightBlink = false;
        g.pendingReverse = true;
      }
    });
    return true;
  }

  actualizarFrightened(dt) {
    if (this.frightT > 0) {
      this.frightT -= dt;
      const blink = this.frightT <= Math.min(2, this.frightDur * 0.4);
      this.lista.forEach((g) => {
        if (g.frightened && g.estado !== 'ojos') {
          g.frightBlink = blink && (Math.floor(this.frightT * 8) % 2 === 0);
        }
      });
      if (this.frightT <= 0) {
        this.frightT = 0;
        this.lista.forEach((g) => {
          if (g.frightened && g.estado !== 'ojos') {
            g.frightened = false; g.frightBlink = false;
            g.pendingReverse = false;
          }
        });
        this.chain = 0;
      }
    }
  }

  morderLeche(g) {
    const pts = [200, 400, 800, 1600][Math.min(this.chain, 3)];
    this.chain++;
    g.frightened = false;
    g.frightBlink = false;
    g.estado = 'ojos';
    return pts;
  }
}
