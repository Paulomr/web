/* =====================================================================
   Bus de eventos: puente desacoplado entre el juego (Phaser) y la UI (DOM).
   Emisor: GameScene. Oyente: ui/menus.js.
   ===================================================================== */
export const Bus = new EventTarget();

export function emit(name, detail){ Bus.dispatchEvent(new CustomEvent(name,{detail})); }
export function on(name, fn){ Bus.addEventListener(name, fn); }
