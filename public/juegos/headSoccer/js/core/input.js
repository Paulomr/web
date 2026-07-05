/* =====================================================================
   InputManager - dos sets de teclas independientes:
     P1: W salto / A izq / D der / S o SPACE patada (+ tactil).
     P2: flechas izq/der, ARRIBA salto, ABAJO patada.
   En modo 1 jugador, P1 tambien acepta las flechas (flujo clasico).
   Se ignora todo si el foco esta en un <input> (escribir nombre libre).
   ===================================================================== */
export const TOUCH = {left:0,right:0,up:0,kick:0};

const IDLE = {left:0,right:0,up:0,kick:0};

export class InputManager {
  constructor(scene){
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.k1 = scene.input.keyboard.addKeys({left:KC.A, right:KC.D, up:KC.W, kick:KC.S, kick2:KC.SPACE});
    this.k2 = scene.input.keyboard.addKeys({left:KC.LEFT, right:KC.RIGHT, up:KC.UP, kick:KC.DOWN});
    // Capturamos SOLO teclas de juego no-textuales (evita scroll de pagina).
    scene.input.keyboard.addCapture([KC.LEFT,KC.RIGHT,KC.UP,KC.DOWN,KC.SPACE]);
    // Al cerrar la escena liberamos capturas (no bloquear teclado del menu).
    scene.events.once('shutdown', ()=>scene.input.keyboard.clearCaptures());
  }
  typing(){ return document.activeElement && document.activeElement.tagName === 'INPUT'; }
  p1(solo){ // solo=true (1P): fusiona flechas y tactil como siempre
    if (this.typing()) return IDLE;
    const a=this.k1, b=this.k2;
    return {
      left:  a.left.isDown  || (solo&&b.left.isDown)  || TOUCH.left,
      right: a.right.isDown || (solo&&b.right.isDown) || TOUCH.right,
      up:    a.up.isDown    || (solo&&b.up.isDown)    || TOUCH.up,
      kick:  a.kick.isDown  || a.kick2.isDown || (solo&&b.kick.isDown) || TOUCH.kick
    };
  }
  p2(){ // humano en modo 2P: flechas puras, sin tactil
    if (this.typing()) return IDLE;
    const b=this.k2;
    return {left:b.left.isDown, right:b.right.isDown, up:b.up.isDown, kick:b.kick.isDown};
  }
}
