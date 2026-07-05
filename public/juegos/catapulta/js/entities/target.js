/* Factory de objetivos (cerdos): destruir todos = ganar. */
import { PIG, GROUND_Y } from '../config.js';
import { makeEnt } from './common.js';

export function makeTarget(scene, { x, y }){
  const go=scene.matter.add.image(x, GROUND_Y-y, 'pig', null, {
    shape:{ type:'circle', radius:PIG.r },
    density:0.0012, friction:0.9, restitution:0.15, label:'pig',
  });
  return makeEnt(scene, go, { kind:'pig', hp:PIG.hp, threshold:PIG.threshold, sfxKey:'pig' });
}
