/* =====================================================================
   Burbuja: espera quieta; si la galleta la toca, la envuelve y la hace
   flotar hacia arriba (con deriva opcional). Tap cerca de la galleta la
   revienta. Tap directo sobre una burbuja vacia tambien la revienta
   (cuidado: puedes quedarte sin ella).
   ===================================================================== */
import { BUBBLE, REDUCED } from '../config.js';

export class Bubble{
  constructor(scene,{x,y,drift=0}){
    this.scene=scene; this.drift=drift;
    this.state='idle';                 // idle | holding | popped
    this.go=scene.add.image(x,y,'bubble').setDepth(12);
    if(!REDUCED){
      this.sway=scene.tweens.add({ targets:this.go, y:y-8, duration:1600,
        yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    }
  }

  // atrapa la galleta si pasa cerca
  tryCatch(cookie){
    if(this.state!=='idle' || !cookie.body) return false;
    const d=Phaser.Math.Distance.Between(cookie.x,cookie.y,this.go.x,this.go.y);
    if(d>BUBBLE.catchR+((cookie.width/2)|0)) return false;
    this.state='holding';
    if(this.sway) this.sway.stop();
    cookie.bubbled=true;
    return true;
  }

  // fisica del flote: sube suave hasta velocidad terminal, deriva lateral
  update(cookie){
    if(this.state!=='holding' || !cookie.body) return;
    this.go.x=cookie.x; this.go.y=cookie.y;
    const v=cookie.body.velocity;
    const vy=Math.max(v.y-BUBBLE.lift, -BUBBLE.maxUp);
    const vx=(v.x+(this.drift-v.x)*0.03)*BUBBLE.damp;
    cookie.setVelocity(vx,vy);
  }

  // tap: revienta si lleva la galleta (radio generoso) o si esta vacia (directo)
  tryPop(px,py,cookie){
    if(this.state==='popped') return false;
    if(this.state==='holding'){
      const d=Phaser.Math.Distance.Between(px,py,cookie.x,cookie.y);
      if(d>BUBBLE.popR) return false;
      cookie.bubbled=false;
      cookie.setVelocity(cookie.body.velocity.x*0.7, Math.max(cookie.body.velocity.y,0)*0.4);
    }else{
      const d=Phaser.Math.Distance.Between(px,py,this.go.x,this.go.y);
      if(d>BUBBLE.r+12) return false;
      if(this.sway) this.sway.stop();
    }
    const at={ x:this.go.x, y:this.go.y };
    this.state='popped';
    this.go.setVisible(false);
    return at;
  }
}
