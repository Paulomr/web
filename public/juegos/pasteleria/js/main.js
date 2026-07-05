/* Bootstrap: gameLoop con delta time, desbloqueo de audio al primer gesto y pausa automática. */

import * as E from './estado.js';
import * as ui from './ui.js';
import * as G from './guardado.js';
import { desbloquear } from './audio.js';

ui.init();

/* Audio SOLO tras el primer gesto del usuario */
document.addEventListener('pointerdown', desbloquear, { once: false });

/* Un solo gameLoop; los timers avanzan por dt y se congelan con la pausa.
   Al volver de una pestaña oculta, el delta grande se descarta (cap a 100ms). */
let ultimo = performance.now();
function loop(ts) {
  const dt = Math.min(ts - ultimo, 100);
  ultimo = ts;
  if (!document.hidden) {
    E.tick(dt);
    ui.frame(dt);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* Ocultar la pestaña pausa el juego */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    ultimo = performance.now();
    ui.abrirPausa();
  } else {
    ultimo = performance.now();
  }
});

/* Exponer módulos para depuración local (no afecta el juego) */
window.__pasteleria = { E, ui, G };
