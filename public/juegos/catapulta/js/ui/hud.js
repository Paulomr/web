/* HUD in-game: nivel y latas vivas. Los tiros restantes NO se cuentan aquí:
   se ven en el suelo, en la fila de osos esperando turno (entities/bearqueue). */
import { on } from '../core/events.js';
import { setText } from './dom.js';

export function initHUD(){
  on('game:hud', e=>{
    const { level, name, targets }=e.detail;
    setText('hudLvl',`NIVEL ${level+1} · ${name}`);
    setText('hudPigs',`LATAS ${targets}`);
  });
}
