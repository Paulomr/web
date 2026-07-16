/* =====================================================================
   La fila de osos que esperan turno detrás de la honda. Son el contador de
   tiros restantes: cuántos osos ves en el suelo = cuántos tiros te quedan.
   Están ansiosos por salir disparados, así que dan saltitos.
   ===================================================================== */
import { SLING, GROUND_Y } from '../config.js';

const X0 = SLING.x - 74;   // el primero, justo detrás de la horquilla
const SEP_MAX = 40;        // separación entre osos cuando caben holgados
const BORDE = 26;          // margen mínimo hasta el canto izquierdo de la pantalla
const ESC = 0.7;

export class BearQueue{
  constructor(scene){
    this.s=scene;
    this.osos=[];   // {go, sombra, tw}
    this.n=-1;
    this.sep=SEP_MAX;
  }

  /** Deja exactamente n osos esperando (recicla los que ya están). */
  sync(n){
    n=Math.max(0,n);
    if(n===this.n) return;
    // Con muchos tiros la fila se aprieta para no salirse por la izquierda
    // (con 6 esperando y separación fija, el último caía fuera de pantalla).
    const sep=n>1 ? Math.min(SEP_MAX,(X0-BORDE)/(n-1)) : SEP_MAX;
    if(sep!==this.sep){ this.sep=sep; this.destroy(); } // recolocar de cero
    while(this.osos.length>n) this.quitar();
    while(this.osos.length<n) this.anadir(this.osos.length);
    this.n=n;
  }

  anadir(i){
    const x=X0-i*this.sep, y=GROUND_Y-15;
    const sombra=this.s.add.ellipse(x,GROUND_Y-3,30,8,0x000000,0.22).setDepth(3);
    const go=this.s.add.image(x,y,'ball').setScale(ESC).setDepth(3.5);
    // Saltito nervioso: cada oso a su propio ritmo (delay por posición) para que
    // la fila no salte a la vez como un coro.
    const tw=this.s.tweens.add({
      targets:go, y:y-11, duration:300+i*22, delay:i*130,
      yoyo:true, repeat:-1, hold:60+i*40, repeatDelay:120+i*70, ease:'Quad.easeOut',
    });
    // la sombra se encoge cuando el oso está arriba: vende el salto
    const tws=this.s.tweens.add({
      targets:sombra, scaleX:0.62, scaleY:0.62, alpha:0.12, duration:300+i*22,
      delay:i*130, yoyo:true, repeat:-1, hold:60+i*40, repeatDelay:120+i*70, ease:'Quad.easeOut',
    });
    this.osos.push({ go, sombra, tw, tws });
  }

  quitar(){
    const o=this.osos.pop();
    if(!o) return;
    o.tw.remove(); o.tws.remove();
    // el que se va salta a la honda: pequeño salto de ilusión antes de esfumarse
    this.s.tweens.add({ targets:o.go, y:o.go.y-26, alpha:0, scale:ESC*1.25,
      duration:260, ease:'Quad.easeOut', onComplete:()=>o.go.destroy() });
    this.s.tweens.add({ targets:o.sombra, alpha:0, duration:200,
      onComplete:()=>o.sombra.destroy() });
  }

  destroy(){
    for(const o of this.osos){ o.tw.remove(); o.tws.remove(); o.go.destroy(); o.sombra.destroy(); }
    this.osos.length=0; this.n=-1;
  }
}
