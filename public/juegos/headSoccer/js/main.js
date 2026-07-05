/* =====================================================================
   BOOTSTRAP - crea el juego Phaser (Boot+Game), conecta la UI y el
   desbloqueo de audio. Phaser llega como global desde el CDN.
   ===================================================================== */
import { W, H } from './config.js';
import { ASSETS } from './assets.data.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { SFX } from './audio/sfx.js';
import { MUSIC } from './audio/music.js';
import { initUI } from './ui/menus.js';

// Desbloqueo de audio en el primer gesto (politica de autoplay del navegador)
const audioUnlock=()=>{ SFX.unlock(); MUSIC.start(); };
window.addEventListener("pointerdown",audioUnlock,{once:true});
window.addEventListener("keydown",audioUnlock,{once:true});

(async()=>{
  document.getElementById("bike").src = ASSETS.bike;
  try{ await document.fonts.load('16px Boldone'); await document.fonts.ready; }catch(e){}
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'stage',
    width: W, height: H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { roundPixels:true, powerPreference:'high-performance' },
    // fps:120 = doble de pasos de simulacion: el balon rapido ya no atraviesa palos finos
    physics: { default:'arcade', arcade:{ gravity:{y:1500}, fps:120, debug:false } },
    scene: [BootScene, GameScene]
  });
  window.__hs = game; // TEMP: instrumentacion de pruebas (quitar)
  initUI(game);
})();
