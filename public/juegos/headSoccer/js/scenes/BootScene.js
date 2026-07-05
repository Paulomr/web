/* =====================================================================
   BOOT - precarga de sprites (base64 + sheet de mantequilla) y
   generacion de texturas por codigo. "Game" arranca bajo demanda.
   ===================================================================== */
import { ASSETS } from '../assets.data.js';
import { BUTTER } from '../config.js';
import { makeBallTexture, makeFieldTexture, makeNetTexture, makeShadowTexture, makeConfettiTexture } from '../textures/textures.js';
import { buildCards } from '../ui/menus.js';

export class BootScene extends Phaser.Scene {
  constructor(){ super('Boot'); }
  preload(){
    for (const c of ASSETS.chars) this.load.image(c.id, c.src);
    // Tolerante a fallo: si el sheet aun no existe, el juego sigue sin la mantequilla.
    this.load.spritesheet(BUTTER.id, BUTTER.sheet, {frameWidth:BUTTER.fw, frameHeight:BUTTER.fh});
    this.load.on('loaderror', ()=>{});
  }
  create(){
    makeBallTexture(this);
    makeFieldTexture(this);
    makeNetTexture(this);
    makeShadowTexture(this);
    makeConfettiTexture(this);
    if (this.textures.exists(BUTTER.id)){
      this.anims.create({key:BUTTER.id+'_jump', repeat:0, frameRate:BUTTER.rate,
        frames:this.anims.generateFrameNumbers(BUTTER.id,{end:BUTTER.frames})});
      ASSETS.chars.push({id:BUTTER.id, name:BUTTER.name, src:BUTTER.sheet});
      buildCards();
    }
  }
}
