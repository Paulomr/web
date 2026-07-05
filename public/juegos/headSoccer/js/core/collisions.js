/* =====================================================================
   CollisionManager - separa CONFIGURACION (que choca con que + handler)
   de la DETECCION (motor Arcade) y de la RESPUESTA (los handlers).
   Agregar una colision nueva = una linea .add(...). Sin duplicar codigo.
   ===================================================================== */
export class CollisionManager {
  constructor(scene){ this.scene=scene; this.rules=[]; }
  // overlap=false -> collider (resuelve fisica). overlap=true -> deteccion sin empuje.
  add(a, b, handler=null, overlap=false){ this.rules.push({a,b,handler,overlap}); return this; }
  build(){
    const ph = this.scene.physics.add;
    for (const r of this.rules){
      if (r.overlap) ph.overlap(r.a, r.b, r.handler, null, this.scene);
      else           ph.collider(r.a, r.b, r.handler, null, this.scene);
    }
  }
}
