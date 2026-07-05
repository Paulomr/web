/* HUD in-game: nivel y chispas de chocolate recogidas. */
import { on } from '../core/events.js';
import { setText } from './dom.js';

export function initHUD(){
  on('game:hud', e=>{
    const { level, name, chips, total }=e.detail;
    setText('hudLvl',`NIVEL ${level+1} · ${name}`);
    setText('hudChips','●'.repeat(chips)+'○'.repeat(Math.max(0,total-chips)));
  });
}
