/* =====================================================================
   Fondo animado retro (Canvas 2D puro). Repintado COMPLETO cada frame
   (sin estela acumulativa = sin rayas). Degradado rosa->azul + sol.
   Factory: una instancia por pantalla (menu y fin de partido), misma
   logica sin duplicar. Solo anima con su pantalla visible (start/stop).
   ===================================================================== */
function createBg(canvasId){
  const cv=document.getElementById(canvasId), c=cv.getContext("2d");
  let t=0, raf=0;
  function fit(){ // resolucion interna limitada: nitidez suficiente, 60 FPS en movil
    const k=Math.min(1, 900/(cv.clientWidth||1));
    cv.width=(cv.clientWidth||1)*k; cv.height=(cv.clientHeight||1)*k;
  }
  function d(){
    const W2=cv.width, H2=cv.height;
    const bg=c.createLinearGradient(0,0,0,H2);            // rosa arriba -> azul cielo abajo
    bg.addColorStop(0,"#ffd6e0"); bg.addColorStop(.55,"#ffeef2"); bg.addColorStop(1,"#a8e0f5");
    c.fillStyle=bg; c.fillRect(0,0,W2,H2);
    const sx=W2*0.5, sy=H2*0.15, sr=Math.min(W2,H2)*0.09; // sol + resplandor pulsante
    const halo=c.createRadialGradient(sx,sy,sr*0.4,sx,sy,sr*4);
    halo.addColorStop(0,"rgba(255,240,180,.9)"); halo.addColorStop(.4,"rgba(255,214,150,.35)");
    halo.addColorStop(1,"rgba(255,214,150,0)");
    c.fillStyle=halo; c.fillRect(sx-sr*4,sy-sr*4,sr*8,sr*8);
    c.fillStyle="#ffdf70"; c.beginPath(); c.arc(sx,sy,sr*(1+Math.sin(t*2)*0.04),0,7); c.fill();
    c.fillStyle="rgba(255,255,255,.75)"; c.beginPath(); c.arc(sx-sr*0.25,sy-sr*0.3,sr*0.35,0,7); c.fill();
    const s=Math.min(W2,H2)/8, y0=H2*0.74;                // oleaje de rombos rosas abajo
    for(let x=-s;x<W2+s;x+=s)for(let r=0;r<3;r++){
      const yy=y0+r*s*0.34, f=s*0.5*Math.abs(Math.sin((x/s)*0.7+r+t));
      c.beginPath();
      c.moveTo(x,yy); c.lineTo(x+s/2,yy-s/4-f*0.4); c.lineTo(x+s,yy); c.lineTo(x+s/2,yy+s/4);
      c.closePath();
      c.fillStyle=r%2?"rgba(255,214,224,.7)":"rgba(246,165,176,.6)"; c.fill();
      c.strokeStyle="rgba(255,255,255,.6)"; c.stroke();
    }
    t+=.03; raf=requestAnimationFrame(d);
  }
  window.addEventListener("resize",()=>{ if(raf) fit(); });
  return {
    start(){ if(raf) return; fit(); raf=requestAnimationFrame(d); },
    stop(){ cancelAnimationFrame(raf); raf=0; }
  };
}

export const maze   = createBg("maze");   // menu inicial
export const overBg = createBg("maze2");  // fin de partido
