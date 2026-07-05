/* =====================================================================
   SFX 8-bits sintetizados (Web Audio, cero archivos).
   tone(): osc con envolvente suave. noise(): rafaga filtrada.
   ===================================================================== */
export const SFX=(()=>{
  let ctx=null, master=null, muted=false, vol=0.5;
  function ac(){
    if(!ctx){
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain(); master.gain.value=muted?0:vol; master.connect(ctx.destination);
    }
    if(ctx.state==="suspended") ctx.resume().catch(()=>{});
    return ctx;
  }
  function tone(type,f0,f1,dur,v,delay=0){
    const a=ac(), o=a.createOscillator(), g=a.createGain(), t=a.currentTime+delay;
    o.type=type;
    o.frequency.setValueAtTime(f0,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(v,t+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(master); o.start(t); o.stop(t+dur+0.02);
  }
  function noise(dur,f0,f1,v,type="bandpass",q=0.8){
    const a=ac(), n=(a.sampleRate*dur)|0, buf=a.createBuffer(1,n,a.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<n;i++){ const t=i/n; d[i]=(Math.random()*2-1)*(1-t); }
    const src=a.createBufferSource(); src.buffer=buf;
    const f=a.createBiquadFilter(); f.type=type; f.Q.value=q;
    const t0=a.currentTime;
    f.frequency.setValueAtTime(f0,t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    const g=a.createGain(); g.gain.value=v;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  const apply=()=>{ if(master) master.gain.value=muted?0:vol; };
  return {
    unlock(){ ac(); },
    setMuted(m){ muted=m; apply(); },
    isMuted(){ return muted; },
    setVolume(v){ vol=Math.max(0,Math.min(1,v)); apply(); },
    getVolume(){ return vol; },
    click(){ tone("square",600,300,0.06,0.08); },
    snip(){ // corte de cuerda: latigazo agudo + chasquido
      noise(0.09,2600,900,0.3,"highpass");
      tone("square",1400,300,0.07,0.12);
    },
    chip(){ tone("triangle",980,1560,0.11,0.16); tone("triangle",1560,1960,0.09,0.1,0.07); },
    pop(){ tone("square",300,90,0.08,0.2); noise(0.06,1200,300,0.22,"bandpass",1.4); },
    puff(){ noise(0.22,600,180,0.3,"lowpass"); },
    catchBubble(){ tone("sine",300,620,0.14,0.12); },
    nom(){ // mordisco: crunch + ronroneo grave
      noise(0.12,900,220,0.4,"lowpass");
      tone("triangle",220,90,0.16,0.2,0.05);
      noise(0.1,700,180,0.3,"lowpass",0.9);
    },
    win(){ [392,494,587,784].forEach((f,i)=>tone("triangle",f,f,0.16,0.16,i*0.11)); },
    star(i){ tone("triangle",660+i*160,880+i*160,0.12,0.14); },
    lose(){ [330,262,208,165].forEach((f,i)=>tone("triangle",f,f*0.9,0.2,0.14,i*0.14)); },
  };
})();
