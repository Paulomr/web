/* =====================================================================
   Bernie la osa (arte oficial Crunchy Munch, PNGs en assets/bernie/).
   La "boca" es la zona de comer: un punto relativo a la cara del sprite
   que GameScene usa como sensor de victoria. Ilustraciones completas:
   se animan con tweens (bob/squash), nunca por frames.
   ===================================================================== */
import { REDUCED } from '../config.js';

// offsets de boca como fraccion del tamano mostrado (medidos del arte)
const SKINS={
  chef:     { tex:'bernie-chef',     w:255, mouth:{ fx:-0.01, fy:-0.085 } },
  vampira:  { tex:'bernie-vampira',  w:250, mouth:{ fx: 0.03, fy:-0.075 } },
  navidena: { tex:'bernie-navidena', w:250, mouth:{ fx: 0.03, fy:-0.075 } },
};

export class Bear{
  constructor(scene,{x,y},skinName){
    this.scene=scene;
    this.skin=SKINS[skinName]||SKINS.chef;
    const img=scene.add.image(x,y,this.skin.tex).setDepth(6);
    img.setScale(this.skin.w/img.width);
    this.go=img;
    this.baseY=y;
    this.state='idle';
    // repisa pastel bajo los pies
    this.shelf=scene.add.image(x,y+img.displayHeight/2+6,'shelf').setDepth(5);
    // bob decorativo (respiracion)
    if(!REDUCED){
      this.bob=scene.tweens.add({ targets:img, y:y-6, duration:1500,
        yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    }
    this.excited=false;
  }

  get mouth(){
    const { fx, fy }=this.skin.mouth;
    return { x:this.go.x+this.go.displayWidth*fx,
             y:this.go.y+this.go.displayHeight*fy };
  }

  // la galleta se acerca: Bernie se emociona (leve zoom + inclinacion)
  setExcited(on){
    if(this.excited===on || this.state!=='idle') return;
    this.excited=on;
    const base=this.skin.w/this.go.width;
    this.scene.tweens.add({ targets:this.go,
      scale:on?base*1.06:base, angle:on?-4:0, duration:180 });
  }

  // NAM: swap chef -> comiendo con squash
  eat(){
    if(this.state!=='idle') return;
    this.state='eating';
    if(this.bob) this.bob.stop();
    const go=this.go, w=go.displayWidth;
    go.setTexture('bernie-comiendo');
    go.setScale(w/go.width);                    // conserva el ancho en pantalla
    go.setAngle(0); go.y=this.baseY;
    const s=go.scaleX;
    this.scene.tweens.add({ targets:go, scaleX:s*1.12, scaleY:s*0.86,
      duration:110, yoyo:true, repeat:2, ease:'Sine.easeInOut' });
  }

  // la galleta cayo fuera: sorpresa + sacudida
  sad(){
    if(this.state==='eating') return;
    this.state='sad';
    if(this.bob) this.bob.stop();
    const go=this.go, w=go.displayWidth;
    go.setTexture('bernie-sorpresa');
    go.setScale(w/go.width);
    go.setAngle(0); go.y=this.baseY;
    if(!REDUCED) this.scene.tweens.add({ targets:go, x:go.x+6, duration:70,
      yoyo:true, repeat:3 });
  }
}
