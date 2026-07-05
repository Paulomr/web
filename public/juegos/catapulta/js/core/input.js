/* Drag de honda: pointer -> grab/aim/release. Los listeners viven en el
   InputPlugin de la escena (se limpian solos al reiniciarla). */
export function setupSlingInput(scene, sling){
  scene.input.on('pointerdown', p=>{
    if(!scene.over && sling.canGrab(p.worldX,p.worldY)) sling.grab();
  });
  scene.input.on('pointermove', p=>{ if(p.isDown) sling.aim(p.worldX,p.worldY); });
  scene.input.on('pointerup', ()=>sling.release());
  // soltar fuera del canvas tambien dispara: sin esto la honda queda
  // atascada en 'aiming' si el puntero sale de la ventana antes de soltar
  scene.input.on('pointerupoutside', ()=>sling.release());
}
