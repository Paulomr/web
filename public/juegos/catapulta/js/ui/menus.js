/* =====================================================================
   UI DOM: menus, pausa, victoria/derrota, mute (SFX+musica). Habla con
   el juego SOLO por el bus (ui:play/ui:menu/ui:pause/ui:resume <->
   game:win/game:lose). La escena nunca toca el DOM.
   ===================================================================== */
import { on, emit } from '../core/events.js';
import { SFX } from '../audio/sfx.js';
import { MUSIC } from '../audio/music.js';
import { LEVELS } from '../data/levels.js';
import { el, show, hide, hideAll } from './dom.js';
import { renderGrid, saveStars } from './levelselect.js';
import { initHUD } from './hud.js';

let current=0, playing=false;
const MUTE_KEY='catapulta_mute';

function startLevel(i){
  current=i; playing=true;
  hideAll(); show('hud'); show('pauseBtn'); show('zoomBtn');
  el('zoomBtn').classList.remove('on');
  SFX.click();
  emit('ui:play',{ level:i });
}
function toMenu(){
  playing=false;
  hideAll(); hide('pauseBtn'); hide('zoomBtn'); show('start');
  SFX.click();
  emit('ui:menu');
}
function openSelect(){
  hideAll();
  renderGrid(startLevel);
  show('select');
  SFX.click();
}
function pauseGame(){
  if(!playing) return;
  show('pause'); hide('pauseBtn');
  SFX.click();
  emit('ui:pause');
}
function resumeGame(){
  hide('pause'); show('pauseBtn');
  SFX.click();
  emit('ui:resume');
}

export function initUI(){
  initHUD();

  el('btnPlay').addEventListener('click',openSelect);
  el('btnBack').addEventListener('click',toMenu);

  el('btnNext').addEventListener('click',()=>startLevel(current+1));
  el('btnRetryW').addEventListener('click',()=>startLevel(current));
  el('btnRetryL').addEventListener('click',()=>startLevel(current));
  el('btnMenuW').addEventListener('click',toMenu);
  el('btnMenuL').addEventListener('click',toMenu);

  // vistazo a la estructura: la escena responde con game:peek segun si lo acepta
  el('zoomBtn').addEventListener('click',()=>{ SFX.click(); emit('ui:peek'); });
  on('game:peek', e=>el('zoomBtn').classList.toggle('on',!!e.detail.on));

  // pausa: boton, overlay y teclas Esc/P
  el('pauseBtn').addEventListener('click',pauseGame);
  el('btnResume').addEventListener('click',resumeGame);
  el('btnRestartP').addEventListener('click',()=>{ hide('pause'); startLevel(current); });
  el('btnMenuP').addEventListener('click',()=>{ hide('pause'); toMenu(); });
  document.addEventListener('keydown',e=>{
    if(!e.key || (e.key!=='Escape' && e.key.toLowerCase()!=='p')) return;
    const paused=!el('pause').classList.contains('hidden');
    if(paused) resumeGame();
    else if(playing && !el('hud').classList.contains('hidden')) pauseGame();
  });
  // auto-pausa al perder foco la pestana: evita volver a un derrumbe ya pasado
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden && playing && el('pause').classList.contains('hidden')) pauseGame();
  });

  // mute persistido entre sesiones
  const applyMute=m=>{
    SFX.setMuted(m); MUSIC.setMuted(m);
    el('mute').innerHTML=m?'&#128263;':'&#128266;';
    el('mute').setAttribute('aria-label',m?'Activar sonido':'Silenciar');
    try{ localStorage.setItem(MUTE_KEY,m?'1':'0'); }catch{}
  };
  try{ if(localStorage.getItem(MUTE_KEY)==='1') applyMute(true); }catch{}
  el('mute').addEventListener('click',()=>applyMute(!SFX.isMuted()));

  on('game:win', e=>{
    const { level, stars }=e.detail;
    playing=false;
    saveStars(level,stars);
    if (window.CrunchyScores) window.CrunchyScores.submit('catapulta', 'n'+level, stars, (level+1)*100 + stars*10);
    hide('hud'); hide('pauseBtn'); hide('zoomBtn');
    // estrellas escalonadas: pop una a una con "ding" ascendente
    document.querySelectorAll('#winStars span').forEach((s,i)=>{
      s.classList.remove('on');
      if(i<stars) setTimeout(()=>{ s.classList.add('on'); SFX.star(i); },300+i*320);
    });
    const last=level+1>=LEVELS.length;
    el('btnNext').classList.toggle('hidden',last);
    document.querySelector('#win .tag').textContent=
      last?'¡JUEGO COMPLETADO! RECUPERASTE TODA LA MERIENDA':'GALLETAS RECUPERADAS';
    show('win');
  });
  on('game:lose', ()=>{ playing=false; hide('hud'); hide('pauseBtn'); hide('zoomBtn'); show('lose'); });
}
