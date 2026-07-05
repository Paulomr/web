/* Camara de juego: sigue al proyectil (con zoom-out sutil), vuelve a la
   honda al acabar el tiro, intro que ensena la estructura, y screenshake. */
import { W, H } from '../config.js';

export class GameCam{
  constructor(scene){
    this.s=scene; this.c=scene.cameras.main;
    this.c.centerOn(W/2,H/2);
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
}
