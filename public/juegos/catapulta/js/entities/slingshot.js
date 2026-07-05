/* =====================================================================
   Honda: carga proyectil, arrastre con clamp, banda elastica visual y
   prediccion de trayectoria (simulacion balistica por steps de Matter).
   ===================================================================== */
import { SLING, GROUND_Y, PROJ, G_STEP } from '../config.js';
import { SFX } from '../audio/sfx.js';

export class Slingshot{
  constructor(scene){
    this.scene=scene;
    this.ax=SLING.x; this.ay=SLING.anchorY;
    scene.add.image(SLING.x, GROUND_Y-85, 'sling').setDepth(4); // base apoyada en el suelo
    this.band=scene.add.graphics().setDepth(6);
    this.dots=scene.add.graphics().setDepth(3);
    this.proj=null; this.state='empty';
  }

  loadNext(){
    if(this.scene.shotsLeft<=0 || this.proj) return;
    const go=this.scene.matter.add.image(this.ax, this.ay, 'ball', null, {
      shape:{ type:'circle', radius:PROJ.r },
      density:PROJ.density, friction:0.6, frictionAir:0, // sin drag: la prediccion es exacta
      restitution:0.35, label:'proj',
    });
    go.setStatic(true).setDepth(7);
    this.proj=go; this.state='loaded';
    SFX.click();
  }

  canGrab(wx,wy){
    // radio extra en tactil: el dedo es menos preciso que el mouse
    const r=this.scene.sys.game.device.input.touch?100:70;
    return this.state==='loaded' &&
      Phaser.Math.Distance.Between(wx,wy,this.proj.x,this.proj.y)<r;
  }
  grab(){ if(this.state==='loaded') this.state='aiming'; }

  aim(wx,wy){
    if(this.state!=='aiming') return;
    let dx=wx-this.ax, dy=wy-this.ay;
    const d=Math.hypot(dx,dy);
    if(d>SLING.maxDrag){ dx*=SLING.maxDrag/d; dy*=SLING.maxDrag/d; }
    this.proj.setPosition(this.ax+dx, this.ay+dy);
    SFX.stretch(Math.min(1,d/SLING.maxDrag));
    this.drawDots(-dx*SLING.k, -dy*SLING.k);
  }

  release(){
    if(this.state!=='aiming') return;
    const dx=this.proj.x-this.ax, dy=this.proj.y-this.ay;
    this.dots.clear();
    if(Math.hypot(dx,dy)<SLING.minDrag){ // arrastre minimo: cancelar sin gastar tiro
      this.proj.setPosition(this.ax,this.ay); this.state='loaded'; return;
    }
    const go=this.proj;
    this.proj=null; this.state='empty';
    go.setStatic(false);
    Phaser.Physics.Matter.Matter.Sleeping.set(go.body,false); // venia dormido de estatico
    go.setVelocity(-dx*SLING.k, -dy*SLING.k);
    this.scene.onLaunched(go);
  }

  // trayectoria predicha: mismo integrador que Matter (v.y+=G_STEP; p+=v)
  drawDots(vx,vy){
    this.dots.clear();
    let x=this.proj.x, y=this.proj.y;
    for(let i=1;i<=56;i++){
      vy+=G_STEP; x+=vx; y+=vy;
      if(i%4===0) this.dots.fillStyle(0xffffff,(1-i/64)*0.85).fillCircle(x,y,Math.max(1.6,4-i*0.03));
      if(y>GROUND_Y+8) break;
    }
  }

  update(){ // banda elastica con volumen (doble pasada) + bolsa de cuero
    this.band.clear();
    if(this.proj && this.state!=='empty'){
      const px=this.proj.x, py=this.proj.y, r=PROJ.r;
      // brazo trasero (mas oscuro, queda "detras"); anclado a las puntas de la horquilla
      this.band.lineStyle(10,0x2e1a0c,1).lineBetween(this.ax+24,this.ay-33,px,py);
      this.band.lineStyle(5,0x54301a,1).lineBetween(this.ax+24,this.ay-33,px,py);
      // bolsa de cuero bajo el proyectil (depth banda < depth bola)
      this.band.fillStyle(0x4a2c14,1).fillEllipse(px,py+3,r*2.5,r*1.5);
      this.band.fillStyle(0x7a4c28,1).fillEllipse(px,py+2,r*2.1,r*1.15);
      // brazo delantero (mas claro, con luz)
      this.band.lineStyle(10,0x3a2210,1).lineBetween(this.ax-24,this.ay-33,px,py);
      this.band.lineStyle(5,0x8a5a33,1).lineBetween(this.ax-24,this.ay-33,px,py);
    }
  }
}
