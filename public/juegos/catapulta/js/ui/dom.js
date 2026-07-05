/* Helpers DOM minimos compartidos por toda la UI. */
export function el(id){ return document.getElementById(id); }
export function setText(id,v){ el(id).textContent=v; }
export function show(id){ el(id).classList.remove('hidden'); }
export function hide(id){ el(id).classList.add('hidden'); }
export function hideAll(){ ['start','select','win','lose','pause','hud'].forEach(hide); }
