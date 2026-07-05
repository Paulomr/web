/* La galleta: cuerpo Matter circular con sprite procedural. */
import { COOKIE } from '../config.js';

export function makeCookie(scene,{x,y}){
  const go=scene.matter.add.image(x,y,'cookie');
  go.setCircle(COOKIE.r);
  go.setDensity(COOKIE.density);
  go.setFrictionAir(COOKIE.frictionAir);
  go.setBounce(0.25);
  go.setDepth(10);
  go.body.label='cookie';
  go.bubbled=false;          // dentro de una burbuja (flota)
  return go;
}
