/* =====================================================================
   Escena principal. level:null = telon de fondo para los menus DOM.
   Nunca toca el DOM: emite por core/events.js (game:hud/win/lose).
   ===================================================================== */
import { W, H, WORLD_W, GROUND_Y, GROUND_H, TNT, DMG_SCALE, IMPACT_SHOCK, SLAM } from '../config.js';
import { shockwave } from '../physics/explosion.js';
import { LEVELS } from '../data/levels.js';
import { emit } from '../core/events.js';
import { SFX } from '../audio/sfx.js';
import { makeBlock } from '../entities/block.js';
import { makeTarget } from '../entities/target.js';
import { makeTNT } from '../entities/tnt.js';
import { Slingshot } from '../entities/slingshot.js';
import { BearQueue } from '../entities/bearqueue.js';
import { setupSlingInput } from '../core/input.js';
import { GameCam } from '../core/camera.js';

export class GameScene extends Phaser.Scene{
  constructor(){ super('Game'); }

  init(d){ this.levelIdx=(d && Number.isInteger(d.level)) ? d.level : null; }

  create(){
    // Limites con MUCHO aire vertical. Con los limites pegados a H (720) y la
    // camara alejada (seguimiento 0.88 o vistazo), la vista era mas alta que los
    // limites y Phaser la recolocaba sola: el suelo se comia media pantalla. Con
    // holgura la camara va donde se le pide, y de paso los globos altos ya no se
    // salen por arriba. El cielo y el suelo cubren de sobra este rango.
    this.cameras.main.setBounds(0,-500,WORLD_W,1500);
    this.buildScenery();
    this.toKill=[]; this.blocks=[]; this.targets=[]; this.tnts=[]; this.splats=[];
    this.emitters={}; this.over=false; this.proj=null; this.projState='idle';
    this.primerTiro=false; // hasta el primer lanzamiento las latas son intocables
    this.lastHitSfx=0; this.shockT=0; this.hitStopUntil=0; this.trailT=0;
    // defensivo: si se reinicio en pleno hit-stop, que no quede el slow-mo pegado
    this.matter.world.engine.timing.timeScale=1;

    if(this.levelIdx===null){ this.cameras.main.centerOn(W/2,H/2); return; }

    const L=LEVELS[this.levelIdx];
    this.shotsLeft=L.shots;
    this.cam=new GameCam(this, on=>emit('game:peek',{ on }));

    // estaticos: suelo + muros laterales
    const st={ isStatic:true, friction:0.9 };
    this.matter.add.rectangle(WORLD_W/2,GROUND_Y+40,WORLD_W,80,st);
    this.matter.add.rectangle(-30,H/2,60,H*3,st);
    this.matter.add.rectangle(WORLD_W+30,H/2,60,H*3,st);

    L.blocks.forEach(b=>this.blocks.push(makeBlock(this,b)));
    (L.tnt||[]).forEach(t=>this.tnts.push(makeTNT(this,t)));
    L.targets.forEach(t=>this.targets.push(makeTarget(this,t)));

    this.sling=new Slingshot(this);
    this.fila=new BearQueue(this);   // osos esperando turno = tiros restantes
    this.syncFila();
    setupSlingInput(this,this.sling);
    this.matter.world.on('collisionstart',this.onCollisions,this);
    this.hud();

    // intro: ensenar la estructura y volver; luego cargar el primer proyectil.
    // Punto medio del ANCHO ocupado por las latas (no la media: esa se iria
    // hacia donde haya mas latas juntas y dejaria fuera la de la punta).
    const txs=L.targets.map(t=>t.x);
    this.focusX=Phaser.Math.Clamp(
      (Math.min(...txs)+Math.max(...txs))/2, W/2, WORLD_W-W/2);
    this.cam.intro(this.focusX);
    this.time.delayedCall(2500,()=>this.sling.loadNext());
  }

  /* Osos en el suelo = tiros que quedan, sin contar el que ya está en la honda. */
  syncFila(){
    if(this.fila) this.fila.sync(this.shotsLeft-(this.sling && this.sling.proj?1:0));
  }

  /* Vistazo a la estructura. Se ignora en pleno vuelo: la camara ya sigue al oso. */
  togglePeek(){
    if(this.over || this.levelIdx===null || this.projState==='flying' || !this.cam) return;
    this.cam.peek(this.focusX);
  }

  buildScenery(){
    // cielo con holgura por arriba: con el vistazo la camara ve hasta y=-280
    this.add.image(WORLD_W/2,110,'sky').setDisplaySize(WORLD_W,1290).setDepth(-2);
    // sol blanco amplio: parallax lento, respiracion sutil de escala
    const sun=this.add.image(860,155,'sun').setScrollFactor(0.15).setDepth(-1.9).setScale(1.25);
    this.tweens.add({ targets:sun, scale:1.32, duration:2600, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    [200,700,1250,1750,2250].forEach((x,i)=>
      this.add.image(x,120+(i%3)*60,'cloud').setScrollFactor(0.35).setDepth(-1).setAlpha(0.9));
    [150,600,1100,1600,2100,2500].forEach((x,i)=>
      this.add.image(x,GROUND_Y-10+(i%2)*14, i%2?'hillMint':'hill')
        .setScrollFactor(0.6).setDepth(0).setAlpha(0.85));
    this.add.tileSprite(WORLD_W/2,GROUND_Y+GROUND_H/2,WORLD_W,GROUND_H,'groundTex').setDepth(2);
  }

  hud(){ emit('game:hud',{ level:this.levelIdx, name:LEVELS[this.levelIdx].name,
    shots:this.shotsLeft, targets:this.targets.length }); }

  /* ---------- disparo ---------- */
  onLaunched(go){
    this.proj=go; this.projState='flying'; this.stillFrames=0; this.shotT=this.time.now;
    this.primerTiro=true;   // a partir de aqui las latas ya se pueden reventar
    this.shotsLeft--; this.hud();
    if(this.cam) this.cam.endPeek();  // si estabas mirando, el disparo manda
    this.syncFila();
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
      if(a.label==='proj'||b.label==='proj'){
        const pb=a.label==='proj'?a:b;
        // El oso vuela SIN rozamiento para que la prediccion de la honda sea
        // exacta, pero eso solo importa hasta el primer contacto. A partir de ahi
        // le metemos drag: sin el, un circulo sobre suelo plano en Matter no
        // pierde apenas velocidad (no hay resistencia a la rodadura) y se iba
        // rodando hasta agotar el timeout de 9s antes de dejarte tirar otra vez.
        if(pb.frictionAir===0) pb.frictionAir=0.022;
        if(rel>8) this.cam && this.cam.shake(Math.min(0.012,rel*0.0006));
        this.estamparse(pb, pb===a?b:a, rel);
      }
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

  /* El oso se ESTAMPA contra lo que golpea. Matter reparte la energía entre
     todos los contactos, así que un impacto directo a toda velocidad movía la
     torre mucho menos de lo que el golpe aparenta. Aquí le metemos al cuerpo
     golpeado un empujón extra en la dirección del vuelo, y achatamos al oso un
     instante contra la superficie. */
  estamparse(pb, otro, rel){
    if(rel<SLAM.minSpeed || otro.isStatic || !otro.entRef) return;
    const v=pb.velocity, sp=Math.hypot(v.x,v.y);
    if(sp<0.001) return;
    const f=Phaser.Math.Clamp(rel/SLAM.refSpeed,0,1)*SLAM.power;
    Phaser.Physics.Matter.Matter.Body.applyForce(otro, otro.position, {
      x:(v.x/sp)*f*otro.mass, y:(v.y/sp)*f*otro.mass,
    });
    // Achatado del oso contra la superficie. Solo escala del sprite: rotarlo
    // giraría también el cuerpo de Matter (setRotation escribe en body.angle) y
    // estaríamos tocando la física en pleno callback de colisión.
    const go=this.proj;
    if(go && this.time.now-(this.squashT||0)>120){
      this.squashT=this.time.now;
      const k=Phaser.Math.Clamp(rel/SLAM.refSpeed,0,1)*SLAM.squash;
      const horiz=Math.abs(v.x)>=Math.abs(v.y);   // ¿se estampa contra un muro o contra el suelo?
      go.setScale(horiz?1-k*0.55:1+k*0.45, horiz?1+k*0.45:1-k*0.55);
      this.tweens.add({ targets:go, scaleX:1, scaleY:1, duration:200, ease:'Back.easeOut' });
    }
  }

  // dano = energia cinetica relativa con masa reducida (estaticos ~ masa grande).
  // Devuelve el dano aplicado (0 si es un roce por debajo del umbral) para que
  // onCollisions decida si lanzar la onda expansiva.
  applyHit(self,other,rel){
    const ent=self.entRef;
    if(!ent||ent.dead) return 0;
    // Ninguna lata puede morir antes de que dispares: lo unico que pasa hasta
    // entonces es la estructura asentandose, y con hp:1 un simple roce las mataba
    // solas. Ademas era intermitente (los roces dependen de los deltas de Matter,
    // o sea de la carga de la maquina), que es la peor forma de fallar. Una
    // ventana por tiempo no bastaba: las torres altas siguen moviendose despues.
    if(ent.kind==='can' && !this.primerTiro) return 0;
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
    else if(kind==='can'){ this.reventarLata(go.x,go.y); this.targets=this.targets.filter(t=>t!==ent); }
    else if(kind==='tnt'){ this.tnts=this.tnts.filter(t=>t!==ent); }
    go.setVisible(false);
    this.wakeNear(go.x, go.y, 190); // el apoyo desaparece: despierta la torre para que colapse
    this.toKill.push(ent); // destruir fuera del callback de colision
    if(kind==='can') this.checkWin();
  }

  /* La lata revienta: pulpa por el aire y tomate salpicado en el piso. */
  reventarLata(x,y){
    SFX.can();
    this.burst(x,y,0xc4241c,20);   // pulpa
    this.burst(x,y,0xf7e8b0,5);    // pepitas
    this.burst(x,y,0x9a947c,4);    // metal de la lata
    this.cam && this.cam.shake(0.008);
    this.salpicar(x,y);
  }

  /* Mancha de tomate en el suelo, justo debajo de donde reventó la lata.
     Cae desde la altura de la lata para que se vea "chorrear" hasta el piso. */
  salpicar(x,y){
    const v=Phaser.Math.Between(0,2);
    const ex=Phaser.Math.FloatBetween(0.75,1.15);
    const sp=this.add.image(Phaser.Math.Clamp(x,40,WORLD_W-40), GROUND_Y-4, 'splat'+v)
      .setDepth(2.5)                              // sobre el suelo, bajo los bloques
      .setOrigin(0.5,0.72)
      .setFlipX(Math.random()<0.5)
      .setScale(ex,0.1)
      .setAlpha(0.95);
    // cuanto más alta reventó, más tarda el tomate en llegar al piso
    const t=Phaser.Math.Clamp((GROUND_Y-y)/400,0,1)*160;
    // la mancha se "abre" al aterrizar
    this.tweens.add({ targets:sp, scaleY:ex, duration:190, delay:t, ease:'Back.easeOut' });
    // gotas que saltan al reventar contra el piso
    this.time.delayedCall(t,()=>this.burst(sp.x,GROUND_Y-8,0xc4241c,7));
    this.splats.push(sp);
    // el suelo no se llena hasta arriba: se limpian las manchas más viejas
    if(this.splats.length>26) this.splats.shift().destroy();
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

  /* Las estrellas miden PUNTERIA, no munición sobrante: comparan los tiros que
     has gastado con las latas que tenía el nivel.
       3★ = ni un tiro de más (un oso por lata, o menos si encadenas derrumbes)
       2★ = hasta 2 de más
       1★ = ganaste
     Antes era "acaba con 2 osos en la mano"; al dar munición de sobra (latas+3)
     eso salía solo, y se sacaban 3★ derrochando tiros. */
  estrellas(){
    const L=LEVELS[this.levelIdx];
    const usados=L.shots-this.shotsLeft, n=L.targets.length;
    return { stars: usados<=n ? 3 : usados<=n+2 ? 2 : 1, usados, meta:n };
  }

  checkWin(){
    this.hud();
    if(this.over || this.targets.length) return;
    this.over=true;
    const { stars, usados, meta }=this.estrellas();
    this.time.delayedCall(700,()=>{ SFX.win(); emit('game:win',{ level:this.levelIdx, stars, usados, meta }); });
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
      // Solo cuenta la velocidad LINEAL: el oso es un circulo y sigue girando
      // mientras rueda, asi que exigir tambien angularVelocity baja hacia que casi
      // nunca se diera por parado y cada tiro agotase el timeout de 9s. Un oso a
      // <0.35 durante ~0.8s ya no va a tirar nada aunque siga girando.
      if(speed<0.35) this.stillFrames++;
      else this.stillFrames=0;
      const out=b.position.x>WORLD_W-30 || b.position.x<10 || b.position.y>H+120;
      const rest=age>400 && (b.isSleeping || this.stillFrames>50);
      if(out || rest || age>9000) this.endShot();
    }
  }
}
