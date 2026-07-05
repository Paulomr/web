/* =====================================================================
   SFX 8-bits (Web Audio API, cero archivos externos)
   Graves y suaves: ondas triangle/sine + envolvente con ataque (sin
   clicks asperos) + master gain -> no cansa al oido.
   ===================================================================== */
export const SFX=(()=>{
  let ctx=null, master=null;
  function ac(){
    if(!ctx){
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain(); master.gain.value=0.6; master.connect(ctx.destination);
    }
    if(ctx.state==="suspended") ctx.resume();
    return ctx;
  }
  function tone(type,f0,f1,dur,vol){
    const a=ac(), o=a.createOscillator(), g=a.createGain(), t=a.currentTime;
    o.type=type;
    o.frequency.setValueAtTime(f0,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+0.02);       // ataque suave
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);     // release
    o.connect(g).connect(master); o.start(t); o.stop(t+dur+0.02);
  }
  function cheer(){ // rugido de tribuna: rafaga de ruido filtrado (sin archivos)
    const a=ac(), dur=1.7, n=(a.sampleRate*dur)|0, buf=a.createBuffer(1,n,a.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<n;i++){ const t=i/n; d[i]=(Math.random()*2-1)*(t<0.12?t/0.12:1-(t-0.12)/0.88); }
    const src=a.createBufferSource(); src.buffer=buf;
    const f=a.createBiquadFilter(); f.type="bandpass"; f.Q.value=0.6;
    const t0=a.currentTime;
    f.frequency.setValueAtTime(700,t0);
    f.frequency.linearRampToValueAtTime(1400,t0+0.35);   // sube (ooooh!)
    f.frequency.linearRampToValueAtTime(800,t0+dur);     // cae
    const g=a.createGain(); g.gain.value=0.5;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  return {
    unlock(){ ac(); },
    setVolume(v){ ac(); master.gain.value=v; },
    jump(){ tone("triangle",170,320,0.12,0.16) },
    land(){ tone("sine",120,50,0.10,0.18) },
    kick(){ tone("triangle",280,90,0.10,0.20) },
    goal(){ [196,247,294,392].forEach((f,i)=>setTimeout(()=>tone("triangle",f,f,0.16,0.15),i*100)) }, // arpegio grave Sol-Si-Re-Sol
    sad(){ [392,311,262].forEach((f,i)=>setTimeout(()=>tone("triangle",f,f*0.94,0.20,0.15),i*150)) }, // gol en contra: bajada triste
    whistle(){ tone("triangle",1750,2100,0.15,0.09); setTimeout(()=>tone("triangle",1750,2250,0.38,0.09),200); }, // pitazo final
    cheer
  };
})();
