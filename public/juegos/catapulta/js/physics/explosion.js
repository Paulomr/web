/* =====================================================================
   Campo radial reutilizable: impulso con decaimiento lineal + dano
   OPCIONAL a entidades. Pura fisica; los FX (particulas, shake, sonido)
   los pone quien llama.
     explode()   -> TNT/power-ups: impulso fuerte hacia arriba + dano radial.
     shockwave() -> onda de impacto: SOLO impulso (el dano ya lo aplico la
                    colision), local y con poco sesgo vertical -> vuelca las
                    piezas sin lanzarlas al cielo.
   ===================================================================== */
const M = Phaser.Physics.Matter.Matter;

function radialField(scene, x, y, { radius, power, upBias, damage }){
  for(const body of scene.matter.world.getAllBodies()){
    if(body.isStatic) continue;
    const dx=body.position.x-x, dy=body.position.y-y;
    const d=Math.hypot(dx,dy);
    if(d>radius) continue;
    const f=1-d/radius, n=Math.max(d,1);
    M.Sleeping.set(body,false); // despertar cuerpos dormidos para que reaccionen
    M.Body.applyForce(body, body.position, {
      x:(dx/n)*power*f*body.mass,
      y:((dy/n)-upBias)*power*f*body.mass, // upBias sube la onda: mas espectacular
    });
    if(damage){ const ent=body.entRef; if(ent && !ent.dead) ent.takeDamage(damage*f); }
  }
}

export function explode(scene, x, y, { radius=200, power=0.05, damage=200 }={}){
  radialField(scene, x, y, { radius, power, upBias:0.5, damage });
}

export function shockwave(scene, x, y, { radius=95, power=0.02, upBias=0.15 }={}){
  radialField(scene, x, y, { radius, power, upBias, damage:0 });
}
