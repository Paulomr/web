/* Helpers DOM minimos compartidos por toda la UI. */
export function setText(id,v){ document.getElementById(id).textContent=v; }
export function show(id){ document.getElementById(id).classList.remove("hidden"); }
export function hide(id){ document.getElementById(id).classList.add("hidden"); }
export function hideAll(){ ["start","select","over","lbScreen","load","pause"].forEach(hide); }
export function esc(s){ return String(s).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c])); }
