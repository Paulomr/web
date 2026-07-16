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
    // El brazo trasero de la goma va POR DETRAS de la horquilla (depth 3.7 < 4) y
    // el delantero por delante (6): con una sola capa la goma "trasera" cruzaba
    // por encima del tronco y la honda se veia plana.
    this.bandBack=scene.add.graphics().setDepth(3.7);
    scene.add.image(SLING.x, GROUND_Y-91, 'sling').setDepth(4); // base apoyada en el suelo
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
    this.scene.syncFila(); // este oso deja la fila: ya está en la honda
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
    this.band.clear(); this.bandBack.clear();
    if(this.proj && this.state!=='empty'){
      const px=this.proj.x, py=this.proj.y, r=PROJ.r;
      // anclajes = puntas de la horquilla de la textura 'sling' (ver textures.js)
      const TX=28, TY=37;
      // brazo trasero (mas oscuro, cruza por detras del tronco)
      this.bandBack.lineStyle(10,0x2e1a0c,1).lineBetween(this.ax+TX,this.ay-TY,px,py);
      this.bandBack.lineStyle(5,0x54301a,1).lineBetween(this.ax+TX,this.ay-TY,px,py);
      // bolsa de cuero bajo el proyectil (depth banda < depth bola)
      this.band.fillStyle(0x2b170a,1).fillEllipse(px,py+3,r*2.5,r*1.5);
      this.band.fillStyle(0x7a4c28,1).fillEllipse(px,py+2,r*2.1,r*1.15);
      this.band.fillStyle(0xa9744a,0.5).fillEllipse(px-3,py,r*1.1,r*0.5); // luz del cuero
      // brazo delantero (mas claro, con luz)
      this.band.lineStyle(10,0x3a2210,1).lineBetween(this.ax-TX,this.ay-TY,px,py);
      this.band.lineStyle(5,0x8a5a33,1).lineBetween(this.ax-TX,this.ay-TY,px,py);
    }
  }
}
