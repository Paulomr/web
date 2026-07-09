/* =====================================================================
   GAME - jugabilidad (Arcade Physics).
   Entidades: p1, p2 (CPU), ball, ground, walls, posts (nudo + techo curvo),
   fences (muros solo-jugadores en la boca del arco), goalL/R, nets.
   Avisa el fin de partido por el Bus ('matchEnded') - no toca la UI.
   ===================================================================== */
import { W, H, GROUND_Y, GOAL_D, GOAL_H, GOAL_DROP, GOAL_BACK, POST_R, PH, SPD, JUMP,
         MATCH_SECONDS, DIFFICULTY, PAL, WIN_GOALS, FINALE_AT, FINALE_BUFF } from '../config.js';
import { ASSETS } from '../assets.data.js';
import { InputManager } from '../core/input.js';
import { CollisionManager } from '../core/collisions.js';
import { emit } from '../core/events.js';
import { SFX } from '../audio/sfx.js';
import { MUSIC } from '../audio/music.js';
import { setText } from '../ui/dom.js';

export class GameScene extends Phaser.Scene {
  constructor(){ super('Game'); }
  // dif/mision llegan del modo misiones (Bearnie IA malvada); sin ellos rige config.
  init(d){ this.pickP=d.pickP; this.pickC=d.pickC; this.twoP=!!d.twoP;
           this.dif=d.dif ?? DIFFICULTY; this.mision=d.mision ?? null; }

  create(){
    this.sP=0; this.sC=0; this.over=false; this.scoreCD=0;
    this.finale=false; this.buff=1;
    this.physics.world.timeScale=1; // por si un finale anterior quedo activo
    this.drawField();

    // --- entidades fisicas ---
    this.p1 = this.makePlayer(W*0.24,  1, ASSETS.chars[this.pickP].id);
    this.p2 = this.makePlayer(W*0.76, -1, ASSETS.chars[this.pickC].id);
    this.p2.isCPU = !this.twoP;
    this.ball = this.physics.add.sprite(W/2, H*0.28, 'ball').setDisplaySize(64,64);
    // rebote vivo como balon real (no piedra) pero controlado + tope vertical que evita disparos
    // textura 256px, radio fisico efectivo 28.5px (114 * escala 0.25): un pelo DENTRO del
    // cuero dibujado, para que el contacto se vea sobre el balon y no en su contorno
    this.ball.setCircle(114, 14, 14).setBounce(0.6).setDragX(26).setMaxVelocity(900,1000);
    this.ball.body.mass = 1;     // liviano: rebota sin mover a los personajes pesados
    this.ball.setCollideWorldBounds(true); // red de seguridad: jamas sale del mundo
    this.ballS = this.ball.scaleX;         // escala base del balon (ancla del squash)

    // colisionadores estaticos invisibles
    this.ground = this.zone(W/2, (GROUND_Y+H)/2, W, H-GROUND_Y);
    const gt = GROUND_Y - GOAL_H;
    this.walls = [
      this.zone(GOAL_D/2,   gt/2, GOAL_D, gt),   // columna sobre el arco izq: sella el cielo (ni goles fantasma ni balones atrapados tras la red)
      this.zone(W-GOAL_D/2, gt/2, GOAL_D, gt),   // columna sobre el arco der
      this.zone(W/2, 5, W, 10),                  // techo
      this.zone(GOAL_BACK/2,   (gt+GROUND_Y)/2, GOAL_BACK, GROUND_Y-gt), // espalda de la red izq
      this.zone(W-GOAL_BACK/2, (gt+GROUND_Y)/2, GOAL_BACK, GROUND_Y-gt)  // espalda de la red der
    ];
    // estructura del arco: nudo del travesano + techo CURVO como cadena de palos
    // circulares (el balon rebota redondo en el palo y las esquinas guian hacia adentro)
    this.posts = [this.postZone(GOAL_D, gt), this.postZone(W-GOAL_D, gt),
                  ...this.goalArch(false), ...this.goalArch(true)];
    // muro invisible SOLO-jugadores en la boca de cada arco: nadie acampa dentro de la
    // porteria (el balon lo atraviesa libre; el gol legitimo SIEMPRE entra)
    this.fences = [ this.zone(GOAL_D+7,   GROUND_Y/2, 14, GROUND_Y),
                    this.zone(W-GOAL_D-7, GROUND_Y/2, 14, GROUND_Y) ];
    // sensores DENTRO de la red; el gol se valida contra la linea interna en scoreGoal
    this.goalL = this.zone(GOAL_D*0.4,   gt+GOAL_H/2, GOAL_D*0.8, GOAL_H);
    this.goalR = this.zone(W-GOAL_D*0.4, gt+GOAL_H/2, GOAL_D*0.8, GOAL_H);
    // redes visibles (sprites): se abomban HACIA ATRAS con el gol; el balon se ve tras la malla
    this.netL = this.add.image(GOAL_D,GROUND_Y,'net').setOrigin(1,1).setDepth(6);
    this.netR = this.add.image(W-GOAL_D,GROUND_Y,'net').setOrigin(0,1).setFlipX(true).setDepth(6);

    // --- tabla declarativa de colisiones ---
    this.collisions = new CollisionManager(this)
      .add(this.ball, this.ground)                                   // rebote piso
      .add(this.ball, this.walls)                                    // rebote muros/techo
      .add(this.ball, this.posts)                                    // rebote en el travesano
      .add(this.p1,   this.ground)                                   // jugador pisa
      .add(this.p2,   this.ground)                                   // CPU pisa
      .add(this.ball, this.p1, (b,p)=>this.headBall(b,p), true)      // cabezazo jugador (overlap: el balon NO empuja al jugador)
      .add(this.ball, this.p2, (b,p)=>this.headBall(b,p), true)      // cabezazo CPU
      .add(this.ball, this.goalL, ()=>this.scoreGoal('L'), true)     // gol en arco izq
      .add(this.ball, this.goalR, ()=>this.scoreGoal('R'), true)     // gol en arco der
      .add(this.p1,   this.fences)                                   // los jugadores NO entran al arco
      .add(this.p2,   this.fences)
      .add(this.p1,   this.p2);                                      // personaje vs personaje (sin atravesar)
    // Extensible: .add(this.p1, this.pickups, onPickup, true)
    this.collisions.build();

    // sombras (profundidad, costo minimo)
    this.shadows = [this.p1,this.p2,this.ball].map(o=>
      this.add.image(o.x, GROUND_Y, 'shadow').setOrigin(0.5).setDepth(-5).setAlpha(0.3));

    // estela del balon (Graphics reciclado, sin sprites nuevos)
    this.trail = this.add.graphics().setDepth(-2);
    this.trailPts = [];

    this.inputMgr = new InputManager(this);

    // --- IA del rival (no es un patron fijo: anticipa, reacciona y se equivoca) ---
    const d = Phaser.Math.Clamp((this.dif-0.7)/0.3, 0, 1); // 0 facil - 1 dificil
    this.aiCfg = {
      react: Phaser.Math.Linear(300, 95, d),   // ms entre decisiones (reaccion)
      err:   Phaser.Math.Linear(140, 25, d),   // error de punteria en px
      speed: SPD * Phaser.Math.Linear(0.80, 1.0, d),
      jump:  Phaser.Math.Linear(0.40, 0.92, d),// prob. de saltar a cabecear
      miss:  Phaser.Math.Linear(0.38, 0.05, d) // prob. de dudar/fallar
    };
    this.HOME2 = W*0.80;                        // posicion defensiva frente a su arco
    this.p2.ai = { targetX:this.p2.x, nextThink:0, jumpCD:0,
                   aggr:Phaser.Math.FloatBetween(0.4,0.8) };

    // flash + texto de gol (pixel font con contorno, mismo arte del menu)
    this.flash = this.add.rectangle(W/2,H/2,W,H,PAL.red,0).setDepth(20);
    this.goalTxt = this.add.text(W/2,H/2,'GOOOL',
      {fontFamily:'"Press Start 2P","Boldone",monospace',fontSize:'72px',color:'#ffffff'})
      .setStroke('#2a1320',12).setShadow(6,6,'rgba(42,19,32,0.4)',0,true,true)
      .setOrigin(0.5).setAlpha(0).setDepth(21);

    // confeti de gol (un solo emitter reciclado; explota en la boca del arco)
    this.confetti = this.add.particles(0,0,'confetti',{
      speed:{min:200,max:520}, angle:{min:210,max:330}, gravityY:900,
      lifespan:{min:450,max:900}, scale:{min:0.5,max:1.3}, rotate:{min:0,max:360},
      tint:[PAL.pink,0xffd6e0,PAL.blue,0xffe08a,0xffffff], emitting:false
    }).setDepth(22);

    // vinieta de urgencia (marco rojo pulsante en el finale)
    this.vignette = this.add.graphics().setDepth(19).setAlpha(0);
    this.vignette.fillStyle(PAL.red,1);
    this.vignette.fillRect(0,0,W,26); this.vignette.fillRect(0,H-26,W,26);
    this.vignette.fillRect(0,0,26,H); this.vignette.fillRect(W-26,0,26,H);

    // HUD + timer. El reloj corre en tiempo REAL: los eventos de time
    // no dependen de physics.world.timeScale, asi el slow-mo no lo alarga.
    setText('sP',0); setText('sC',0); setText('timer',MATCH_SECONDS);
    emit('finale', false);                                    // limpia la urgencia si el partido anterior quedo a medias
    this.events.once('shutdown', ()=>emit('finale', false)); // idem al salir por el menu de pausa
    this.timeLeft = MATCH_SECONDS;
    this.timer = this.time.addEvent({delay:1000, loop:true, callback:()=>{
      if(this.over) return;
      this.timeLeft--; setText('timer',this.timeLeft);
      if(!this.finale && this.timeLeft<=FINALE_AT && this.timeLeft>0) this.startFinale();
      if(this.timeLeft<=0) this.endMatch();
    }});
  }

  startFinale(){ // ultimos segundos: bullet-time + jugadores potenciados
    this.finale=true; this.buff=FINALE_BUFF;
    this.physics.world.timeScale=1.8;          // fisica a ~55% de velocidad
    this.cameras.main.zoomTo(1.04, 600);
    this.tweens.add({targets:this.vignette, alpha:0.35, duration:450, yoyo:true, repeat:-1});
    emit('finale', true);
    SFX.cheer();                               // la tribuna se enciende
  }

  makePlayer(x, dir, key){
    const p = this.physics.add.sprite(x, GROUND_Y-PH/2, key);
    const s = PH / p.height; p.setScale(s);
    // Hitbox rectangular = ENVOLTURA de deteccion (piso, choque entre personajes y
    // aviso del overlap con el balon). El contacto real balon-cuerpo lo decide
    // headBall con los circulos de carne: el rect se ajusta a ese alcance y a los pies.
    const bw = Math.min(p.width-8, (PH*0.44)/s), bh = p.height*0.92;
    p.body.setSize(bw, bh);
    p.body.setOffset((p.width-bw)/2, p.height-bh);
    p.baseS = s;                  // escala base: ancla del squash/stretch
    p.dir = dir; p.kicking=false; p.kickCD=0; p.inAir=false;
    p.jumpAnim = this.anims.exists(key+'_jump') ? key+'_jump' : null;
    p.setFlipX(dir<0);            // mira hacia el centro
    p.body.setCollideWorldBounds(false);
    p.body.pushable = true;       // permite separacion estable entre personajes
    p.body.mass = 20;             // pesado: el balon no lo mueve; jugadores se separan parejo
    p.setBounce(0);               // sin rebotes absurdos entre personajes
    return p;
  }
  zone(cx,cy,w,h){
    const z = this.add.zone(cx,cy,w,h);
    this.physics.add.existing(z, true); // estatico
    return z;
  }
  postZone(x,y,r=POST_R){ // palo circular estatico (rebote limpio en cualquier angulo)
    const z = this.add.zone(x,y,r*2,r*2);
    this.physics.add.existing(z, true);
    z.body.setCircle(r);
    return z;
  }
  goalArch(right){ // techo curvo del arco: cuarto de elipse muestreado como palos circulares
    const RX=GOAL_D-GOAL_BACK, RY=GOAL_DROP, gt=GROUND_Y-GOAL_H, out=[];
    for(let u=6;u<=84;u+=6){ // extremos ya cubiertos por la espalda y el nudo del travesano
      const a=u*Math.PI/180, x=GOAL_D-RX*Math.cos(a), y=gt+RY-RY*Math.sin(a);
      out.push(this.postZone(right? W-x : x, y, POST_R-1));
    }
    return out;
  }

  // ---- RESPUESTA de colisiones (handlers) ----
  // Respuesta del balon al contacto con un personaje.
  // Es la UNICA fuente de empuje del balon en este contacto (overlap, sin fisica automatica):
  // asi el jugador NUNCA es empujado. Modelo: DOS circulos de carne (cabeza/pecho y botas);
  // si el balon no penetra ninguno, NO hay respuesta -> el rebote arranca DENTRO del
  // cuerpo dibujado y no en el borde/esquinas del rectangulo (adios al aura invisible).
  headBall(ball, p){
    const now=this.time.now, tag=(p===this.p1)?'_hp':'_hc';
    if (now-(this[tag]||0) < 80) return;

    // circulo con mayor penetracion gana: [centroY relativo, radio de carne]
    const br=ball.body.halfWidth;
    let nx=0, ny=0, pen=-1;
    for (const [cy,cr] of [[p.y-PH*0.18, PH*0.22], [p.y+PH*0.28, PH*0.17]]){
      const dx=ball.x-p.x, dy=ball.y-cy, d=Math.hypot(dx,dy)||1, pp=br+cr-d;
      if (pp > pen){ pen=pp; nx=dx/d; ny=dy/d; }
    }
    if (pen <= 0) return; // aun no toca la carne: sin rebote (ni cooldown gastado)
    this[tag]=now;

    // Normal restringida al hemisferio superior: el jugador empuja el balon de lado o
    // hacia arriba, NUNCA lo clava contra el piso (mata el "sale disparado al fondo").
    if (ny > -0.25){ ny=-0.25; const k=Math.hypot(nx,ny)||1; nx/=k; ny/=k; }

    // SEPARACION SUAVE: corrige solo la penetracion real, sin teletransportar (sin jitter).
    ball.x += nx*pen; ball.y += ny*pen;

    // REBOTE REAL: reflejar la velocidad entrante sobre la normal. Conserva la energia del
    // balon (un balon rapido rebota; uno quieto casi no se mueve) -> nada antinatural.
    const v=ball.body.velocity;
    const approach = v.x*nx + v.y*ny;          // <0 => el balon se acerca al jugador
    let vx=v.x, vy=v.y;
    if (approach < 0){
      const REST=0.65;                         // restitucion cuerpo-balon
      vx -= (1+REST)*approach*nx;
      vy -= (1+REST)*approach*ny;
    }

    // Acompañar al jugador (dribbling); solo suma empuje hacia arriba, nunca hacia abajo.
    vx += p.body.velocity.x*0.45;
    vy += Math.min(0, p.body.velocity.y)*0.35;

    // Pop de salida segun cuanto este comprimido: si lo aprietan entre dos, sale hacia
    // arriba de forma natural en vez de temblar (resuelve el "balon en el medio").
    const pop = Math.min(pen, 26) * 7;
    if (pop > 0){ vx += nx*pop; vy += ny*pop; }

    // Patada en pleno contacto: bonus direccional englobado (coherente con kick())
    if (p.kicking){ vx += p.dir*420; vy -= 320; }

    // LIMITE DURO: el balon nunca sale disparado de forma irreal
    vx = Phaser.Math.Clamp(vx, -780, 780);
    vy = Phaser.Math.Clamp(vy, -800, 800);
    ball.body.setVelocity(vx, vy);
  }

  scoreGoal(side){
    const now=this.time.now; if (now-this.scoreCD < 1100) return;
    // GOL VALIDO cuando el CENTRO del balon cruza la linea interna Y va por DENTRO del
    // arco (centro bajo el travesano): un balon rodando sobre el techo curvo jamas cuenta.
    // Antes se exigia que cruzara el balon ENTERO (x±radio); un tiro lento se frenaba dentro
    // del arco sin llegar a cruzar del todo -> no contaba y quedaba atorado (nadie entra a
    // sacarlo por las cercas). Con el centro basta: el gol lento cuenta al instante.
    if (this.ball.y < GROUND_Y-GOAL_H+POST_R) return;
    if (side==='L' ? this.ball.x > GOAL_D : this.ball.x < W-GOAL_D) return;
    this.scoreCD=now;
    const forP1 = side==='R';           // gol en el arco derecho = punto de P1
    if (forP1) this.sP++; else this.sC++;
    setText('sP',this.sP); setText('sC',this.sC);
    const happy = forP1 || this.twoP;   // contra la CPU, el gol rival suena triste
    if (happy){ SFX.goal(); SFX.cheer(); } else SFX.sad();
    MUSIC.duck();
    // la red absorbe el tiro y se abomba (reaccion visual)
    this.ball.body.velocity.scale(0.2);
    this.tweens.add({targets:side==='L'?this.netL:this.netR,
      scaleX:1.16, duration:110, yoyo:true, repeat:1, ease:'Quad.out'});
    // confeti desde la boca del arco + texto segun quien anoto
    this.confetti.explode(46, side==='L'?GOAL_D:W-GOAL_D, GROUND_Y-GOAL_H+30);
    this.goalTxt.setText(this.twoP ? (forP1?'¡GOL DE P1!':'¡GOL DE P2!')
                                   : (forP1?'¡GOOOL!':'GOL RIVAL'))
      .setColor(happy?'#ffffff':'#ffd6e0');
    this.celebrate(happy);
    // Fin por goles: el primero en WIN_GOALS gana al instante (no espera el timer)
    if (this.sP>=WIN_GOALS || this.sC>=WIN_GOALS){
      this.time.delayedCall(900, ()=>this.endMatch());
      return;
    }
    this.time.delayedCall(650, ()=>{ if(!this.over) this.kickoff(); });
  }

  kickoff(){
    this.p1.setPosition(W*0.24, GROUND_Y-PH/2); this.p1.body.setVelocity(0,0);
    this.p2.setPosition(W*0.76, GROUND_Y-PH/2); this.p2.body.setVelocity(0,0);
    this.ball.setPosition(W/2, H*0.28); this.ball.body.setVelocity(0,0);
  }

  celebrate(big=true){
    this.cameras.main.shake(big?240:150, big?0.006:0.0035); // el gol propio sacude mas
    this.flash.setAlpha(big?0.5:0.32); this.goalTxt.setAlpha(1).setScale(0.7);
    this.tweens.add({targets:this.flash, alpha:0, duration:600});
    this.tweens.add({targets:this.goalTxt, alpha:0, scale:1.1, duration:700, ease:'Back.out'});
  }

  jump(p){
    p.body.setVelocityY(-JUMP*this.buff); // en el finale salta mas alto
    p.inAir=true;                         // marca el salto: el squash de aterrizaje solo dispara al volver al suelo
    SFX.jump();
    // estiron al despegar (anclado a la escala base, igual que la patada)
    this.tweens.killTweensOf(p); p.setScale(p.baseS);
    this.tweens.add({targets:p, scaleX:p.baseS*0.9, scaleY:p.baseS*1.12, yoyo:true, duration:90});
    if (p.jumpAnim) p.play(p.jumpAnim, true);
  }

  hitStop(ms){ // congela la fisica 2-3 frames al conectar: el golpe "pega gordo"
    const t=this.time.now; if (t < (this._hsCD||0)) return; this._hsCD = t+450;
    this.physics.world.pause();
    this.time.delayedCall(ms, ()=>{ if(!this.over) this.physics.world.resume(); });
  }
  kick(p){
    const now=this.time.now; if (now < p.kickCD) return;
    p.kickCD = now+260; p.kicking=true;
    SFX.kick();
    // Chute ENGLOBADO: si conecta, parabola alta y potente + efecto lateral aleatorio.
    // Reemplaza (no suma) la velocidad: arco consistente sin depender del overlap.
    // Radio acorde a los circulos de carne: la patada conecta cerca del cuerpo, no al aire.
    const b=this.ball, dx=b.x-p.x, dy=b.y-(p.y-PH*0.18);
    if (Math.hypot(dx,dy) < PH*0.62){
      const dir = dx ? Math.sign(dx) : p.dir;
      b.body.setVelocity(
        Phaser.Math.Clamp(b.body.velocity.x*0.3 + dir*560*this.buff + Phaser.Math.Between(-40,40), -780, 780),
        Phaser.Math.Clamp(Math.min(b.body.velocity.y,0)*0.3 - 520*this.buff, -800, 800));
      // squash del balon + mini-sacudida: el impacto se siente
      this.tweens.killTweensOf(b); b.setScale(this.ballS);
      this.tweens.add({targets:b, scaleX:this.ballS*0.82, scaleY:this.ballS*1.14, yoyo:true, duration:60});
      this.cameras.main.shake(60, 0.0025);
      this.hitStop(50);
    }
    // squash/stretch anclado a la escala base (no se acumula entre patadas)
    this.tweens.killTweensOf(p); p.setScale(p.baseS);
    this.tweens.add({targets:p, scaleX:p.baseS*1.18, scaleY:p.baseS*0.9, yoyo:true, duration:70});
    this.time.delayedCall(160, ()=>{ p.kicking=false; });
  }

  update(){
    if (this.over) return;
    // P1 humano (en 1P fusiona flechas+tactil como siempre)
    const s = this.inputMgr.p1(!this.twoP);
    this.p1.body.setVelocityX(s.left?-SPD : s.right?SPD : 0);
    if (s.up && this.p1.body.blocked.down) this.jump(this.p1);
    if (s.kick) this.kick(this.p1);
    // P2: CPU o humano segun el modo
    if (this.p2.isCPU) this.updateAI(this.p2);
    else {
      const s2 = this.inputMgr.p2();
      this.p2.body.setVelocityX(s2.left?-SPD : s2.right?SPD : 0);
      if (s2.up && this.p2.body.blocked.down) this.jump(this.p2);
      if (s2.kick) this.kick(this.p2);
    }
    // clamp horizontal + PISO determinista (evita caer al vacio ante glitches de fisica)
    const restY = GROUND_Y - PH/2;
    for (const p of [this.p1,this.p2]){
      const r=p.displayWidth/2;
      if (p.x<r){ p.x=r; if(p.body.velocity.x<0)p.body.setVelocityX(0); }
      if (p.x>W-r){ p.x=W-r; if(p.body.velocity.x>0)p.body.setVelocityX(0); }
      // Tope de suelo con 2px de tolerancia: NO teletransporta en cada frame de
      // reposo (eso peleaba con el piso fisico y hacia parpadear blocked.down ->
      // el squash de aterrizaje se re-disparaba sin parar = la "vibracion").
      if (p.y>restY+2){ p.y=restY; if(p.body.velocity.y>0)p.body.setVelocityY(0); }
      if (p.inAir && p.body.blocked.down){                                        // aterrizaje: solo tras un salto real
        p.inAir=false;
        SFX.land();
        this.tweens.killTweensOf(p); p.setScale(p.baseS);                         // squash al caer
        this.tweens.add({targets:p, scaleX:p.baseS*1.12, scaleY:p.baseS*0.88, yoyo:true, duration:80});
      }
      if (p.jumpAnim && p.body.blocked.down && !p.anims.isPlaying) p.setFrame(0); // reposo al aterrizar
    }
    // estela: solo cuando el balon vuela rapido (patadas potentes)
    const bv=this.ball.body.velocity, bspd=Math.hypot(bv.x,bv.y);
    this.trailPts.push({x:this.ball.x, y:this.ball.y});
    if (this.trailPts.length>8) this.trailPts.shift();
    this.trail.clear();
    if (bspd>430){
      for(let i=1;i<this.trailPts.length;i++){
        const q=this.trailPts[i];
        this.trail.fillStyle(0xffe3ea, 0.04+0.045*i);
        this.trail.fillCircle(q.x, q.y, 24*(i/this.trailPts.length));
      }
    }
    // sombras: siguen en X y se achican/aclaran con la altura
    const srcs=[this.p1,this.p2,this.ball];
    for (let i=0;i<3;i++){
      const o=srcs[i], sh=this.shadows[i];
      const air=Phaser.Math.Clamp((GROUND_Y-(o.y+ (o===this.ball?0:o.displayHeight/2)))/320,0,1);
      sh.x=o.x; sh.setScale((o===this.ball?0.7:1)*(1-air*0.4)).setAlpha(0.3*(1-air*0.55));
    }
  }

  // ---- IA: decide objetivo cada cierto tiempo (reaccion), no en cada frame ----
  updateAI(p){
    const cfg=this.aiCfg, ai=p.ai, now=this.time.now, ball=this.ball;
    if (now >= ai.nextThink){
      ai.nextThink = now + cfg.react*Phaser.Math.FloatBetween(0.8,1.2);
      const predX = ball.x + ball.body.velocity.x*0.30;        // anticipa el balon
      const incoming = ball.x > W*0.46 || ball.body.velocity.x > 60; // viene a su lado
      if (Math.random() < cfg.miss){
        ai.targetX = p.x + Phaser.Math.Between(-30,30);          // duda / error humano
      } else if (incoming){
        ai.targetX = predX + 26;                                // se ubica detras del balon (patea a la izq)
      } else {
        ai.targetX = Phaser.Math.Linear(this.HOME2, predX, 0.25*ai.aggr); // recentra al area
      }
      ai.targetX += Phaser.Math.Between(-cfg.err, cfg.err);
      // nunca apunta dentro de los arcos: la cerca lo pararia y se quedaria empujando
      ai.targetX = Phaser.Math.Clamp(ai.targetX, GOAL_D+16+p.body.halfWidth, W-GOAL_D-16-p.body.halfWidth);
      if (Math.random() < 0.15) ai.aggr = Phaser.Math.FloatBetween(0.35,0.85); // varia por jugada
    }
    // movimiento continuo hacia el objetivo
    const dx = ai.targetX - p.x;
    p.body.setVelocityX(Math.abs(dx) > 14 ? Math.sign(dx)*cfg.speed : 0);
    // salto para cabecear balon alto, cercano y que baja
    const bdx = ball.x - p.x;
    if (Math.abs(bdx) < 130 && ball.y < p.y - PH*0.15 && ball.body.velocity.y > -50
        && p.body.blocked.down && now > ai.jumpCD && Math.random() < cfg.jump){
      this.jump(p); ai.jumpCD = now + 700;
    }
    // patear cuando esta al alcance
    if (Math.abs(bdx) < 120 && Math.abs(ball.y-(p.y-PH*0.18)) < 150) this.kick(p);
  }

  endMatch(){
    if (this.over) return; // puede llegar por timer y por goles a la vez
    this.over=true; if(this.timer)this.timer.remove();
    this.physics.world.timeScale=1;     // el slow-mo no se filtra fuera
    this.cameras.main.setZoom(1);
    SFX.whistle();                      // pitazo final
    emit('finale', false);
    emit('matchEnded', {sP:this.sP, sC:this.sC, twoP:this.twoP, mision:this.mision});
    this.scene.stop();
  }

  drawField(){
    this.add.image(0,0,'field').setOrigin(0).setDepth(-10);
  }
}
