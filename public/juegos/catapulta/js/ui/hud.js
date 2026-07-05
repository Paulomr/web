/* HUD in-game: nivel, proyectiles restantes y cerdos vivos. */
import { on } from '../core/events.js';
import { setText } from './dom.js';

export function initHUD(){
  on('game:hud', e=>{
    const { level, name, shots, targets }=e.detail;
    setText('hudLvl',`NIVEL ${level+1} · ${name}`);
    setText('hudShots','●'.repeat(Math.max(0,shots)));
    setText('hudPigs',`CERDOS ${targets}`);
  });
}
