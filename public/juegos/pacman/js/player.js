/* La galleta jugable: posicion en px logicos, dir/nextDir, cornering fiel,
   come migas, boca animada, warp. Estados de crocancia, knockback,
   invulnerabilidad y glaseado. */

import { TILE, COLS } from './config.js';
import { isWall } from './maze.js';
import { DIRS } from './input.js';

const centro = (t) => t * TILE + TILE / 2;

export class Player {
  constructor(maze) {
    this.maze = maze;
    this.reset();
  }

  reset() {
    const s = this.maze.spawnJugador;
    this.x = centro(s.x);
    this.y = centro(s.y);
    this.dir = 'izq';
    this.nextDir = null;
    this.mouth = 0;
    this.moving = false;
    this.dead = false;
    this.deathT = 0;
    // efectos
    this.invuln = 0;      // segundos de invulnerabilidad parpadeante
    this.glaseado = 0;    // segundos de glaseado de oro (invencible)
    this.kb = 0;          // knockback restante (px)
    this.kbDir = { x: 0, y: 0 };
    this.turnSquash = 0;  // squash & stretch en giros
    this.enCharco = false;
    this.enHorno = false;
    // estela del glaseado (ultimas posiciones)
    this.estela = [];
  }

  tile() {
    return { x: Math.floor(this.x / TILE), y: Math.floor(this.y / TILE) };
  }

  puede(tx, ty, dir) {
    const d = DIRS[dir];
    return !isWall(this.maze, tx + d.x, ty + d.y, false);
  }

  // Empuja la galleta 1 casilla en dir (si hay muro, se queda). Aplica invuln.
  golpear(dirOpuesta, invulnSecs) {
    this.invuln = invulnSecs;
    const t = this.tile();
    const d = DIRS[dirOpuesta];
    if (d && this.puede(t.x, t.y, dirOpuesta)) {
      this.kbDir = d;
      this.kb = TILE; // 1 casilla
    } else {
      this.kb = 0;
    }
    // romper movimiento en curso alineando al centro
    this.x = centro(t.x); this.y = centro(t.y);
  }

  update(dt, speed, comer) {
    if (this.dead) return;

    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.glaseado > 0) this.glaseado = Math.max(0, this.glaseado - dt);
    if (this.turnSquash > 0) this.turnSquash = Math.max(0, this.turnSquash - dt);

    // estela del glaseado
    if (this.glaseado > 0) {
      this.estela.unshift({ x: this.x, y: this.y });
      if (this.estela.length > 5) this.estela.pop();
    } else if (this.estela.length) {
      this.estela.length = 0;
    }

    // knockback tiene prioridad: mover en su direccion sin control.
    if (this.kb > 0) {
      const paso = Math.min(this.kb, speed * dt * 2);
      const t = this.tile();
      // no atravesar muro
      if (this.puedeSeguir(t, this.kbDir)) {
        this.x += this.kbDir.x * paso;
        this.y += this.kbDir.y * paso;
        this.kb -= paso;
      } else {
        this.kb = 0;
        this.x = centro(t.x); this.y = centro(t.y);
      }
      this.moving = true;
      return; // sin comer ni girar durante el empujon
    }

    const t = this.tile();
    const cx = centro(t.x), cy = centro(t.y);
    const cerca = Math.abs(this.x - cx) < 0.01 && Math.abs(this.y - cy) < 0.01;
    const distCentro = Math.abs(this.x - cx) + Math.abs(this.y - cy);

    if (this.nextDir && this.nextDir !== this.dir) {
      if (distCentro <= TILE * 0.5 && this.puede(t.x, t.y, this.nextDir)) {
        this.x = cx; this.y = cy;
        this.dir = this.nextDir;
        this.nextDir = null;
        this.turnSquash = 0.08;
      }
    }

    const d = DIRS[this.dir];
    let mover = true;
    if (cerca && isWall(this.maze, t.x + d.x, t.y + d.y, false)) {
      mover = false;
      this.x = cx; this.y = cy;
    }

    this.moving = mover;
    if (mover) {
      let rem = speed * dt;
      const paso = TILE / 2;
      while (rem > 0) {
        const inc = Math.min(rem, paso);
        this.x += d.x * inc;
        this.y += d.y * inc;
        rem -= inc;
        const nt = this.tile();
        const ncx = centro(nt.x), ncy = centro(nt.y);
        const pasoCentro =
          (d.x > 0 && this.x >= ncx) || (d.x < 0 && this.x <= ncx) ||
          (d.y > 0 && this.y >= ncy) || (d.y < 0 && this.y <= ncy);
        if (pasoCentro) {
          if (isWall(this.maze, nt.x + d.x, nt.y + d.y, false)) {
            this.x = ncx; this.y = ncy;
            break;
          }
        }
      }
      this.mouth = (this.mouth + dt * 8) % 1;
    }

    // warp horizontal (tunel fila 9)
    if (this.x < -TILE / 2) this.x += COLS * TILE;
    else if (this.x > COLS * TILE + TILE / 2) this.x -= COLS * TILE;

    // comer miga en la casilla actual
    const nt = this.tile();
    const xi = ((nt.x % COLS) + COLS) % COLS;
    const cel = this.maze.grid[nt.y]?.[xi];
    if (cel && (cel.hasPellet || cel.hasPower)) {
      const near = Math.abs(this.x - centro(nt.x)) < TILE * 0.5 && Math.abs(this.y - centro(nt.y)) < TILE * 0.5;
      if (near) {
        const power = cel.hasPower;
        cel.hasPellet = false; cel.hasPower = false;
        comer(power, nt.x, nt.y);
      }
    }
  }

  puedeSeguir(t, d) {
    return !isWall(this.maze, t.x + d.x, t.y + d.y, false);
  }

  bocaAngulo() {
    if (!this.moving) return 0.06;
    return 0.06 + Math.abs(Math.sin(this.mouth * Math.PI * 2)) * 0.57;
  }
}
