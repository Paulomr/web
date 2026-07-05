/* =====================================================================
   Escena principal. level:null = telon de fondo para los menus DOM.
   Nunca toca el DOM: emite por core/events.js (game:hud/win/lose).
   Flujo: cortar cuerdas (drag) -> la galleta cae -> chispas/burbujas/
   ventiladores -> boca de Bernie (victoria) o fuera (derrota).
   ===================================================================== */
import { W, H, CUT_RADIUS, EAT_R, OPEN_R, CHIP, OUT, REDUCED } from '../config.js';
import { LEVELS, skinFor } from '../data/levels.js';
import { emit } from '../core/events.js';
import { SFX } from '../audio/sfx.js';
import { Rope } from '../entities/rope.js';
import { makeCookie } from '../entities/cookie.js';
import { Bear } from '../entities/bear.js';
import { Bubble } from '../entities/bubble.js';
import { Fan } from '../entities/fan.js';

const TRAIL_MS=180;

export class GameScene extends Phaser.Scene{
  constructor(){ super('Game'); }

  init(d){ this.levelIdx=(d && Number.isInteger(d.level)) ? d.level : null; }

  create(){
    this.over=false; this.emitters={}; this.lastPt=null; this.trail=[];
    this.buildScenery();
    if(this.levelIdx===null) return;

    const L=LEVELS[this.levelIdx];
    this.chipsGot=0;

    this.cookie=makeCookie(this,L.cookie);
    this.ropes=L.ropes.map(r=>{
      this.add.image(r.x,r.y,'anchor').setDepth(8);
      return new Rope(this,this.cookie,r);
    });
    this.chips=(L.chips||[]).map(c=>{
      const img=this.add.image(c.x,c.y,'chip').setDepth(9);
      if(!REDUCED) this.tweens.add({ targets:img, scale:1.18, duration:700,
        yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
      return { x:c.x, y:c.y, img, got:false };
    });
    this.bubbles=(L.bubbles||[]).map(b=>new Bubble(this,b));
    this.fans=(L.fans||[]).map(f=>new Fan(this,f));
    this.bear=new Bear(this,L.bear,skinFor(this.levelIdx));

    this.gfx=this.add.graphics().setDepth(4);      // cuerdas + marcador de boca
    this.trailG=this.add.graphics().setDepth(30);  // estela del dedo

    this.setupInput();
    this.hud();
  }

  buildScenery(){
    const pack=this.levelIdx===null ? 0 : (this.levelIdx>=9 ? 2 : this.levelIdx>=6 ? 1 : 0);
    this.add.image(W/2,H/2,['skyDay','skyNight','skyXmas'][pack])
      .setDisplaySize(W,H).setDepth(-2);
    if(pack===1){ // noche vampira: estrellitas titilantes
      for(let i=0;i<18;i++){
        const s=this.add.image(Math.random()*W,Math.random()*H*0.62,'starlet')
          .setDepth(-1).setAlpha(0.4+Math.random()*0.6);
        if(!REDUCED) this.tweens.add({ targets:s, alpha:0.15,
          duration:900+Math.random()*1300, yoyo:true, repeat:-1 });
      }
    }else{
      [[110,150],[430,90],[620,210],[210,320],[560,380]].forEach(([x,y],i)=>
        this.add.image(x,y,'cloud').setDepth(-1).setAlpha(0.85).setScale(1+(i%3)*0.25));
    }
    if(pack===2 && !REDUCED){ // navidad: nieve suave
      this.add.particles(0,0,'flake',{ x:{min:0,max:W}, y:-10, lifespan:14000,
        speedY:{min:26,max:60}, speedX:{min:-14,max:14}, scale:{min:0.5,max:1},
        alpha:{start:0.9,end:0.25}, frequency:300 }).setDepth(-1);
    }
  }

  hud(){ emit('game:hud',{ level:this.levelIdx, name:LEVELS[this.levelIdx].name,
    chips:this.chipsGot, total:this.chips.length||3 }); }

  /* ---------- input: taps (ventilador/burbuja) y trazo de corte ---------- */
  setupInput(){
    this.input.on('pointerdown',p=>{
      if(this.over) return;
      const x=p.worldX, y=p.worldY;
      for(const f of this.fans) if(f.tryPuff(x,y,this.cookie)){
        SFX.puff();
        this.burst(f.x+f.dir.x*54, f.y+f.dir.y*54, 0xffffff, REDUCED?3:9);
        return;
      }
      for(const b of this.bubbles){
        const at=b.tryPop(x,y,this.cookie);
        if(at){ SFX.pop(); this.burst(at.x,at.y,0xdff4ff,REDUCED?4:12); return; }
      }
      this.lastPt={ x, y };
    });
    this.input.on('pointermove',p=>{
      if(this.over || !p.isDown || !this.lastPt) return;
      const x=p.worldX, y=p.worldY;
      this.trail.push({ x, y, t:this.time.now });
      this.slice(this.lastPt.x,this.lastPt.y,x,y);
      this.lastPt={ x, y };
    });
    const end=()=>{ this.lastPt=null; };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }

  slice(x1,y1,x2,y2){
    if(Math.hypot(x2-x1,y2-y1)<2) return;   // un tap quieto no corta
    let snipped=false;
    for(const r of this.ropes){
      for(const h of r.trySlice(x1,y1,x2,y2,CUT_RADIUS)){
        snipped=true;
        this.burst(h.x,h.y,0xd9b98c,REDUCED?3:8);
      }
    }
    if(snipped) SFX.snip();
  }

  /* ---------- desenlaces ---------- */
  eat(){
    if(this.over) return;
    this.over=true;
    const c=this.cookie, m=this.bear.mouth;
    this.ropes.forEach(r=>r.releaseCookie());
    c.bubbled=false;
    this.bubbles.forEach(b=>{ if(b.state==='holding'){ b.state='popped'; b.go.setVisible(false); } });
    c.setStatic(true);
    this.bear.eat();
    SFX.nom();
    [0xf2a7c0,0xffd9a0,0xbfe9ff,0xffffff].forEach(col=>
      this.burst(m.x,m.y,col,REDUCED?4:14));  // confeti
    this.tweens.add({ targets:c, x:m.x, y:m.y, scale:0.15, alpha:0.2,
      duration:280, ease:'Sine.easeIn', onComplete:()=>c.setVisible(false) });
    const stars=Math.max(1,this.chipsGot);
    this.time.delayedCall(1000,()=>{ SFX.win(); emit('game:win',{ level:this.levelIdx, stars }); });
  }

  lose(){
    if(this.over) return;
    this.over=true;
    this.bear.sad();
    SFX.lose();
    this.time.delayedCall(700,()=>emit('game:lose',{ level:this.levelIdx }));
  }

  /* ---------- FX ---------- */
  burst(x,y,color,n){ // emitters perezosos por color, presupuesto limitado
    let e=this.emitters[color];
    if(!e){
      e=this.add.particles(0,0,'px',{ speed:{min:60,max:260}, angle:{min:0,max:360},
        lifespan:{min:250,max:650}, scale:{start:1.2,end:0}, gravityY:420,
        emitting:false, tint:color }).setDepth(50);
      this.emitters[color]=e;
    }
    e.explode(Math.min(n,30),x,y);
  }

  drawRopes(){
    const g=this.gfx; g.clear();
    for(const r of this.ropes) r.draw(g);
    if(!this.over && this.bear){ // marcador de boca (funcional, no decorativo)
      const m=this.bear.mouth;
      const wob=REDUCED?0:Math.sin(this.time.now/400)*4;
      g.lineStyle(3,0xffd9a0,this.bear.excited?0.9:0.35)
       .strokeCircle(m.x,m.y,EAT_R*0.62+wob);
    }
  }

  drawTrail(){
    const g=this.trailG; g.clear();
    const now=this.time.now;
    this.trail=this.trail.filter(p=>now-p.t<TRAIL_MS);
    for(let i=1;i<this.trail.length;i++){
      const q=this.trail[i-1], p=this.trail[i];
      const a=1-(now-p.t)/TRAIL_MS;
      g.lineStyle(2+9*a,0xffffff,0.55*a).lineBetween(q.x,q.y,p.x,p.y);
    }
  }

  /* ---------- update ---------- */
  update(){
    if(this.levelIdx===null) return;
    this.drawRopes();
    this.drawTrail();
    if(this.over || !this.cookie.body) return;
    const c=this.cookie;

    for(const b of this.bubbles){
      if(b.state==='idle' && b.tryCatch(c)){
        SFX.catchBubble();
        this.burst(c.x,c.y,0xbfe9ff,REDUCED?3:8);
      }
      b.update(c);
    }

    for(const ch of this.chips){
      if(ch.got) continue;
      if(Phaser.Math.Distance.Between(c.x,c.y,ch.x,ch.y)<CHIP.collectR){
        ch.got=true; ch.img.setVisible(false); this.chipsGot++;
        SFX.chip();
        this.burst(ch.x,ch.y,0xffd9a0,REDUCED?4:10);
        this.hud();
      }
    }

    const m=this.bear.mouth;
    const dm=Phaser.Math.Distance.Between(c.x,c.y,m.x,m.y);
    this.bear.setExcited(dm<OPEN_R);
    if(dm<EAT_R){ this.eat(); return; }

    if(c.x<-OUT.pad || c.x>W+OUT.pad || c.y>H+OUT.pad || c.y<-OUT.pad*1.4) this.lose();
  }
}
