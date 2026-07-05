/* Factory de TNT: acumula dano y detona (impacto fuerte o explosion cercana
   -> reaccion en cadena, gracias al retardo de mecha). */
import { TNT, GROUND_Y } from '../config.js';
import { makeEnt } from './common.js';
import { explode } from '../physics/explosion.js';

export function makeTNT(scene, { x, y }){
  const go=scene.matter.add.image(x, GROUND_Y-y, 'tnt', null, {
    density:0.0012, friction:0.8, restitution:0.05, label:'tnt',
  });
  const ent=makeEnt(scene, go, { kind:'tnt', hp:1, threshold:5, sfxKey:'wood' });
  ent.acc=0; ent.fused=false;

  ent.takeDamage=function(d){
    if(this.dead||this.fused) return;
    this.acc+=d;
    if(this.acc>=TNT.trigger) this.detonate();
    else go.setTint(0xffb0a0); // tocada pero no detonada
  };
  ent.detonate=function(){
    if(this.dead||this.fused) return;
    this.fused=true;
    go.setTint(0xffdddd);
    scene.tweens.add({ targets:go, alpha:0.35, yoyo:true, repeat:2, duration:45 });
    scene.time.delayedCall(120,()=>{ // mecha corta: permite ver la cadena
      if(this.dead) return;
      const bx=go.x, by=go.y;
      this.kill();
      explode(scene, bx, by, TNT);
      scene.tntBoom(bx, by);
    });
  };
  return ent;
}
