/* =====================================================================
   BOOTSTRAP: crea Phaser (Matter), conecta UI, musica y desbloqueo de
   audio. Aqui (y solo aqui) se traducen eventos ui:* a operaciones de
   escena, para no registrar listeners duplicados dentro de la escena.
   ===================================================================== */
import { W, H, GRAVITY_Y } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { initUI } from './ui/menus.js';
import { SFX } from './audio/sfx.js';
import { MUSIC } from './audio/music.js';
import { on } from './core/events.js';

window.addEventListener('pointerdown',()=>{ SFX.unlock(); MUSIC.start(); },{ once:true });

const game=new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  width: W, height: H,
  scale: { mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH },
  render: { roundPixels:true, powerPreference:'high-performance' },
  physics: { default:'matter', matter:{ gravity:{y:GRAVITY_Y}, enableSleeping:true, debug:false } },
  scene: [BootScene, GameScene],
});

window.__game=game; // hook de debug (consola)

const gs=()=>game.scene.getScene('Game');
// resume antes de restart: un restart sobre escena pausada se queda congelado
on('ui:play',  e=>{ gs().scene.resume(); gs().scene.restart({ level:e.detail.level }); });
on('ui:menu',  ()=>{ gs().scene.resume(); gs().scene.restart({ level:null }); });
on('ui:pause', ()=>gs().scene.pause());
on('ui:resume',()=>gs().scene.resume());
on('ui:peek',  ()=>gs().togglePeek());

initUI();
