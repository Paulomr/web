/* =====================================================================
   SFX 8-bits sintetizados (Web Audio, cero archivos).
   tone(): osc con envolvente suave. noise(): rafaga filtrada.
   ===================================================================== */
export const SFX=(()=>{
  let ctx=null, master=null, muted=false, lastStretch=0;
  function ac(){
    if(!ctx){
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain(); master.gain.value=muted?0:0.5; master.connect(ctx.destination);
    }
    if(ctx.state==="suspended") ctx.resume().catch(()=>{});
    return ctx;
  }
  function tone(type,f0,f1,dur,vol,delay=0){
    const a=ac(), o=a.createOscillator(), g=a.createGain(), t=a.currentTime+delay;
    o.type=type;
    o.frequency.setValueAtTime(f0,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(master); o.start(t); o.stop(t+dur+0.02);
  }
  function noise(dur,f0,f1,vol,type="bandpass",q=0.8){
    const a=ac(), n=(a.sampleRate*dur)|0, buf=a.createBuffer(1,n,a.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<n;i++){ const t=i/n; d[i]=(Math.random()*2-1)*(1-t); }
    const src=a.createBufferSource(); src.buffer=buf;
    const f=a.createBiquadFilter(); f.type=type; f.Q.value=q;
    const t0=a.currentTime;
    f.frequency.setValueAtTime(f0,t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    const g=a.createGain(); g.gain.value=vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  return {
    unlock(){ ac(); },
    // no fuerza crear el AudioContext antes del primer gesto (autoplay policy):
    // si aun no existe, ac() aplicara el estado muted al crearlo
    setMuted(m){ muted=m; if(master) master.gain.value=m?0:0.5; },
    isMuted(){ return muted; },
    click(){ tone("square",600,300,0.06,0.08); },
    stretch(r){ // crujido de banda mientras se estira (throttled)
      const now=performance.now(); if(now-lastStretch<95) return; lastStretch=now;
      tone("square",110+r*200,90+r*160,0.05,0.045);
    },
    launch(){ noise(0.22,500,2200,0.25,"highpass"); tone("triangle",240,820,0.16,0.14); },
    hit(mat){
      if(mat==="wood") tone("triangle",170,60,0.1,0.2);
      else if(mat==="stone"){ tone("sine",85,38,0.13,0.26); tone("square",240,90,0.04,0.08); }
      else if(mat==="ice") tone("square",1000,1500,0.07,0.09);
      else if(mat==="pig") tone("triangle",520,190,0.11,0.14);
    },
    breakMat(mat){
      if(mat==="ice"){ tone("square",1300,2400,0.09,0.1); tone("square",900,1800,0.09,0.08,0.05); }
      else if(mat==="stone") noise(0.28,300,70,0.4,"lowpass");
      else noise(0.2,900,250,0.35); // crack madera
    },
    pig(){ tone("triangle",600,140,0.22,0.2); tone("square",300,80,0.12,0.1,0.08); },
    explosion(){ noise(0.6,400,50,0.85,"lowpass"); tone("sine",110,28,0.55,0.5); },
    win(){ [392,494,587,784].forEach((f,i)=>tone("triangle",f,f,0.16,0.16,i*0.11)); },
    star(i){ tone("triangle",660+i*160,880+i*160,0.12,0.14); }, // ding por estrella

    lose(){ [330,262,208,165].forEach((f,i)=>tone("triangle",f,f*0.9,0.2,0.14,i*0.14)); },
  };
})();
