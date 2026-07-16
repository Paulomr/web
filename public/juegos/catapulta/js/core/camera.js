/* Camara de juego: sigue al proyectil (con zoom-out sutil), vuelve a la
   honda al acabar el tiro, intro que ensena la estructura, screenshake y
   modo "vistazo" (zoom-out temporal para ver la estructura entera). */
import { W, H } from '../config.js';

// zoom: cuanto se aleja el vistazo. centerY: altura del mundo que queda en el
// centro de la vista (por encima del suelo, para que llene la torre y no la tierra).
export const PEEK = { zoom:0.7, centerY:330, ms:4000 };

export class GameCam{
  /* onPeek(bool) avisa de cada cambio del vistazo (incluido el corte por tiempo
     o por disparo), para que la UI pueda encender/apagar su boton. */
  constructor(scene, onPeek=()=>{}){
    this.s=scene; this.c=scene.cameras.main; this.onPeek=onPeek;
    this.c.centerOn(W/2,H/2);
    this.peeking=false; this.peekT=null;
  }
  intro(focusX){ // pan de presentacion: estructura -> honda
    this.c.pan(focusX,H/2,900,'Sine.easeInOut',false,(cam,p)=>{
      if(p===1) this.s.time.delayedCall(650,()=>this.c.pan(W/2,H/2,800,'Sine.easeInOut'));
    });
  }
  follow(go){
    this.c.startFollow(go,false,0.09,0.09);
    this.c.zoomTo(0.88,350,'Sine.easeOut');
  }
  backToSling(){
    this.c.stopFollow();
    this.c.zoomTo(1,450,'Sine.easeInOut');
    this.c.pan(W/2,H/2,650,'Sine.easeInOut');
  }
  shake(i){ this.c.shake(140,i); }

  /* Vistazo: aleja la camara y encuadra la estructura unos segundos. Se cancela
     solo, y tambien al disparar (endPeek desde la escena). */
  peek(focusX){
    if(this.peeking) { this.endPeek(); return; }
    this.peeking=true;
    this.c.stopFollow();
    this.c.zoomTo(PEEK.zoom,420,'Sine.easeInOut');
    this.c.pan(focusX,PEEK.centerY,420,'Sine.easeInOut');
    this.peekT=this.s.time.delayedCall(PEEK.ms,()=>this.endPeek());
    this.onPeek(true);
  }
  endPeek(){
    if(!this.peeking) return;
    this.peeking=false;
    if(this.peekT){ this.peekT.remove(); this.peekT=null; }
    this.backToSling();
    this.onPeek(false);
  }
}
