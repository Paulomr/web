/* =====================================================================
   MUSICA de fondo (MP3 en loop, volumen bajo, mute y ducking en gol)
   ===================================================================== */
export const MUSIC=(()=>{
  const el=document.getElementById("bgm"), btn=document.getElementById("mute");
  let VOL=0.3, on=true, started=false, duckT=0;
  el.volume=VOL;
  const icon=()=>btn.textContent = on ? "\u{1F50A}" : "\u{1F507}";
  btn.onclick=()=>{ on=!on; icon(); if(on) el.play().then(()=>{ started=true; }).catch(()=>{}); else el.pause(); };
  icon();
  // Intento inmediato: si el navegador lo permite, suena desde la primera pagina
  el.play().then(()=>{ started=true; }).catch(()=>{});
  return {
    start(){ if(on && !started) el.play().then(()=>{ started=true; }).catch(()=>{}); }, // started solo si sono de verdad
    setVolume(v){ VOL=v; el.volume=v; },
    duck(){ if(!on) return; el.volume=Math.min(0.08,VOL); clearTimeout(duckT);
      duckT=setTimeout(()=>{ el.volume=VOL; },1400); }
  };
})();
