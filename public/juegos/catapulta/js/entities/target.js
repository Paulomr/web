/* Factory de objetivos (latas de tomate): reventarlas todas = ganar. */
import { CAN, GROUND_Y } from '../config.js';
import { makeEnt } from './common.js';

export function makeTarget(scene, { x, y }){
  const go=scene.matter.add.image(x, GROUND_Y-y, 'can', null, {
    // rectángulo: la lata se queda de pie donde la pone el nivel en vez de
    // rodar como el objetivo redondo de antes
    shape:{ type:'rectangle', width:CAN.w, height:CAN.h },
    density:0.0014, friction:0.85, restitution:0.1, label:'can',
  });
  return makeEnt(scene, go, { kind:'can', hp:CAN.hp, threshold:CAN.threshold, sfxKey:'can' });
}
