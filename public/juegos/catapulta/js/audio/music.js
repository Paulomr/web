/* =====================================================================
   MUSICA de fondo (MP3 en loop, volumen bajo). El boton de mute vive en
   ui/menus.js y llama a setMuted; main.js llama a start() en el primer
   gesto (politica de autoplay). Si el <audio> no existe, no rompe nada.
   ===================================================================== */
export const MUSIC=(()=>{
  const el=document.getElementById('bgm');
  let VOL=0.32, on=true, started=false;
  if(el) el.volume=VOL;
  // silencio en pestana oculta; al volver retoma solo si no esta muteada
  document.addEventListener('visibilitychange',()=>{
    if(!el || !started) return;
    document.hidden ? el.pause() : (on && el.play().catch(()=>{}));
  });
  return {
    start(){ if(el && on && !started){ started=true; el.play().catch(()=>{}); } },
    setMuted(m){ on=!m; if(!el) return;
      on ? (started && el.play().catch(()=>{})) : el.pause(); },
    setVolume(v){ VOL=v; if(el) el.volume=v; },
  };
})();
