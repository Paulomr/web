/* Progreso persistido (localStorage) + grid de seleccion de nivel. */
import { LEVELS } from '../data/levels.js';
import { el } from './dom.js';

const KEY='galletaAlVuelo_v1';

export function getProgress(){
  try{ return JSON.parse(localStorage.getItem(KEY))||{ stars:{} }; }
  catch{ return { stars:{} }; }
}
export function saveStars(i,s){
  const p=getProgress();
  p.stars[i]=Math.max(p.stars[i]||0,s);
  try{ localStorage.setItem(KEY,JSON.stringify(p)); }catch{}
}
// desbloqueado = siguiente al ultimo superado
export function unlockedUpTo(){
  const p=getProgress();
  let u=0;
  while(u<LEVELS.length && (p.stars[u]||0)>0) u++;
  return u;
}

export function renderGrid(onPick){
  const p=getProgress(), max=unlockedUpTo(), grid=el('grid');
  grid.innerHTML='';
  LEVELS.forEach((L,i)=>{
    const locked=i>max, s=p.stars[i]||0;
    const b=document.createElement('button');
    b.className='lvl'+(locked?' locked':'');
    b.setAttribute('aria-label',locked
      ? `Nivel ${i+1} bloqueado`
      : `Nivel ${i+1}: ${L.name}. ${s} de 3 estrellas`);
    b.innerHTML=`<span class="num">${locked?'&#128274;':i+1}</span>
      <span class="stars">${'★'.repeat(s)}<span class="off">${'★'.repeat(3-s)}</span></span>
      ${locked?'<img class="zzz" src="assets/bernie/bernie-dormida.png" alt="">':''}`;
    if(!locked) b.addEventListener('click',()=>onPick(i));
    grid.appendChild(b);
  });
}
