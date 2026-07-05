/* =====================================================================
   Escena principal. level:null = telon de fondo para los menus DOM.
   Nunca toca el DOM: emite por core/events.js (game:hud/win/lose).
   ===================================================================== */
import { W, H, WORLD_W, GROUND_Y, TNT, DMG_SCALE, IMPACT_SHOCK } from '../config.js';
import { shockwave } from '../physics/explosion.js';
import { LEVELS } from '../data/levels.js';
import { emit } from '../core/events.js';
import { SFX } from '../audio/sfx.js';
import { makeBlock } from '../entities/block.js';
import { makeTarget } from '../entities/target.js';
import { makeTNT } from '../entities/tnt.js';
import { Slingshot } from '../entities/slingshot.js';
import { setupSlingInput } from '../core/input.js';
import { GameCam } from '../core/camera.js';

export class GameScene extends Phaser.Scene{
  constructor(){ super('Game'); }

  init(d){ this.levelIdx=(d && Number.isInteger(d.level)) ? d.level : null; }

  create(){
    this.cameras.main.setBounds(0,0,WORLD_W,H);
    this.buildScenery();
    this.toKill=[]; this.blocks=[]; this.targets=[]; this.tnts=[];
    this.emitters={}; this.over=false; this.proj=null; this.projState='idle';
    this.lastHitSfx=0; this.shockT=0; this.hitStopUntil=0; this.trailT=0;
    // defensivo: si se reinicio en pleno hit-stop, que no quede el slow-mo pegado
    this.matter.world.engine.timing.timeScale=1;

    if(this.levelIdx===null){ this.cameras.main.centerOn(W/2,H/2); return; }

    const L=LEVELS[this.levelIdx];
    this.shotsLeft=L.shots;
    this.cam=new GameCam(this);

    // estaticos: suelo + muros laterales
    const st={ isStatic:true, friction:0.9 };
    this.matter.add.rectangle(WORLD_W/2,GROUND_Y+40,WORLD_W,80,st);
    this.matter.add.rectangle(-30,H/2,60,H*3,st);
    this.matter.add.rectangle(WORLD_W+30,H/2,60,H*3,st);

    L.blocks.forEach(b=>this.blocks.push(makeBlock(this,b)));
    (L.tnt||[]).forEach(t=>this.tnts.push(makeTNT(this,t)));
    L.targets.forEach(t=>this.targets.push(makeTarget(this,t)));

    this.sling=new Slingshot(this);
    setupSlingInput(this,this.sling);
    this.matter.world.on('collisionstart',this.onCollisions,this);
    this.hud();

    // intro: ensenar la estructura y volver; luego cargar el primer proyectil
    const fx=Phaser.Math.Clamp(
      L.targets.reduce((s,t)=>s+t.x,0)/L.targets.length, W/2, WORLD_W-W/2);
    this.cam.intro(fx);
    this.time.delayedCall(2500,()=>this.sling.loadNext());
  }

  buildScenery(){
    this.add.image(WORLD_W/2,210,'sky').setDisplaySize(WORLD_W,1030).setDepth(-2);
    // sol blanco amplio: parallax lento, respiracion sutil de escala
    const sun=this.add.image(860,155,'sun').setScrollFactor(0.15).setDepth(-1.9).setScale(1.25);
    this.tweens.add({ targets:sun, scale:1.32, duration:2600, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    [200,700,1250,1750,2250].forEach((x,i)=>
      this.add.image(x,120+(i%3)*60,'cloud').setScrollFactor(0.35).setDepth(-1).setAlpha(0.9));
    [150,600,1100,1600,2100,2500].forEach((x,i)=>
      this.add.image(x,GROUND_Y-10+(i%2)*14, i%2?'hillMint':'hill')
        .setScrollFactor(0.6).setDepth(0).setAlpha(0.85));
    this.add.tileSprite(WORLD_W/2,GROUND_Y+80,WORLD_W,160,'groundTex').setDepth(2);
  }

  hud(){ emit('game:hud',{ level:this.levelIdx, name:LEVELS[this.levelIdx].name,
    shots:this.shotsLeft, targets:this.targets.length }); }

  /* ---------- disparo ---------- */
  onLaunched(go){
    this.proj=go; this.projState='flying'; this.stillFrames=0; this.shotT=this.time.now;
    this.shotsLeft--; this.hud();
    this.cam.follow(go);
    SFX.launch();
  }

  endShot(){
    if(this.projState!=='flying') return;
    this.projState='done';
    this.cameras.main.stopFollow(); // antes de destruir el objetivo seguido
    const p=this.proj; this.proj=null;
    if(p && p.body) this.burst(p.x,p.y,0xcccccc,8);
    if(p) p.destroy();
    if(this.over) return;
    this.time.delayedCall(600,()=>{
      if(this.over) return;
      this.cam.backToSling();
      if(this.shotsLeft>0){
        this.time.delayedCall(650,()=>{ if(!this.over) this.sling.loadNext(); });
      }else{
        // gracia: la estructura aun puede aplastar cerdos al derrumbarse
        this.time.delayedCall(1700,()=>{
          if(!this.over && this.targets.length>0){
            this.over=true; SFX.lose(); emit('game:lose',{ level:this.levelIdx });
          }
        });
      }
    });
  }

  /* ---------- colisiones y dano ---------- */
  onCollisions(ev){
    for(const { bodyA:a, bodyB:b } of ev.pairs){
      const rel=Math.hypot(a.velocity.x-b.velocity.x, a.velocity.y-b.velocity.y);
      const dmg=Math.max(this.applyHit(a,b,rel), this.applyHit(b,a,rel));
      if((a.label==='proj'||b.label==='proj') && rel>8)
        this.cam && this.cam.shake(Math.min(0.012,rel*0.0006));
      // Onda expansiva: Matter solo empuja lo que toca; un impulso radial extra
      // en el punto de contacto propaga el golpe a los vecinos y vuelca mejor la
      // estructura. Solo en golpes que ya danan, y throttled contra cascadas.
      if(dmg>IMPACT_SHOCK.minDmg && this.time.now-this.shockT>IMPACT_SHOCK.throttle){
        this.shockT=this.time.now;
        const mx=(a.position.x+b.position.x)/2, my=(a.position.y+b.position.y)/2;
        const s=Phaser.Math.Clamp(dmg/IMPACT_SHOCK.refDmg,0.4,1.6);
        shockwave(this, mx, my, { radius:IMPACT_SHOCK.radius,
          power:IMPACT_SHOCK.power*s, upBias:IMPACT_SHOCK.upBias });
        this.burst(mx, my, 0xfff2c8, 4+((s*7)|0));           // chispa del impacto
        this.cam && this.cam.shake(Math.min(0.01,0.006*s));  // enfasis proporcional
      }
    }
  }

  // dano = energia cinetica relativa con masa reducida (estaticos ~ masa grande).
  // Devuelve el dano aplicado (0 si es un roce por debajo del umbral) para que
  // onCollisions decida si lanzar la onda expansiva.
  applyHit(self,other,rel){
    const ent=self.entRef;
    if(!ent||ent.dead) return 0;
    const mB=Math.min(other.isStatic?1000:other.mass,1000);
    const mu=(self.mass*mB)/(self.mass+mB);
    const dmg=0.5*rel*rel*mu*DMG_SCALE;
    if(dmg<=ent.threshold) return 0;
    if(this.time.now-this.lastHitSfx>70 && dmg>ent.threshold*1.5){
      this.lastHitSfx=this.time.now; SFX.hit(ent.sfxKey);
    }
    ent.takeDamage(dmg);
    return dmg;
  }

  /* ---------- muerte de entidades (llamado por makeEnt.kill) ---------- */
  killEnt(ent){
    const { go, kind }=ent;
    if(kind==='block'){ this.burst(go.x,go.y,ent.color,12); SFX.breakMat(ent.sfxKey); this.blocks=this.blocks.filter(b=>b!==ent); }
    else if(kind==='pig'){ this.burst(go.x,go.y,0x7ed957,16); SFX.pig(); this.targets=this.targets.filter(t=>t!==ent); }
    else if(kind==='tnt'){ this.tnts=this.tnts.filter(t=>t!==ent); }
    go.setVisible(false);
    this.wakeNear(go.x, go.y, 190); // el apoyo desaparece: despierta la torre para que colapse
    this.toKill.push(ent); // destruir fuera del callback de colision
    if(kind==='pig') this.checkWin();
  }

  // Matter no sabe que un cuerpo en reposo perdio su apoyo al destruir un vecino:
  // lo despertamos manualmente para que la gravedad lo haga caer.
  wakeNear(x, y, r){
    const M=Phaser.Physics.Matter.Matter, r2=r*r;
    for(const b of this.matter.world.getAllBodies()){
      if(b.isStatic || !b.isSleeping) continue;
      const dx=b.position.x-x, dy=b.position.y-y;
      if(dx*dx+dy*dy<=r2) M.Sleeping.set(b,false);
    }
  }

  checkWin(){
    this.hud();
    if(this.over || this.targets.length) return;
    this.over=true;
    const stars=this.shotsLeft>=2?3:this.shotsLeft===1?2:1;
    this.time.delayedCall(700,()=>{ SFX.win(); emit('game:win',{ level:this.levelIdx, stars }); });
  }

  /* ---------- FX ---------- */
  tntBoom(x,y){
    this.burst(x,y,0xffa726,26); this.burst(x,y,0x555555,14);
    this.cam && this.cam.shake(0.02);
    this.hitStop(90);
    SFX.explosion();
  }
  hitStop(ms){ // congela la fisica un instante (game-feel en explosiones)
    const t=this.matter.world.engine.timing;
    t.timeScale=0.06;
    // con TNT en cadena los hit-stops se solapan: solo restaura el ultimo
    // (si no, el primero en vencer reactivaba la fisica a mitad del segundo)
    this.hitStopUntil=this.time.now+ms;
    this.time.delayedCall(ms,()=>{ if(this.time.now>=this.hitStopUntil) t.timeScale=1; });
  }
  burst(x,y,color,n){ // emitters perezosos por color, presupuesto limitado
    let e=this.emitters[color];
    if(!e){
      e=this.add.particles(0,0,'px',{ speed:{min:60,max:240}, angle:{min:0,max:360},
        lifespan:{min:250,max:650}, scale:{start:1.4,end:0}, gravityY:700,
        emitting:false, tint:color }).setDepth(50);
      this.emitters[color]=e;
    }
    e.explode(Math.min(n,30),x,y);
  }

  /* ---------- update ---------- */
  update(){
    for(const e of this.toKill.splice(0)) e.go.destroy();
    if(this.levelIdx===null) return;
    this.sling.update();

    if(this.projState==='flying'){
      const b=this.proj && this.proj.body;
      if(!b){ this.endShot(); return; }
      const age=this.time.now-this.shotT;
      const speed=Math.hypot(b.velocity.x,b.velocity.y);
      // estela de migas mientras vuela rapido (juice barato: reusa burst)
      if(speed>3 && ++this.trailT%4===0) this.burst(b.position.x,b.position.y,0xffe3b8,1);
      if(speed<0.35 && Math.abs(b.angularVelocity)<0.05) this.stillFrames++;
      else this.stillFrames=0;
      const out=b.position.x>WORLD_W-30 || b.position.x<10 || b.position.y>H+120;
      const rest=age>400 && (b.isSleeping || this.stillFrames>50);
      if(out || rest || age>9000) this.endShot();
    }
  }
}
