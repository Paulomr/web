/* Factory de bloques Matter (madera/piedra/hielo). */
import { MATS, GROUND_Y } from '../config.js';
import { ensureBlockTexture } from '../textures/textures.js';
import { makeEnt } from './common.js';

export function makeBlock(scene, { t, x, y, w, h, a=0 }){
  const key=ensureBlockTexture(scene,t,w,h), m=MATS[t];
  const go=scene.matter.add.image(x, GROUND_Y-y, key, null, {
    density:m.density, friction:0.8, frictionStatic:1, restitution:0.05,
    angle:Phaser.Math.DegToRad(a), label:'block',
  });
  const ent=makeEnt(scene, go, { kind:'block', hp:m.hp, threshold:m.threshold, sfxKey:t });
  ent.color=m.color;
  return ent;
}
