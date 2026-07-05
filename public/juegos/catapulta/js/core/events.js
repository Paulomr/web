/* =====================================================================
   Bus de eventos: puente desacoplado entre el juego (Phaser) y la UI (DOM).
   Juego -> UI: game:hud, game:win, game:lose
   UI -> Juego: ui:play {level}, ui:menu (los escucha main.js)
   ===================================================================== */
export const Bus = new EventTarget();

export function emit(name, detail){ Bus.dispatchEvent(new CustomEvent(name,{detail})); }
export function on(name, fn){ Bus.addEventListener(name, fn); }
