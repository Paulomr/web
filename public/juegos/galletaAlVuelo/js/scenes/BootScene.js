/* =====================================================================
   Boot: carga el arte oficial de Bernie (PNG) y genera el resto de
   texturas por codigo. Si un PNG falla (offline/ruta rota) se genera un
   fallback procedural con la misma key (patron loaderror tolerado).
   ===================================================================== */
import { buildTextures, buildBearFallback } from '../textures/textures.js';

// solo las variantes usadas DENTRO del canvas (los menus DOM usan <img>)
const BERNIE_KEYS=['bernie-chef','bernie-comiendo','bernie-sorpresa',
                   'bernie-vampira','bernie-navidena'];

export class BootScene extends Phaser.Scene{
  constructor(){ super('Boot'); }
  preload(){
    this.load.on('loaderror',file=>{
      console.warn(`[galletaAlVuelo] No cargo ${file.key}; uso fallback procedural.`);
    });
    BERNIE_KEYS.forEach(k=>this.load.image(k,`assets/bernie/${k}.png`));
  }
  create(){
    buildTextures(this);
    BERNIE_KEYS.forEach(k=>buildBearFallback(this,k)); // no-op si el PNG cargo
    this.scene.start('Game',{ level:null });           // null = telon de fondo
  }
}
