/* =====================================================================
   Ventilador/soplador: cada tap lanza un soplo que empuja la galleta en
   la direccion del ventilador, con caida por distancia y un sesgo hacia
   arriba para sostenerla en el aire. Area de tap generosa.
   ===================================================================== */
import { FAN } from '../config.js';

export class Fan{
  constructor(scene,{x,y,angle=0}){
    this.scene=scene; this.x=x; this.y=y;
    this.go=scene.add.image(x,y,'fan').setDepth(7);
    // 180 = soplar a la izquierda: espejo (rotar voltearia el sprite)
    if(angle===180){ this.go.setFlipX(true); }
    else this.go.setAngle(angle);
    const rad=Phaser.Math.DegToRad(angle);
    const dx=Math.cos(rad), dy=Math.sin(rad)-FAN.upBias;
    const n=Math.hypot(dx,dy);
    this.dir={ x:dx/n, y:dy/n };
  }

  // tap dentro del area -> soplo. Devuelve true si el tap era para el.
  tryPuff(px,py,cookie){
    if(Phaser.Math.Distance.Between(px,py,this.x,this.y)>FAN.tapR) return false;
    // sacudida del soplador
    this.scene.tweens.add({ targets:this.go, scale:1.14, duration:80, yoyo:true });
    if(cookie && cookie.body){
      const d=Phaser.Math.Distance.Between(cookie.x,cookie.y,this.x,this.y);
      if(d<FAN.range){
        const s=FAN.power*(0.45+0.55*(1-d/FAN.range));
        const v=cookie.body.velocity;
        let vy=v.y+this.dir.y*s;
        if(vy>4) vy*=0.55;                    // el soplo frena la caida
        cookie.setVelocity(v.x+this.dir.x*s, vy);
      }
    }
    return true;
  }
}
