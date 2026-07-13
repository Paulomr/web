/* =====================================================================
   UI de menus (capas DOM): seleccion de personaje, carga, pausa,
   fin de partido y navegacion. Recibe el juego via initUI(game).
   Escucha 'matchEnded' del Bus - nunca importa las escenas.
   ===================================================================== */
import { ASSETS } from '../assets.data.js';
import { TIPS } from '../config.js';
import { setText, show, hide, hideAll } from './dom.js';
import { maze, overBg } from './maze.js';
import { MUSIC } from '../audio/music.js';
import { SFX } from '../audio/sfx.js';
import { TOUCH } from '../core/input.js';
import { on } from '../core/events.js';
import { submitScore, renderLb } from './leaderboard.js';
import { MISIONES, misionActual, superarMision, todasSuperadas } from '../misiones.js';

let game=null, pickP=0, pickC=1, playerName="Jugador", inMatch=false;
let mode=1, choosing=1; // modo 1P/2P y a quien se asigna la proxima card
let misionEnCurso=null; // mision activa (null = partido libre)
let againTxt="";        // texto original del boton REPETIR

function pintarMisionInfo(){
  const el=document.getElementById("misionInfo"); if(!el) return;
  el.textContent = todasSuperadas()
    ? "★ VENCISTE TODAS LAS MISIONES DE BEARNIE ★"
    : `MISION ACTUAL: ${misionActual().n}/${MISIONES.length} — ${misionActual().nombre}`;
}

function paintSel(){
  const box=document.getElementById("cards");
  [...box.children].forEach((el,i)=>{
    el.classList.toggle("p1", i===pickP);
    el.classList.toggle("p2", mode===2 && i===pickC);
  });
  setText("chooseWho", mode===2 ? `ELIGIENDO: JUGADOR ${choosing}` : "");
}

export function buildCards(){
  const box=document.getElementById("cards"); box.innerHTML="";
  ASSETS.chars.forEach((c,i)=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`<img src="${c.src}" alt=""><span class="nm">${c.name}</span>`;
    d.onclick=()=>{
      if (mode===1){ pickP=i; pickC=(i+1)%ASSETS.chars.length; }
      else if (choosing===1){ pickP=i; choosing=2; }
      else { pickC=i; choosing=1; }
      paintSel();
    };
    box.appendChild(d);
  });
  paintSel();
}

function setMode(m){
  mode=m; choosing=1;
  document.getElementById("mode1").classList.toggle("sel", m===1);
  document.getElementById("mode2").classList.toggle("sel", m===2);
  if (m===1) pickC=(pickP+1)%ASSETS.chars.length; // CPU vuelve a autoderivarse
  paintSel();
}

let loadT=0; // timeout de la pantalla de carga: se limpia siempre (sin dobles arranques)
function showLoading(then){
  clearTimeout(loadT);
  setText("tip", TIPS[Math.floor(Math.random()*TIPS.length)]);
  const bar=document.querySelector("#load .bar i");
  bar.style.animation="none"; void bar.offsetWidth; bar.style.animation="fill 2.4s linear forwards";
  show("load"); loadT=setTimeout(then, 2400);
}

const clearTouch=()=>{ for(const k in TOUCH) TOUCH[k]=0; }; // suelta botones tactiles "pegados"

function startMatch(){
  hideAll(); overBg.stop(); maze.stop();
  hide("hud"); hide("pad"); hide("pauseBtn"); // REPETIR llegaba con el HUD flotando sobre la carga
  inMatch=false; clearTouch();
  game.scene.stop('Game'); // detiene el partido anterior YA: que no termine detras de la carga
  // En mision: el rival SIEMPRE es Bearnie y la dificultad la fija la mision.
  const m=misionEnCurso;
  const idxBearnie=ASSETS.chars.findIndex(c=>c.id==="bearnie");
  const extra=m?{dif:m.dif, mision:m.n}:{};
  const rival=m?idxBearnie:pickC;
  const yo=(m && pickP===idxBearnie)?0:pickP; // en mision no puedes SER Bearnie
  showLoading(()=>{
    hide("load");
    show("hud"); show("pad"); show("pauseBtn"); inMatch=true;
    game.scene.start('Game', {pickP:yo, pickC:rival, twoP:!m && mode===2, ...extra});
  });
  if(m) setText("tip", `MISION ${m.n}: ${m.nombre}`); // la carga anuncia la mision
}

// Pausa in-game: congela la escena (fisica, timer y tweens) sin cortar la musica
function togglePause(force){
  if(!inMatch) return;
  const toPause = force!==undefined ? force
    : document.getElementById("pause").classList.contains("hidden");
  if (toPause){ show("pause"); game.scene.pause('Game'); }
  else { hide("pause"); game.scene.resume('Game'); }
}

// Urgencia del finale: la escena avisa por el Bus, la UI toca el DOM
on('finale', e=>{
  document.getElementById("timer").classList.toggle("urgent", !!e.detail);
});

on('matchEnded', e=>{
  const {sP,sC,twoP,mision}=e.detail;
  hide("hud"); hide("pad"); hide("pauseBtn"); inMatch=false; clearTouch();
  showLoading(async()=>{
    hide("load");
    const win=sP>sC, tie=sP===sC;
    // Estrellas: ganar con valla en cero = 3; ganar = 2; empate = 1; perder = 0.
    const estrellasHS = win ? (sC===0 ? 3 : 2) : (tie ? 1 : 0);
    if (window.CrunchyScores && mision && estrellasHS>0) window.CrunchyScores.submit('head-soccer', 'm'+mision, estrellasHS, sP);
    const again=document.getElementById("again");
    if (mision){ // resultado del modo misiones (vs Bearnie malvada)
      const m=MISIONES[mision-1];
      setText("finalScore", `${playerName}  ${sP} - ${sC}  BEARNIE`);
      if (win){
        const sig=superarMision(mision);
        setText("result", mision===MISIONES.length?"¡VENCISTE A BEARNIE DEFINITIVA!":`¡MISION ${mision} SUPERADA!`);
        misionEnCurso=sig;                       // null si era la ultima
        again.textContent=sig?"SIGUIENTE MISION":againTxt;
      } else {
        setText("result", `BEARNIE TE VENCIO — ${m.nombre}`);
        again.textContent="REINTENTAR MISION";   // misionEnCurso sigue igual
      }
    } else if (twoP){ // en 2P el resultado nombra al ganador (no "ganaste/perdiste" ambiguo)
      setText("result", tie?"EMPATE":win?"¡GANA JUGADOR 1!":"¡GANA JUGADOR 2!");
      setText("finalScore", `JUGADOR 1  ${sP} - ${sC}  JUGADOR 2`);
      again.textContent=againTxt;
    } else {
      setText("result", tie?"EMPATE":win?"¡GANASTE!":"PERDISTE");
      setText("finalScore", `${playerName}  ${sP} - ${sC}  CPU`);
      again.textContent=againTxt;
    }
    show("over"); overBg.start();
    // Estrellas en pantalla (no aplican en 2 jugadores).
    const hsWrap=document.getElementById('hsStars');
    if (hsWrap){
      if (twoP){ hsWrap.style.display='none'; }
      else {
        hsWrap.style.display='flex';
        hsWrap.querySelectorAll('.hsStar').forEach((s,i)=>{ s.classList.remove('on'); if(i<estrellasHS) setTimeout(()=>s.classList.add('on'),250+i*280); });
      }
    }
    if (!twoP && !mision) await submitScore(playerName, win?1:0); // el ranking mide victorias contra la CPU
    renderLb("lbList");
  });
});

export function initUI(g){
  game=g;
  buildCards();
  document.getElementById("mode1").onclick=()=>setMode(1);
  document.getElementById("mode2").onclick=()=>setMode(2);

  // Botones tactiles -> flags (alimentan InputManager)
  document.querySelectorAll(".key").forEach(b=>{
    const k=b.dataset.k;
    const on=e=>{e.preventDefault();TOUCH[k]=1;b.classList.add("on");};
    const off=e=>{e.preventDefault();TOUCH[k]=0;b.classList.remove("on");};
    b.addEventListener("touchstart",on,{passive:false});b.addEventListener("touchend",off);
    b.addEventListener("touchcancel",off);
    b.addEventListener("mousedown",on);b.addEventListener("mouseup",off);b.addEventListener("mouseleave",off);
    b.addEventListener("contextmenu",e=>e.preventDefault()); // sin menu contextual al mantener pulsado
  });

  // Navegacion de menus (sin teclado global -> el input de nombre escribe libre)
  const nameEl=document.getElementById("name");
  try{ nameEl.value = localStorage.getItem("bs_name") || ""; }catch(e){} // recuerda el ultimo nombre
  document.getElementById("goSelect").onclick=()=>{
    playerName=(nameEl.value.trim()||"Jugador");
    try{ localStorage.setItem("bs_name", playerName); }catch(e){}
    hide("start"); maze.stop(); show("select");
  };
  nameEl.addEventListener("keydown",e=>{ if(e.key==="Enter") document.getElementById("goSelect").click(); });
  document.getElementById("startMatch").onclick=()=>{ misionEnCurso=null; startMatch(); };
  document.getElementById("again").onclick=()=>{
    if (misionEnCurso===null && document.getElementById("again").textContent!==againTxt){
      // gano la ultima mision: REPETIR vuelve al flujo libre
      document.getElementById("again").textContent=againTxt;
    }
    startMatch();
  };
  againTxt=document.getElementById("again").textContent;
  // MISIONES: arranca (o continua) la campana contra Bearnie con el nombre puesto.
  document.getElementById("goMision").onclick=()=>{
    playerName=(nameEl.value.trim()||"Jugador");
    try{ localStorage.setItem("bs_name", playerName); }catch(e){}
    misionEnCurso=misionActual();
    startMatch();
  };
  pintarMisionInfo();
  document.getElementById("menu").onclick=()=>{hide("over");overBg.stop();show("start");maze.start();misionEnCurso=null;document.getElementById("again").textContent=againTxt;pintarMisionInfo();};
  document.getElementById("seeLb").onclick=async()=>{hide("start");maze.stop();show("lbScreen");await renderLb("lbList2");};
  document.getElementById("lbBack").onclick=()=>{hide("lbScreen");show("start");maze.start();};

  // Pausa
  document.getElementById("pauseBtn").onclick=()=>togglePause();
  document.getElementById("resume").onclick=()=>togglePause(false);
  document.getElementById("replay").onclick=()=>{ togglePause(false); startMatch(); };
  document.getElementById("toMenu").onclick=()=>{
    hide("pause"); game.scene.stop('Game');
    hide("hud"); hide("pad"); hide("pauseBtn"); inMatch=false; clearTouch();
    show("start"); maze.start();
  };
  window.addEventListener("keydown",e=>{ if(e.key==="Escape") togglePause(); });
  document.getElementById("volMusic").oninput=e=>MUSIC.setVolume(e.target.value/100);
  document.getElementById("volSfx").oninput=e=>SFX.setVolume(e.target.value/100);

  maze.start();
}
