/* =====================================================================
   Ranking: Supabase si hay credenciales; si no, localStorage.
   El SQL de la tabla vive en el README.
   ===================================================================== */
import { SUPABASE_URL, SUPABASE_ANON_KEY, TABLE } from '../config.js';
import { esc } from './dom.js';

let sb=null;
async function ensureSb(){
  if(sb||!SUPABASE_URL||!SUPABASE_ANON_KEY)return sb;
  await new Promise((res,rej)=>{const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";s.onload=res;s.onerror=rej;document.head.appendChild(s);}).catch(()=>{});
  if(window.supabase)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  return sb;
}

// localStorage puede estar bloqueado (modo privado): nunca debe romper la pantalla final
function loadLocal(){ try{ return JSON.parse(localStorage.getItem("bs_lb")||"[]"); }catch(e){ return []; } }
function saveLocal(a){ try{ localStorage.setItem("bs_lb",JSON.stringify(a)); }catch(e){} }

export async function submitScore(name,wins){
  if(wins<=0)return;
  try{await ensureSb();if(sb){await sb.from(TABLE).insert({player_name:name,wins});return;}}catch(e){}
  const a=loadLocal();a.push({player_name:name,wins});saveLocal(a);
}

async function getTop(){
  let rows=null;
  try{await ensureSb();if(sb){const{data}=await sb.from(TABLE).select("player_name,wins").order("wins",{ascending:false}).limit(200);if(data)rows=data;}}catch(e){}
  if(!rows)rows=loadLocal();
  const m={}; // agrega por nombre tambien con Supabase (antes salia una fila por victoria)
  rows.forEach(r=>m[r.player_name]=(m[r.player_name]||0)+(+r.wins||0));
  return Object.entries(m).map(([player_name,wins])=>({player_name,wins})).sort((x,y)=>y.wins-x.wins).slice(0,10);
}

export async function renderLb(id){
  const ol=document.getElementById(id);ol.innerHTML="<li class='small'>Cargando...</li>";
  try{
    const top=await getTop();
    ol.innerHTML=top.length?top.map(r=>`<li>${esc(r.player_name)} - ${r.wins}</li>`).join(""):"<li class='small'>Aun no hay puntajes</li>";
  }catch(e){ ol.innerHTML="<li class='small'>No se pudo cargar el ranking</li>"; }
}
