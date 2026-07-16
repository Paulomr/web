/* Render de pantallas, HUD, juego y overlays. Escucha eventos de estado.js y dispara acciones. */

import * as E from './estado.js';
import { MASAS, TOPPINGS, DECORACIONES, GLASEADOS, masaPorId, decoPorId, tieneGlaseado } from './recetas.js';
import { DIAS } from './dias.js';
import * as G from './guardado.js';
import { sfx, alternarMute, estaMute } from './audio.js';
import { initDrag } from './drag.js';
import { lanzarConfeti, detener as detenerConfeti } from './confeti.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let pantallaActual = 'pantalla-portada';
let dragCtrl = null;
let clientesEls = new Map(); // id -> {el, fill, bocaG, mood, barra, moodLockHasta}
let tutorial = null; // {paso, pasos}
let toastTimer = 0;
let timersRes = []; // setTimeouts de la pantalla de resultados (cancelables al salir)
let puestosEls = []; // caché de .horno-puesto para frame()

/* ══════════════ ICONOS SVG ══════════════ */
const ICONO_ALTAVOZ = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none"/><path class="ondas" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/><path class="tachado" d="M4 4 20 20" stroke="#ce6969" stroke-width="2.6"/></svg>`;
const ICONO_PAUSA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="2"/><rect x="14" y="4" width="5" height="16" rx="2"/></svg>`;
const ICONO_CANDADO = `<svg viewBox="0 0 24 24" width="26" height="26" fill="#1b2233"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V8a3 3 0 0 0-6 0v2z"/></svg>`;
const ICONO_DESHACER = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>`;
const ICONO_CHECK = `<svg class="check" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="11" fill="#4caf7d" stroke="#1b2233" stroke-width="2"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ESTRELLA = (llena) => `<svg class="estrella ${llena ? 'llena' : 'vacia'}" viewBox="0 0 24 24" width="30" height="30"><path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z" fill="${llena ? '#e9a83a' : 'none'}" stroke="#1b2233" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
const CORAZON = (lleno) => `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 21c-5.5-4.1-9-7.3-9-11.2C3 6.6 5.4 4.5 8 4.5c1.6 0 3.1.8 4 2 1-1.2 2.4-2 4-2 2.6 0 5 2.1 5 5.3 0 3.9-3.5 7.1-9 11.2z" fill="${lleno ? '#ce6969' : '#e8dcd0'}" stroke="#1b2233" stroke-width="1.8"/></svg>`;
const MANO_SVG = `<svg viewBox="0 0 48 48" width="46" height="46"><path d="M18 44c-3-3-8-9-9-12-.8-2.4 1.8-4 3.6-2.4l3.4 3V12a3 3 0 0 1 6 0v10l1-.2V9a3 3 0 0 1 6 0v13l1 .1V12a2.6 2.6 0 0 1 5.2 0v11l1-.1v-7a2.4 2.4 0 0 1 4.8 0v14c0 6-3 10-6 14z" fill="#fdf6ef" stroke="#1b2233" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
const NUBE_SVG = `<svg viewBox="0 0 60 36" width="52" height="32"><path d="M14 30a8 8 0 0 1 1.6-15.8A11 11 0 0 1 37 10a9 9 0 0 1 9 9 8 8 0 0 1 0 11z" fill="#cfd4dd" stroke="#1b2233" stroke-width="2" opacity=".9"/></svg>`;

/* ══════════════ COMPONENTE GALLETA ══════════════ */
const PASTELES = ['#f2a7c0', '#8fd0f0', '#f7e3a1', '#bfe3d0', '#d9c7ee', '#ce6969'];
const PERLA_COLS = ['#fff7ea', '#ffe9c4', '#fdf6ef'];
const FRESA_COLS = ['#f7a8c0', '#e56a8a', '#f28ba8'];
/* PRNG con semilla: todo lo "aleatorio" de la galleta se calcula una vez al
   cargar, así todas las galletas salen iguales entre partidas. */
function prng(semilla) {
  let s = semilla;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* Contorno de la crema: antes era un glaseado con chorretones colgando, que en
   una galleta vista desde arriba dejaba media galleta desnuda. Ahora es una capa
   centrada y untada a mano: lóbulos irregulares alrededor de todo el borde. */
function blobPath(cx, cy, n, rBase, amp, semilla) {
  const rnd = prng(semilla);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = rBase + (i % 2 ? -amp : amp) + (rnd() - 0.5) * 2.4;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  // Catmull-Rom cerrado → cúbicas: lóbulos redondos, sin esquinas.
  const f = (v) => v.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}
const BLOB_GLASEADO = blobPath(48, 47.5, 13, 33.5, 1.6, 99173);

/* ── Reparto de los toppings sobre la crema ──
 *
 * Antes cada topping traía sus propias anclas fijas, así que dos toppings en la
 * misma galleta se pisaban y quedaban amontonados. Ahora hay UN solo juego de
 * anclas compartido: se generan una vez con "mejor candidato" (Mitchell) dentro
 * de la elipse que ocupa la crema, de modo que ningún punto cae encima de otro y
 * la superficie queda cubierta pareja. Después cada topping toma sus puntos
 * salteados (0, n, 2n…), y así los distintos toppings se entremezclan por toda
 * la galleta en vez de agruparse cada uno en su zona.
 */
const ANCLAS_MAX = 12;
const SEPARACION = 12; // separación mínima entre centros, en unidades del viewBox 96

/* Elipse inscrita en la crema, con margen para que ninguna pieza se salga. */
const CX = 48, CY = 47.5, RX = 23, RY = 23;

function anclasCrema(n) {
  const rnd = prng(20260716);
  const pts = [];
  for (let i = 0; i < n; i++) {
    let mejor = null;
    let mejorD = -1;
    // De un puñado de candidatos al azar nos quedamos con el más lejano a lo ya puesto.
    for (let k = 0; k < 20 + i * 8; k++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd());
      const p = [CX + Math.cos(a) * r * RX, CY + Math.sin(a) * r * RY];
      let d = Infinity;
      for (const q of pts) d = Math.min(d, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);
      if (d > mejorD) { mejorD = d; mejor = p; }
    }
    pts.push(mejor);
  }
  // Relajación: separamos los pares que quedaron pegados y devolvemos a la
  // elipse a los que se salieron. Converge a SEPARACION exacta entre vecinos.
  for (let paso = 0; paso < 80; paso++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pts[j][0] - pts[i][0];
        const dy = pts[j][1] - pts[i][1];
        const d = Math.hypot(dx, dy) || 0.001;
        if (d >= SEPARACION) continue;
        const f = (SEPARACION - d) / d / 2;
        pts[i][0] -= dx * f; pts[i][1] -= dy * f;
        pts[j][0] += dx * f; pts[j][1] += dy * f;
      }
    }
    for (const p of pts) {
      const u = (p[0] - CX) / RX;
      const v = (p[1] - CY) / RY;
      const m = Math.hypot(u, v);
      if (m > 1) { p[0] = CX + (u / m) * RX; p[1] = CY + (v / m) * RY; }
    }
  }
  /* Orden final = por ángulo alrededor del centro (el punto más central queda de
     último). Repartir "salteado" sobre ESTE orden hace que anclas vecinas caigan
     en toppings distintos, así los toppings se entremezclan por toda la galleta
     en vez de agruparse cada uno en su lado. */
  const clave = (p) => ({
    central: Math.hypot(p[0] - CX, p[1] - CY) < 9 ? 1 : 0,
    ang: Math.atan2(p[1] - CY, p[0] - CX),
  });
  return pts.sort((a, b) => {
    const ka = clave(a), kb = clave(b);
    return ka.central - kb.central || ka.ang - kb.ang;
  });
}
const ANCLAS = anclasCrema(ANCLAS_MAX);

/* Cuántas piezas pone cada topping según cuántos compartan la galleta: entre
   todos nunca pasan de ANCLAS_MAX, así la galleta no se satura. */
const PIEZAS_POR_TOPPING = { 1: 7, 2: 5, 3: 4 };

/* Forma de cada topping. `pieza(color, i)` devuelve el <span> ya colocado. */
const FORMAS = {
  chispas_choc: { clase: 'chip-choc', cols: null },
  chispas_colores: { clase: 'chip-color', cols: PASTELES },
  chispas_fresa: { clase: 'chip-color', cols: FRESA_COLS },
  perlas: { clase: 'perla', cols: PERLA_COLS },
  sprinkles: { clase: 'sprinkle', cols: PASTELES },
};

/**
 * Capa de toppings de una galleta. Recibe la lista completa para poder repartir
 * las anclas entre todos sin choques.
 */
function toppingsHTML(lista) {
  const tops = lista.filter((id) => FORMAS[id]);
  if (!tops.length) return '';
  const piezas = PIEZAS_POR_TOPPING[Math.min(tops.length, 3)] ?? 4;
  const total = tops.length * piezas;
  let html = '';
  /* Recorremos las anclas a zancadas por todo el anillo (no en bloque, que
     dejaría media crema pelada) y vamos rotando de topping en cada paso: las
     piezas quedan repartidas por toda la galleta y mezcladas entre sí. */
  for (let j = 0; j < total; j++) {
    const idx = Math.round((j * ANCLAS_MAX) / total) % ANCLAS_MAX;
    const t = j % tops.length;
    const { clase, cols } = FORMAS[tops[t]];
    const [x, y] = ANCLAS[idx];
    const rot = ((idx * 53 + t * 29) % 90) - 45;
    const col = cols ? `background:${cols[(idx + t) % cols.length]};` : '';
    html += `<span class="chip ${clase}" style="left:${(x / 96) * 100}%;top:${(y / 96) * 100}%;--rot:${rot}deg;${col}"></span>`;
  }
  return `<div class="toppings">${html}</div>`;
}

/* Glaseado (crema): la base. Cada crema trae su degradado g1→g2 en recetas.js.
   Encima del color van un brillo especular y una sombra en el borde para que se
   lea como una capa con volumen y no como una mancha plana. */
function glaseadoSVG(decoId) {
  const d = decoPorId(decoId) || { id: decoId, g1: '#f7bcd0', g2: '#f2a7c0' };
  const g = 'gl_' + d.id;
  return `<svg class="glaseado" viewBox="0 0 96 96" aria-hidden="true">
    <defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${d.g1}"/>
        <stop offset=".55" stop-color="${d.g1}"/>
        <stop offset="1" stop-color="${d.g2}"/>
      </linearGradient>
      <radialGradient id="${g}_v" cx=".36" cy=".3" r=".82">
        <stop offset="0" stop-color="#fff" stop-opacity=".42"/>
        <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".18"/>
      </radialGradient>
      <clipPath id="${g}_c"><path d="${BLOB_GLASEADO}"/></clipPath>
    </defs>
    <path d="${BLOB_GLASEADO}" fill="url(#${g})" stroke="rgba(27,34,51,.34)" stroke-width="1.6" stroke-linejoin="round"/>
    <g clip-path="url(#${g}_c)">
      <path d="${BLOB_GLASEADO}" fill="url(#${g}_v)"/>
      <ellipse cx="35" cy="26" rx="11" ry="4.4" fill="#fff" opacity=".5" transform="rotate(-16 35 26)"/>
      <ellipse cx="51" cy="21" rx="3.6" ry="1.8" fill="#fff" opacity=".38" transform="rotate(-16 51 21)"/>
    </g>
  </svg>`;
}

/** Componente único de galleta. g = {masa, toppings, deco, coccion} */
export function galletaHTML(g, esc = 1, clase = '') {
  const masa = masaPorId(g.masa);
  const st = `--esc:${esc};--g-claro:${masa.colores.claro};--g-medio:${masa.colores.medio};--g-borde:${masa.colores.borde}`;
  let dentro = '';
  /* Orden de dibujo = orden de decoración: primero la CREMA (base), luego los TOPPINGS encima. */
  const glas = (g.deco || []).find((d) => GLASEADOS.includes(d));
  if (glas) dentro += glaseadoSVG(glas);
  dentro += toppingsHTML(g.toppings || []);
  const humo = g.coccion === 'quemada' ? '<div class="humo h1"></div><div class="humo h2"></div>' : '';
  return `<div class="galleta-wrap ${clase}" style="${st}"><div class="galleta coccion-${g.coccion}">${dentro}${humo}</div></div>`;
}

function itemAGalleta(item) {
  return { masa: item.masa, toppings: item.toppings, deco: item.decoraciones, coccion: 'perfecta' };
}

/* ══════════════ COMPONENTE CLIENTE ══════════════ */
const TORSOS = ['#ce6969', '#8fd0f0', '#e9a83a', '#bfe3d0', '#d9c7ee'];

function bocaSVG(mood) {
  const t = 'fill="none" stroke="#1b2233" stroke-width="3" stroke-linecap="round"';
  if (mood === 'feliz') return `<path d="M48 60 Q60 72 72 60" ${t}/>`;
  if (mood === 'neutra') return `<path d="M50 64 L70 64" ${t}/>`;
  if (mood === 'preocupada') return `<path d="M50 68 Q60 60 70 68" ${t}/>`;
  return `<path d="M50 69 Q60 61 70 69" ${t}/><path d="M39 35 L52 40" ${t}/><path d="M81 35 L68 40" ${t}/>`;
}

function accesorioSVG(acc) {
  const t = 'stroke="#1b2233" stroke-width="3" stroke-linejoin="round"';
  if (acc === 'gorra') return `<path d="M34 31 C36 14 84 14 86 31 Z" fill="#ce6969" ${t}/><rect x="27" y="28" width="66" height="7" rx="3.5" fill="#ce6969" ${t}/>`;
  if (acc === 'gafas') return `<circle cx="47" cy="46" r="9" fill="rgba(255,255,255,.35)" ${t}/><circle cx="73" cy="46" r="9" fill="rgba(255,255,255,.35)" ${t}/><path d="M56 46 L64 46" ${t}/>`;
  if (acc === 'mono') return `<g transform="translate(78 20) rotate(15)"><path d="M0 0 L-13 -8 L-13 8 Z" fill="#f2a7c0" ${t}/><path d="M0 0 L13 -8 L13 8 Z" fill="#f2a7c0" ${t}/><circle cx="0" cy="0" r="4" fill="#f2a7c0" ${t}/></g>`;
  if (acc === 'gorro') return `<path d="M29 42 C29 15 91 15 91 42 L91 45 L29 45 Z" fill="#bfe3d0" ${t}/><circle cx="60" cy="13" r="6" fill="#fdf6ef" ${t}/>`;
  return '';
}

const CORONA_SVG = `<g class="corona"><path d="M42 13 L48 1 L56 9 L60 -1 L64 9 L72 1 L78 13 L76 18 L44 18 Z" transform="translate(0 2)" fill="#e9a83a" stroke="#1b2233" stroke-width="2.5" stroke-linejoin="round"/><circle class="destello" cx="60" cy="9" r="2.6" fill="#fff"/></g>`;

/* Detalle de ropa según la semilla: 0 = botones, 1 = puntitos, 2 = delantal de la casa */
function ropaSVG(s) {
  const patron = Math.floor(s * 97) % 3;
  if (patron === 1) {
    return `<g fill="rgba(255,255,255,.55)"><circle cx="46" cy="101" r="3"/><circle cx="61" cy="110" r="3"/><circle cx="76" cy="100" r="3"/><circle cx="35" cy="111" r="2.5"/><circle cx="86" cy="112" r="2.5"/></g>`;
  }
  if (patron === 2) {
    return `<path d="M47 90 C51 86 69 86 73 90 L76 118 L44 118 Z" fill="#fdf6ef" stroke="#1b2233" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M53 99 h14 M51 107 h18" stroke="rgba(27,34,51,.3)" stroke-width="2" stroke-linecap="round"/>`;
  }
  return `<circle cx="60" cy="100" r="2.3" fill="rgba(27,34,51,.45)"/><circle cx="60" cy="109" r="2.3" fill="rgba(27,34,51,.45)"/>`;
}

function clienteSVG(c) {
  const v = c.variante;
  const s = v.semilla;
  const torso = TORSOS[Math.floor(s * TORSOS.length)];
  const acc = c.tipo === 'vip' ? CORONA_SVG : accesorioSVG(v.accesorio);
  /* delays negativos: cada cliente respira y parpadea a su propio ritmo */
  const dBob = (s * 2.6).toFixed(2);
  const dOjos = (s * 4.6).toFixed(2);
  return `<svg class="cliente-svg" viewBox="0 -4 120 122" aria-hidden="true">
    <ellipse class="cliente-sombra" cx="60" cy="115.5" rx="34" ry="4.2" fill="rgba(27,34,51,.16)"/>
    <g class="bob-g" style="animation-delay:-${dBob}s">
      <path d="M28 118 C28 92 42 84 60 84 C78 84 92 92 92 118 Z" fill="${torso}" stroke="#1b2233" stroke-width="3"/>
      ${ropaSVG(s)}
      <circle cx="60" cy="50" r="34" fill="${v.colorCara}" stroke="#1b2233" stroke-width="3"/>
      <g class="ojos" style="animation-delay:-${dOjos}s">
        <circle cx="47" cy="46" r="3.4" fill="#1b2233"/>
        <circle cx="73" cy="46" r="3.4" fill="#1b2233"/>
        <circle cx="48.3" cy="44.7" r="1.1" fill="#fff"/>
        <circle cx="74.3" cy="44.7" r="1.1" fill="#fff"/>
      </g>
      <circle cx="41" cy="57" r="5" fill="#f2a7c0" opacity=".55"/>
      <circle cx="79" cy="57" r="5" fill="#f2a7c0" opacity=".55"/>
      <g class="boca-g">${bocaSVG('feliz')}</g>
      ${acc}
    </g>
  </svg>`;
}

function burbujaHTML(c) {
  const items = c.pedido.items
    .map((it, i) => `<div class="burbuja-item ${it.servido ? 'servida' : ''}" data-item="${i}">${galletaHTML(itemAGalleta(it), 0.72)}${ICONO_CHECK}</div>`)
    .join('');
  return `<div class="burbuja"><div class="burbuja-items">${items}</div><div class="paciencia"><div class="paciencia-fill"></div></div></div>`;
}

/* ══════════════ FRASCOS Y BOLAS ══════════════ */
function contenidoFrasco(id) {
  if (id === 'chispas_choc') return '<span class="mini-chip c1"></span><span class="mini-chip c2"></span><span class="mini-chip c3"></span>';
  if (id === 'chispas_colores') return '<span class="mini-chip col1"></span><span class="mini-chip col2"></span><span class="mini-chip col3"></span>';
  if (id === 'perlas') return '<span class="mini-chip pe1"></span><span class="mini-chip pe2"></span><span class="mini-chip pe3"></span>';
  if (id === 'chispas_fresa') return '<span class="mini-chip fr1"></span><span class="mini-chip fr2"></span><span class="mini-chip fr3"></span>';
  if (id === 'glaseado_rosa') return '<span class="mini-glaseado rosa"></span>';
  if (id === 'glaseado_vainilla') return '<span class="mini-glaseado vainilla"></span>';
  if (id === 'glaseado_choc') return '<span class="mini-glaseado choco"></span>';
  if (id === 'glaseado_menta') return '<span class="mini-glaseado menta"></span>';
  if (id === 'sprinkles') return '<span class="mini-spr s1"></span><span class="mini-spr s2"></span><span class="mini-spr s3"></span>';
  return '';
}

function frascoHTML(def, tipo, diaMax) {
  const bloqueado = def.dia > diaMax;
  const tap = tipo === 'top' ? `top:${def.id}` : `deco:${def.id}`;
  return `<button class="frasco ${bloqueado ? 'bloqueado' : ''}" data-tap="${tap}" data-dia="${def.dia}" aria-label="${def.nombre}">
    <span class="tarro"><span class="tapa"></span><span class="tarro-vidrio">${contenidoFrasco(def.id)}</span></span>
    <span class="etiqueta">${def.nombre.replace('Chispas de ', '').replace('Glaseado de ', 'Glas. ').replace('Glaseado ', 'Glas. ')}</span>
    ${bloqueado ? `<span class="candado">${ICONO_CANDADO}</span>` : ''}
  </button>`;
}

function bolaHTML(m, diaMax) {
  const bloqueada = m.dia > diaMax;
  return `<button class="bola-masa ${bloqueada ? 'bloqueado' : ''}" data-tap="masa:${m.id}" data-dia="${m.dia}" aria-label="Masa de ${m.nombre}" style="--m1:${m.colores.claro};--m2:${m.colores.medio};--m3:${m.colores.borde}">
    <span class="bola"></span><span class="etiqueta">${m.nombre}</span>
    ${bloqueada ? `<span class="candado">${ICONO_CANDADO}</span>` : ''}
  </button>`;
}

/* ══════════════ ROUTER DE PANTALLAS ══════════════ */
export function mostrarPantalla(id) {
  if (pantallaActual === id) {
    // re-render de la misma pantalla: nada
  }
  $$('.pantalla').forEach((p) => p.classList.remove('activa'));
  $('#' + id).classList.add('activa');
  pantallaActual = id;
  if (id !== 'pantalla-resultados') {
    detenerConfeti();
    /* cancelar animaciones/sonidos pendientes de resultados */
    timersRes.forEach(clearTimeout);
    timersRes = [];
  }
  /* red de seguridad: sin fantasmas de drag ni zonas resaltadas huérfanas entre pantallas */
  document.querySelectorAll('.drag-fantasma').forEach((f) => f.remove());
  $$('.drop-activa, .drop-hover').forEach((z) => z.classList.remove('drop-activa', 'drop-hover'));
  $$('.drag-origen').forEach((z) => z.classList.remove('drag-origen'));
}

function timerRes(fn, ms) {
  timersRes.push(setTimeout(fn, ms));
}

/* ══════════════ PORTADA ══════════════ */
function refrescarIconosMute() {
  $$('.btn-mute').forEach((b) => b.classList.toggle('muteado', estaMute()));
}

function initPortada() {
  const mes = new Date().getMonth(); // 0-based: 9 = octubre, 11 = diciembre
  const img = $('#img-bernie-portada');
  if (mes === 9) img.src = 'assets/bernie/bernie-vampira.png';
  else if (mes === 11) img.src = 'assets/bernie/bernie-navidena.png';

  $('#btn-jugar').addEventListener('click', () => { sfx.pop(); renderDias(); mostrarPantalla('pantalla-dias'); });
  $('#btn-como').addEventListener('click', () => { sfx.pop(); abrirComo(); });
  $$('.btn-mute').forEach((b) => {
    b.innerHTML = ICONO_ALTAVOZ;
    b.addEventListener('click', () => { alternarMute(); refrescarIconosMute(); });
  });
  refrescarIconosMute();
}

/* ══════════════ MENÚ DE DÍAS ══════════════ */
function renderDias() {
  const cont = $('#pantalla-dias');
  const tarjetas = DIAS.map((d) => {
    const prog = G.datos.dias[d.dia];
    const desb = G.diaDesbloqueado(d.dia);
    const estrellas = [1, 2, 3].map((i) => ESTRELLA(prog.estrellas >= i)).join('');
    return `<button class="tarjeta-dia ${desb ? '' : 'bloqueada'}" data-dia="${d.dia}">
      <span class="dia-num">${d.dia}</span>
      <span class="dia-estrellas">${estrellas}</span>
      ${desb ? '' : `<span class="candado">${ICONO_CANDADO}</span>`}
    </button>`;
  }).join('');
  const hp = G.datos.horaPico;
  const hpTarjeta = `<button class="tarjeta-pico ${hp.desbloqueada ? '' : 'bloqueada'}" id="btn-hora-pico">
    <span class="pico-titulo">HORA PICO <span class="infinito">∞</span></span>
    ${hp.desbloqueada
      ? `<span class="pico-sub">Récord: ${hp.mejorPuntaje} monedas · ${hp.mejorPedidos} pedidos</span>`
      : `<span class="pico-sub"><span class="candado">${ICONO_CANDADO}</span> Termina el Día 5</span>`}
  </button>`;
  cont.innerHTML = `
    <div class="cabecera-pantalla"><button class="btn btn-volver" id="btn-volver-dias">&larr; Volver</button><h2 class="titulo-px">Elige tu dia</h2></div>
    <div class="grid-dias">${tarjetas}</div>
    ${hpTarjeta}
    <img class="bernie-esquina" src="assets/bernie/bernie-saludando.png" alt="Bernie saluda">`;
  $('#btn-volver-dias').addEventListener('click', () => { sfx.pop(); mostrarPantalla('pantalla-portada'); });
  $$('.tarjeta-dia').forEach((t) => t.addEventListener('click', () => {
    const dia = Number(t.dataset.dia);
    if (!G.diaDesbloqueado(dia)) { sfx.buzz(); toast(`Consigue 1 estrella en el Día ${dia - 1}`, cont); return; }
    sfx.pop();
    renderBriefing(dia);
    mostrarPantalla('pantalla-briefing');
  }));
  $('#btn-hora-pico').addEventListener('click', () => {
    if (!G.datos.horaPico.desbloqueada) { sfx.buzz(); toast('Termina el Día 5 con al menos 1 estrella', cont); return; }
    sfx.pop();
    renderBriefingPico();
    mostrarPantalla('pantalla-briefing');
  });
}

/* ══════════════ BRIEFING ══════════════ */
function componenteDesbloqueo(id) {
  const gll = (masa, deco = [], toppings = []) => galletaHTML({ masa, toppings, deco, coccion: 'perfecta' }, 0.6);
  switch (id) {
    case 'chocolate': return gll('chocolate');
    case 'redvelvet': return gll('redvelvet');
    case 'glaseado_rosa': return gll('vainilla', ['glaseado_rosa']);
    case 'glaseado_vainilla': return gll('vainilla', ['glaseado_vainilla']);
    case 'glaseado_choc': return gll('vainilla', ['glaseado_choc']);
    case 'glaseado_menta': return gll('chocolate', ['glaseado_menta']);
    case 'perlas': return gll('chocolate', ['glaseado_rosa'], ['perlas']);
    case 'sprinkles': return gll('chocolate', ['glaseado_rosa'], ['sprinkles']);
    case 'chispas_colores': return gll('vainilla', ['glaseado_vainilla'], ['chispas_colores']);
    case 'chispas_fresa': return gll('vainilla', ['glaseado_vainilla'], ['chispas_fresa']);
    case 'chispas_choc': return gll('vainilla', ['glaseado_rosa'], ['chispas_choc']);
    case 'vip': return `<div class="mini-cliente">${clienteSVG({ tipo: 'vip', variante: { colorCara: '#f7e3a1', accesorio: 'ninguno', semilla: 0.1 } })}</div>`;
    default: return '';
  }
}

function renderBriefing(dia) {
  const cfg = DIAS[dia - 1];
  const cont = $('#pantalla-briefing');
  const nuevos = dia > 1 ? cfg.desbloqueos.map(componenteDesbloqueo).join('') : '';
  const panelNuevo = dia > 1
    ? `<div class="panel-nuevo"><span class="nuevo-badge">¡NUEVO!</span>
        <div class="nuevo-fila"><div class="nuevo-items">${nuevos}</div><img src="assets/bernie/bernie-guino.png" alt="Bernie guiña" class="bernie-guino"></div>
        <p class="nuevo-texto">${cfg.textoDesbloqueo}</p></div>`
    : `<div class="panel-nuevo"><span class="nuevo-badge">TUTORIAL</span><p class="nuevo-texto">${cfg.textoDesbloqueo}</p></div>`;
  cont.innerHTML = `
    <div class="cabecera-pantalla"><button class="btn btn-volver" id="btn-volver-brief">&larr; Volver</button><h2 class="titulo-px">Dia ${dia}</h2></div>
    ${panelNuevo}
    <div class="panel-meta">
      <p class="meta-principal">Meta: <strong>${cfg.objetivo} monedas</strong> en ${cfg.duracionS}s</p>
      <ul class="lista-estrellas">
        <li>${ESTRELLA(true)} Llega a ${cfg.objetivo} monedas</li>
        <li>${ESTRELLA(true)}${ESTRELLA(true)} Máximo 1 cliente perdido</li>
        <li>${ESTRELLA(true)}${ESTRELLA(true)}${ESTRELLA(true)} ${Math.ceil(cfg.objetivo * 1.35)} monedas y 0 perdidos</li>
      </ul>
    </div>
    <img class="bernie-briefing" src="assets/bernie/bernie-bandeja.png" alt="Bernie presenta con su bandeja">
    <button class="btn btn-primario grande" id="btn-abrir">¡Abrir la pastelería!</button>`;
  $('#btn-volver-brief').addEventListener('click', () => { sfx.pop(); mostrarPantalla('pantalla-dias'); });
  $('#btn-abrir').addEventListener('click', () => { sfx.pop(); empezarDia(dia); });
}

function renderBriefingPico() {
  const cont = $('#pantalla-briefing');
  cont.innerHTML = `
    <div class="cabecera-pantalla"><button class="btn btn-volver" id="btn-volver-brief">&larr; Volver</button><h2 class="titulo-px">Hora Pico</h2></div>
    <div class="panel-nuevo pico"><span class="nuevo-badge">∞ SIN FIN</span>
      <p class="nuevo-texto">Bernie ya se tomó su café. Clientes sin fin, 3 oportunidades. ¿Hasta dónde llegas?</p>
      <div class="pico-vidas">${CORAZON(true)}${CORAZON(true)}${CORAZON(true)}</div>
    </div>
    <img class="bernie-briefing" src="assets/bernie/bernie-cafetera.png" alt="Bernie con su cafetera">
    <p class="pico-record">Récord actual: <strong>${G.datos.horaPico.mejorPuntaje}</strong> monedas</p>
    <button class="btn btn-primario grande" id="btn-abrir">¡Abrir la pastelería!</button>`;
  $('#btn-volver-brief').addEventListener('click', () => { sfx.pop(); mostrarPantalla('pantalla-dias'); });
  $('#btn-abrir').addEventListener('click', () => { sfx.pop(); empezarPico(); });
}

/* ══════════════ CONSTRUCCIÓN DEL ÁREA DE JUEGO ══════════════ */
function construirJuego() {
  const P = E.P;
  const cfg = P.cfg;
  const diaMax = P.modo === 'pico' ? 5 : cfg.dia;
  clientesEls = new Map();

  /* mostrador */
  $('#slots-clientes').innerHTML = Array.from({ length: cfg.clientesSimultaneos }, (_, i) => `<div class="cliente-slot" data-slot="${i}"></div>`).join('');
  $('#banda-mostrador').classList.remove('pulso-pico');

  /* horno (vapor + led son decorativos: el JS solo toca .contenido, .ocupado y fase-*) */
  $('#horno-puestos').innerHTML = Array.from({ length: cfg.hornoPuestos }, (_, i) => `
    <div class="horno-puesto" data-drop="horno:${i}" data-tap="horno:${i}">
      <span class="puesto-vapor v1"></span><span class="puesto-vapor v2"></span><span class="puesto-vapor v3"></span>
      <div class="anillo"></div>
      <div class="vidrio"><span class="mas">+</span></div>
      <div class="contenido"></div>
      <span class="puesto-led"></span>
    </div>`).join('');

  /* mesa — cremas (base) primero, luego toppings (van encima) */
  $('#fila-masas').innerHTML = MASAS.map((m) => bolaHTML(m, diaMax)).join('');
  $('#fila-decos').innerHTML = DECORACIONES.map((d) => frascoHTML(d, 'deco', diaMax)).join('');
  $('#fila-decos').classList.remove('oculto');
  $('#fila-toppings').innerHTML = TOPPINGS.map((t) => frascoHTML(t, 'top', diaMax)).join('');
  $('#tabla-galleta').innerHTML = '';
  $$('#fila-repisa [data-drag]').forEach((el) => (el.innerHTML = ''));

  /* caché para frame(): puestos del horno */
  puestosEls = $$('.horno-puesto');
  puestosEls.forEach((p) => { p._fase = null; p._prog = null; });

  /* HUD */
  $('#hud-monedas-num').textContent = '0';
  $('#hud-progreso').classList.toggle('oculto', P.modo === 'pico');
  $('#hud-progreso-fill').style.transform = 'scaleX(0)';
  $('#hud-combo').classList.add('oculto');
  $('#hud-vidas').classList.toggle('oculto', P.modo !== 'pico');
  if (P.modo === 'pico') renderVidas(P.vidas);
  $('#hud-timer').textContent = P.modo === 'pico' ? '∞' : formatoTiempo(P.tRestanteMs);
  actualizarFrascosHabilitados();
}

function renderVidas(n) {
  $('#hud-vidas').innerHTML = [0, 1, 2].map((i) => CORAZON(i < n)).join('');
}

function formatoTiempo(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* Frascos de decoración deshabilitados sin galleta horneada en la tabla */
function actualizarFrascosHabilitados() {
  const g = E.P ? E.P.tabla : null;
  const horneada = g && (g.coccion === 'perfecta' || g.coccion === 'pasada');
  const conCrema = horneada && tieneGlaseado(g.deco);
  /* Cremas: activas al haber galleta horneada (son la base). */
  $$('#fila-decos .frasco').forEach((f) => {
    if (f.classList.contains('bloqueado')) return;
    f.classList.toggle('inactivo', !horneada);
  });
  /* Toppings: activos solo cuando ya hay crema puesta (van encima). */
  $$('#fila-toppings .frasco').forEach((f) => {
    if (f.classList.contains('bloqueado')) return;
    f.classList.toggle('inactivo', !conCrema);
  });
}

/* ══════════════ INICIO DE PARTIDAS ══════════════ */
function empezarDia(dia) {
  const necesitaTuto = dia === 1 && !G.datos.tutorialVisto;
  E.iniciarDia(dia, {
    forzarPrimerPedido: necesitaTuto ? [{ masa: 'vainilla', toppings: ['chispas_choc'], decoraciones: ['glaseado_rosa'] }] : null,
  });
  construirJuego();
  mostrarPantalla('pantalla-juego');
  countdown(() => {
    if (necesitaTuto) arrancarTutorial();
    E.setPausa(false);
  });
}

function empezarPico() {
  E.iniciarHoraPico();
  construirJuego();
  mostrarPantalla('pantalla-juego');
  countdown(() => E.setPausa(false));
}

function countdown(cb) {
  const ov = $('#overlay-countdown');
  const num = $('#countdown-num');
  ov.classList.remove('oculto');
  const seq = ['3', '2', '1', '¡A hornear!'];
  let i = 0;
  function paso() {
    if (i >= seq.length) {
      ov.classList.add('oculto');
      cb();
      /* si la pestaña se ocultó durante el countdown, la auto-pausa no pudo abrirse
         (abrirPausa retorna temprano con el countdown visible): abrirla ahora */
      if (document.hidden) abrirPausa();
      return;
    }
    num.textContent = seq[i];
    num.classList.toggle('go', i === 3);
    num.classList.remove('anim');
    void num.offsetWidth;
    num.classList.add('anim');
    if (i === 3) sfx.go(); else sfx.tick();
    i++;
    setTimeout(paso, i === 4 ? 700 : 750);
  }
  paso();
}

/* ══════════════ TUTORIAL ══════════════ */
function arrancarTutorial() {
  const pasos = {
    masa: { texto: 'Toca la bola de masa de vainilla para empezar tu galleta.', objetivo: '[data-tap="masa:vainilla"]', permite: (t, d) => t === 'masa' && d === 'vainilla' },
    hornear: { texto: 'Arrastra la galleta cruda a un puesto del horno. También puedes tocarla y luego tocar el horno.', objetivo: '#tabla-slot', permite: (t) => t === 'hornear' },
    sacar: { texto: '¡Sácala cuando el anillo esté DORADO! Toca el puesto del horno.', objetivo: null, permite: (t) => t === 'sacar' },
    devolver: { texto: 'Salió cruda: devuélvela al horno, conserva su avance.', objetivo: '#tabla-slot', permite: (t) => t === 'hornear' },
    descartar: { texto: 'Se quemó… Arrástrala a la caneca y toca la masa otra vez.', objetivo: '#caneca', permite: (t) => t === 'descartar' || t === 'masa' },
    crema: { texto: 'La CREMA va primero: toca el glaseado rosa (siempre antes que los toppings).', objetivo: '[data-tap="deco:glaseado_rosa"]', permite: (t) => t === 'deco' },
    topping: { texto: 'Ahora sí, encima de la crema pon las chispas de chocolate.', objetivo: '[data-tap="top:chispas_choc"]', permite: (t) => t === 'topping' },
    entregar: { texto: '¡Llévasela a tu cliente! Arrastra la galleta hasta él.', objetivo: '.cliente', permite: (t) => t === 'entregar' },
  };
  tutorial = { paso: 'masa', pasos };
  E.setCongelar(true);
  E.setVentanaBonus(2000); // ventana dorada más amplia mientras se aprende
  E.setGate((tipo, dato) => tutorial ? pasos[tutorial.paso].permite(tipo, dato) : true);
  $('#overlay-tutorial').classList.remove('oculto');
  mostrarPasoTutorial();
}

function mostrarPasoTutorial() {
  if (!tutorial) return;
  const paso = tutorial.pasos[tutorial.paso];
  $('#tuto-texto').textContent = paso.texto;
  $$('.tuto-resaltado').forEach((el) => el.classList.remove('tuto-resaltado'));
  let objetivo = null;
  if (tutorial.paso === 'sacar') {
    const idx = E.P.hornos.findIndex((g) => g);
    objetivo = idx >= 0 ? $(`[data-tap="horno:${idx}"]`) : null;
  } else if (paso.objetivo) {
    objetivo = $(paso.objetivo);
  }
  const mano = $('#tuto-mano');
  if (objetivo) {
    objetivo.classList.add('tuto-resaltado');
    const r = objetivo.getBoundingClientRect();
    const m = $('#marco').getBoundingClientRect();
    mano.style.left = r.left + r.width / 2 - m.left + 'px';
    mano.style.top = r.top + r.height * 0.62 - m.top + 'px';
    mano.classList.remove('oculto');
    /* el globo se acomoda lejos del objetivo */
    const globo = $('#tuto-globo');
    const arriba = r.top - m.top > m.height * 0.55;
    globo.classList.toggle('arriba', arriba);
    if (arriba) {
      /* debajo de la burbuja del pedido, para no tapar lo que pidió el cliente */
      const burb = document.querySelector('#slots-clientes .burbuja');
      const top = burb ? burb.getBoundingClientRect().bottom - m.top + 8 : 62;
      globo.style.top = top + 'px';
    } else {
      globo.style.top = '';
    }
  } else {
    mano.classList.add('oculto');
  }
}

function avanzarTutorial(accion) {
  if (!tutorial) return;
  const { tipo, dato } = accion;
  const p = tutorial.paso;
  if (p === 'masa' && tipo === 'masa') tutorial.paso = 'hornear';
  else if ((p === 'hornear' || p === 'devolver') && tipo === 'hornear') tutorial.paso = 'sacar';
  else if (p === 'sacar' && tipo === 'sacar') {
    if (dato.fase === 'cruda') tutorial.paso = 'devolver';
    else if (dato.fase === 'quemada') tutorial.paso = 'descartar';
    else tutorial.paso = 'crema';
  } else if (p === 'descartar' && tipo === 'descartar') tutorial.paso = 'masa';
  else if (p === 'descartar' && tipo === 'masa') tutorial.paso = 'hornear';
  else if (p === 'crema' && tipo === 'deco') tutorial.paso = 'topping';
  else if (p === 'topping' && tipo === 'topping') tutorial.paso = 'entregar';
  else return;
  mostrarPasoTutorial();
}

function terminarTutorial() {
  if (!tutorial) return;
  tutorial = null;
  E.setGate(null);
  E.setCongelar(false);
  E.setVentanaBonus(0);
  G.marcarTutorialVisto();
  $('#overlay-tutorial').classList.add('oculto');
  $$('.tuto-resaltado').forEach((el) => el.classList.remove('tuto-resaltado'));
  toast('¡Juego libre! Atiende a todos los clientes', $('#pantalla-juego'));
}

/* Filtro extra del tutorial para no iluminar zonas equivocadas */
function tutoPermiteDrop(dropId) {
  if (!tutorial) return true;
  const p = tutorial.paso;
  if (p === 'hornear' || p === 'devolver') return dropId.startsWith('horno:');
  if (p === 'descartar') return dropId === 'caneca';
  if (p === 'entregar') return dropId.startsWith('cliente:');
  return false;
}

/* ══════════════ PAUSA ══════════════ */
export function abrirPausa() {
  if (!E.P || E.P.terminado || pantallaActual !== 'pantalla-juego') return;
  if (!$('#overlay-countdown').classList.contains('oculto')) return;
  E.setPausa(true);
  refrescarIconosMute();
  $('#overlay-pausa').classList.remove('oculto');
}

function cerrarPausa() {
  $('#overlay-pausa').classList.add('oculto');
  if (E.P && !E.P.terminado) E.setPausa(false);
}

/* ══════════════ HUD / FX ══════════════ */
function toast(msg, donde) {
  const t = $('#toast-juego');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 1400);
  void donde;
}

function textoFlotante(x, y, txt, clase = '') {
  const el = document.createElement('div');
  el.className = 'texto-flotante ' + clase;
  el.textContent = txt;
  const m = $('#marco').getBoundingClientRect();
  el.style.left = x - m.left + 'px';
  el.style.top = y - m.top + 'px';
  $('#capa-fx').appendChild(el);
  setTimeout(() => el.remove(), 750);
}

function volarMonedas(desdeEl, cantidad = 5) {
  const destino = $('#hud-monedas');
  if (!desdeEl || !destino) return;
  const m = $('#marco').getBoundingClientRect();
  const a = desdeEl.getBoundingClientRect();
  const b = destino.getBoundingClientRect();
  for (let i = 0; i < cantidad; i++) {
    const el = document.createElement('div');
    el.className = 'moneda-vuelo';
    const x0 = a.left + a.width / 2 - m.left + (Math.random() * 30 - 15);
    const y0 = a.top + a.height / 2 - m.top + (Math.random() * 20 - 10);
    el.style.setProperty('--x0', x0 + 'px');
    el.style.setProperty('--y0', y0 + 'px');
    el.style.setProperty('--x1', b.left + b.width / 2 - m.left + 'px');
    el.style.setProperty('--y1', b.top + b.height / 2 - m.top + 'px');
    el.style.animationDelay = i * 45 + 'ms';
    $('#capa-fx').appendChild(el);
    setTimeout(() => el.remove(), 700 + i * 45);
  }
}

/* ══════════════ RENDER DE SECCIONES DEL JUEGO ══════════════ */
function renderTabla() {
  const cont = $('#tabla-galleta');
  const g = E.P ? E.P.tabla : null;
  cont.innerHTML = g ? galletaHTML(g, 1, 'animar-plop') : '';
  $('#tabla-slot').classList.toggle('vacia', !g);
  actualizarFrascosHabilitados();
}

function renderRepisa() {
  E.P.repisa.forEach((g, i) => {
    const el = $(`[data-drag="repisa:${i}"]`);
    if (el) el.innerHTML = g ? galletaHTML(g, 0.52, 'animar-plop') : '';
  });
}

function renderHorno() {
  E.P.hornos.forEach((g, i) => {
    const puesto = $$('.horno-puesto')[i];
    if (!puesto) return;
    const cont = puesto.querySelector('.contenido');
    cont.innerHTML = g ? galletaHTML({ ...g, coccion: faseVisual(g) }, 0.62) : '';
    puesto.classList.toggle('ocupado', !!g);
  });
}

function faseVisual(g) {
  const f = E.faseHorno(g);
  return f === 'perfecta' ? 'perfecta' : f === 'pasada' ? 'pasada' : f === 'quemada' ? 'quemada' : 'cruda';
}

function agregarCliente(c) {
  const slot = $(`.cliente-slot[data-slot="${c.slot}"]`);
  if (!slot) return;
  const el = document.createElement('div');
  el.className = 'cliente entra' + (c.tipo === 'vip' ? ' vip' : '');
  el.dataset.drop = `cliente:${c.id}`;
  el.innerHTML = burbujaHTML(c) + clienteSVG(c);
  slot.appendChild(el);
  clientesEls.set(c.id, {
    el,
    fill: el.querySelector('.paciencia-fill'),
    barra: el.querySelector('.paciencia'),
    bocaG: el.querySelector('.boca-g'),
    mood: 'feliz',
    moodLockHasta: 0,
  });
  sfx.pop();
  /* si el globo del tutorial está arriba, reacomodarlo bajo la burbuja recién creada */
  if (tutorial) mostrarPasoTutorial();
}

function actualizarBurbuja(c) {
  const ref = clientesEls.get(c.id);
  if (!ref) return;
  c.pedido.items.forEach((it, i) => {
    const el = ref.el.querySelector(`.burbuja-item[data-item="${i}"]`);
    if (el) el.classList.toggle('servida', it.servido);
  });
}

function moodPorPaciencia(pct) {
  if (pct > 0.5) return 'feliz';
  if (pct > 0.2) return 'preocupada';
  return 'enojada';
}

/* cara de disgusto + sacudida de la burbuja cuando el cliente rechaza la entrega */
function reaccionRechazo(clienteId) {
  const ref = clientesEls.get(clienteId);
  if (!ref) return;
  ref.mood = 'enojada';
  ref.bocaG.innerHTML = bocaSVG('enojada');
  ref.moodLockHasta = performance.now() + 1000;
  const burb = ref.el.querySelector('.burbuja');
  if (burb) {
    burb.classList.remove('sacudir');
    void burb.offsetWidth;
    burb.classList.add('sacudir');
  }
}

/* ══════════════ FRAME (llamado desde el gameLoop) ══════════════ */
export function frame() {
  if (pantallaActual !== 'pantalla-juego' || !E.P) return;
  const P = E.P;

  if (P.modo === 'dia') $('#hud-timer').textContent = formatoTiempo(P.tRestanteMs);

  /* paciencia + caras */
  const ahora = performance.now();
  for (const c of P.clientes) {
    const ref = clientesEls.get(c.id);
    if (!ref || c.estado !== 'esperando') continue;
    const pct = c.pacienciaMs / c.pacienciaMaxMs;
    ref.fill.style.transform = `scaleX(${Math.max(0, pct).toFixed(4)})`;
    ref.barra.classList.toggle('p-media', pct <= 0.5 && pct > 0.2);
    ref.barra.classList.toggle('p-baja', pct <= 0.2);
    if (ref.moodLockHasta && ahora < ref.moodLockHasta) continue; // reacción temporal (rechazo)
    ref.moodLockHasta = 0;
    const mood = moodPorPaciencia(pct);
    if (mood !== ref.mood) {
      ref.mood = mood;
      ref.bocaG.innerHTML = bocaSVG(mood);
    }
  }

  /* anillos del horno (elementos cacheados; solo se escribe cuando cambia algo) */
  P.hornos.forEach((g, i) => {
    const p = puestosEls[i];
    if (!p) return;
    if (!g) {
      if (p._fase !== 'vacio') {
        p._fase = 'vacio';
        p._prog = null;
        p.style.setProperty('--prog', 0);
        p.className = 'horno-puesto' + clasesExtra(p);
      }
      return;
    }
    const fase = E.faseHorno(g);
    const prog = E.progresoAnillo(g).toFixed(3);
    if (prog !== p._prog) {
      p._prog = prog;
      p.style.setProperty('--prog', prog);
    }
    if (fase !== p._fase) {
      p._fase = fase;
      p.className = 'horno-puesto ocupado fase-' + fase + clasesExtra(p);
    }
  });
}

/* conserva marcadores transitorios (drag/tutorial) al reescribir className */
function clasesExtra(p) {
  const extra = ['drop-activa', 'drop-hover', 'tuto-resaltado'].filter((k) => p.classList.contains(k));
  return extra.length ? ' ' + extra.join(' ') : '';
}

/* ══════════════ FIN DE DÍA Y RESULTADOS ══════════════ */
function alFinalizar(r) {
  if (dragCtrl) dragCtrl.deseleccionar();
  const ov = $('#overlay-findia');
  ov.querySelector('.findia-texto').textContent = r.modo === 'pico' ? '¡Buen turno!' : '¡Se acabo el dia!';
  ov.classList.remove('oculto');
  setTimeout(() => {
    ov.classList.add('oculto');
    if (r.modo === 'pico') {
      const esRecord = G.registrarHoraPico(r.monedas, r.pedidosAtendidos);
      renderResultadosPico(r, esRecord);
    } else {
      G.registrarResultadoDia(r.dia, r.estrellas, r.monedas);
      renderResultadosDia(r);
    }
    mostrarPantalla('pantalla-resultados');
  }, 1500);
}

function contar(el, hasta, ms = 450) {
  const t0 = performance.now();
  function paso(ts) {
    const k = Math.min(1, (ts - t0) / ms);
    el.textContent = Math.round(hasta * (1 - Math.pow(1 - k, 2)));
    if (k < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

function renderResultadosDia(r) {
  const cont = $('#pantalla-resultados');
  const pose = r.estrellas >= 3 ? 'comiendo' : r.estrellas >= 1 ? 'celebrando' : 'sorpresa';
  const frase = r.estrellas >= 3 ? '¡Bernie no resistió y se comió una!' : r.estrellas >= 1 ? '¡Buen trabajo en la pastelería!' : '¡Casi! Inténtalo otra vez';
  const lineas = [
    ['Galletas vendidas', r.galletasVendidas],
    ['Propinas', r.propinas],
    ['Pedidos perfectos', r.pedidosPerfectos],
    ['Clientes perdidos', r.clientesPerdidos],
    ['Total', r.monedas, `/ ${r.objetivo}`],
  ];
  cont.innerHTML = `
    <canvas id="canvas-confeti"></canvas>
    <div class="tarjeta-resultados">
      <h2 class="titulo-px">Dia ${r.dia}</h2>
      <div class="res-lineas">${lineas.map((l, i) => `<div class="res-linea" style="--i:${i}"><span>${l[0]}</span><strong><span class="num" data-hasta="${l[1]}">0</span>${l[2] ? ` <small>${l[2]}</small>` : ''}</strong></div>`).join('')}</div>
      <div class="res-estrellas">${[1, 2, 3].map((i) => `<span class="res-estrella ${r.estrellas >= i ? 'gana' : ''}" style="--i:${i}">${ESTRELLA(r.estrellas >= i)}</span>`).join('')}</div>
      <img class="bernie-resultado" src="assets/bernie/bernie-${pose}.png" alt="Bernie">
      <p class="res-frase">${frase}</p>
      <div class="res-botones">
        <button class="btn btn-secundario" id="btn-repetir">Repetir</button>
        ${r.estrellas >= 1 && r.dia < 5 ? '<button class="btn btn-primario" id="btn-siguiente">Siguiente día</button>' : ''}
        ${r.estrellas >= 1 && r.dia === 5 ? '<button class="btn btn-primario" id="btn-ir-pico">¡Hora Pico!</button>' : ''}
        <button class="btn btn-secundario" id="btn-menu-res">Menú</button>
      </div>
    </div>`;
  animarResultados(r.estrellas, r.dia);
  $('#btn-repetir').addEventListener('click', () => { sfx.pop(); empezarDia(r.dia); });
  const sig = $('#btn-siguiente');
  if (sig) sig.addEventListener('click', () => { sfx.pop(); renderBriefing(r.dia + 1); mostrarPantalla('pantalla-briefing'); });
  const pico = $('#btn-ir-pico');
  if (pico) pico.addEventListener('click', () => { sfx.pop(); renderBriefingPico(); mostrarPantalla('pantalla-briefing'); });
  $('#btn-menu-res').addEventListener('click', () => { sfx.pop(); E.abandonar(); renderDias(); mostrarPantalla('pantalla-dias'); });
}

function renderResultadosPico(r, esRecord) {
  const cont = $('#pantalla-resultados');
  const lineas = [
    ['Monedas', r.monedas],
    ['Pedidos atendidos', r.pedidosAtendidos],
    ['Galletas vendidas', r.galletasVendidas],
    ['Récord', G.datos.horaPico.mejorPuntaje],
  ];
  cont.innerHTML = `
    <canvas id="canvas-confeti"></canvas>
    <div class="tarjeta-resultados">
      <h2 class="titulo-px">Hora Pico</h2>
      ${esRecord ? '<div class="banner-record"><img src="assets/bernie/bernie-guino.png" alt="Bernie guiña">¡NUEVO RECORD!</div>' : ''}
      <div class="res-lineas">${lineas.map((l, i) => `<div class="res-linea" style="--i:${i}"><span>${l[0]}</span><strong><span class="num" data-hasta="${l[1]}">0</span></strong></div>`).join('')}</div>
      <img class="bernie-resultado" src="assets/bernie/bernie-${esRecord ? 'celebrando' : 'sorpresa'}.png" alt="Bernie">
      <p class="res-frase">${esRecord ? '¡Bernie está orgullosa de ti!' : 'La fila pudo contigo… ¡otra ronda!'}</p>
      <div class="res-botones">
        <button class="btn btn-primario" id="btn-otra">Otra ronda</button>
        <button class="btn btn-secundario" id="btn-menu-res">Menú</button>
      </div>
    </div>`;
  $$('.res-linea .num').forEach((el, i) => timerRes(() => contar(el, Number(el.dataset.hasta)), 250 + i * 300));
  if (esRecord) {
    timerRes(() => { sfx.fanfarria(); lanzarConfeti($('#canvas-confeti'), { monedas: true }); }, 600);
  }
  $('#btn-otra').addEventListener('click', () => { sfx.pop(); empezarPico(); });
  $('#btn-menu-res').addEventListener('click', () => { sfx.pop(); E.abandonar(); renderDias(); mostrarPantalla('pantalla-dias'); });
}

function animarResultados(estrellas, dia) {
  const nums = $$('.res-linea .num');
  nums.forEach((el, i) => timerRes(() => contar(el, Number(el.dataset.hasta)), 250 + i * 300));
  const base = 250 + nums.length * 300;
  $$('.res-estrella.gana').forEach((el, i) => {
    timerRes(() => { el.classList.add('cae'); sfx.estrella(i); }, base + i * 350);
  });
  if (estrellas >= 1) {
    timerRes(() => { sfx.fanfarria(); lanzarConfeti($('#canvas-confeti'), { monedas: estrellas >= 3 }); }, base + estrellas * 350 + 150);
  }
  void dia;
}

/* ══════════════ CÓMO SE JUEGA (modal) ══════════════ */
function construirComo() {
  const demoCliente = `<div class="como-demo">${clienteSVG({ tipo: 'normal', variante: { colorCara: '#bfe3d0', accesorio: 'gorra', semilla: 0.3 } })}
    <div class="como-burbuja">${galletaHTML({ masa: 'vainilla', toppings: ['chispas_choc'], deco: ['glaseado_rosa'], coccion: 'perfecta' }, 0.3)}<div class="paciencia demo"><div class="paciencia-fill" style="width:60%"></div></div></div></div>`;
  const demoAnillo = `<div class="como-anillo"><div class="anillo-demo"></div><ul class="leyenda-anillo">
      <li><span class="pip gris"></span> Cruda</li><li><span class="pip dorado"></span> ¡Perfecta!</li>
      <li><span class="pip rojo"></span> Pasada</li><li><span class="pip navy"></span> Quemada</li></ul></div>`;
  const demoDecorar = `<div class="como-demo fila">${galletaHTML({ masa: 'chocolate', toppings: ['sprinkles'], deco: ['glaseado_rosa'], coccion: 'perfecta' }, 0.55)}<span class="flecha">&rarr;</span>${clienteSVG({ tipo: 'normal', variante: { colorCara: '#f7e3a1', accesorio: 'gafas', semilla: 0.7 } })}</div>`;
  const demoCombo = `<div class="como-demo fila"><span class="moneda-icono grande"></span><span class="badge-demo">x2</span>${ESTRELLA(true)}${ESTRELLA(true)}${ESTRELLA(true)}</div>`;
  const tarjetas = [
    ['Los pedidos y la paciencia', 'Cada cliente pide galletas exactas en su burbuja. Su barra de paciencia baja todo el tiempo: si llega a cero, se va triste.', demoCliente],
    ['Armar y hornear', 'Toca una masa y arrástrala al horno. Sácala cuando el anillo esté DORADO: esa es la ventana perfecta.', demoAnillo],
    ['Decorar y entregar', 'Después del horno, primero la CREMA y encima los toppings (chispas, perlas, lluvia de colores…). Arrastra la galleta hasta el cliente, o tócala y toca al cliente.', demoDecorar],
    ['Propinas, combo y estrellas', 'Entregar rápido da propinas. Pedidos perfectos seguidos suben tu combo: x2 y x3 de propina. Junta monedas para ganar estrellas.', demoCombo],
  ];
  $('#como-tarjetas').innerHTML = tarjetas.map(([t, txt, demo], i) => `
    <div class="como-tarjeta" data-i="${i}">
      <div class="como-medallon"><img src="assets/bernie/bernie-guino.png" alt="" loading="lazy" width="512" height="512"></div>
      <h3>${i + 1}. ${t}</h3>${demo}<p>${txt}</p>
    </div>`).join('');
  $('#como-puntos').innerHTML = tarjetas.map((_, i) => `<span class="punto ${i === 0 ? 'activo' : ''}" data-i="${i}"></span>`).join('');
  $('#como-tarjetas').addEventListener('scroll', () => {
    const sc = $('#como-tarjetas');
    const i = Math.round(sc.scrollLeft / sc.clientWidth);
    $$('#como-puntos .punto').forEach((p, j) => p.classList.toggle('activo', i === j));
  }, { passive: true });
}

function abrirComo() {
  $('#modal-como').classList.remove('oculto');
}

/* ══════════════ DRAG & TAP: CALLBACKS ══════════════ */
function idxDe(id) {
  return Number(id.split(':')[1]);
}

function puedeArrastrar(dragId) {
  if (!E.P || E.P.pausado || E.P.terminado) return false;
  return !!E.galletaEn(dragId);
}

function puedeSoltar(dragId, dropId) {
  if (!E.P || E.P.pausado || E.P.terminado) return false;
  const g = E.galletaEn(dragId);
  if (!g) return false;
  if (!tutoPermiteDrop(dropId)) return false;
  if (dropId.startsWith('horno:')) return g.coccion === 'cruda' && !E.P.hornos[idxDe(dropId)];
  if (dropId.startsWith('cliente:')) return g.coccion !== 'cruda';
  if (dropId === 'caneca') return true;
  if (dropId === 'tabla') return dragId !== 'tabla' && !E.P.tabla;
  if (dropId.startsWith('repisa:')) return dragId !== dropId && !E.P.repisa[idxDe(dropId)];
  return false;
}

function alSoltar(dragId, dropId) {
  if (dropId.startsWith('horno:')) return E.accionHornear(idxDe(dropId), dragId);
  if (dropId.startsWith('cliente:')) return E.accionEntregar(dragId, idxDe(dropId));
  if (dropId === 'caneca') return E.accionDescartar(dragId);
  if (dropId === 'tabla' || dropId.startsWith('repisa:')) return E.accionMover(dragId, dropId);
  return false;
}

function alTocar(id) {
  if (!E.P || E.P.pausado || E.P.terminado) return;
  const el = $(`[data-tap="${id}"]`);
  if (el && el.classList.contains('bloqueado')) {
    sfx.buzz();
    toast(`Se desbloquea el Día ${el.dataset.dia}`);
    return;
  }
  if (id.startsWith('masa:')) E.accionMasa(id.slice(5));
  else if (id.startsWith('top:')) E.accionTopping(id.slice(4));
  else if (id.startsWith('deco:')) E.accionDeco(id.slice(5));
  else if (id === 'deshacer') E.accionDeshacer();
  else if (id.startsWith('horno:')) {
    const i = idxDe(id);
    if (E.P.hornos[i]) E.accionSacarHorno(i);
  }
}

/* ══════════════ SUSCRIPCIONES A ESTADO ══════════════ */
function suscribir() {
  E.on('tabla', renderTabla);
  E.on('repisa', renderRepisa);
  E.on('horno', renderHorno);
  E.on('cliente:entra', agregarCliente);
  E.on('cliente:pierde', (c) => {
    const ref = clientesEls.get(c.id);
    if (ref) {
      ref.el.classList.add('perdido');
      const nube = document.createElement('div');
      nube.className = 'nube-gris';
      nube.innerHTML = NUBE_SVG;
      ref.el.appendChild(nube);
    }
    sfx.triste();
  });
  E.on('cliente:fuera', (c) => {
    const ref = clientesEls.get(c.id);
    if (ref) ref.el.remove();
    clientesEls.delete(c.id);
  });
  E.on('entrega:ok', ({ cliente }) => {
    actualizarBurbuja(cliente);
    if (tutorial) terminarTutorial();
  });
  E.on('pago', ({ cliente, total, propinas }) => {
    const ref = clientesEls.get(cliente.id);
    if (ref) {
      ref.el.classList.add('feliz');
      ref.bocaG.innerHTML = bocaSVG('feliz');
      const r = ref.el.getBoundingClientRect();
      textoFlotante(r.left + r.width / 2, r.top + 10, `+${total}`, 'pago');
      if (propinas > 0) textoFlotante(r.left + r.width / 2, r.top + 38, '¡Propina!', 'propina');
      volarMonedas(ref.el);
    }
    sfx.cash();
    const mon = $('#hud-monedas');
    mon.classList.remove('pop');
    void mon.offsetWidth;
    mon.classList.add('pop');
  });
  E.on('combo', (combo) => {
    const badge = $('#hud-combo');
    if (combo >= 2) {
      badge.textContent = combo >= 4 ? 'x3' : 'x2';
      badge.classList.remove('oculto');
    } else {
      badge.classList.add('oculto');
    }
  });
  E.on('hud', () => {
    if (!E.P) return;
    $('#hud-monedas-num').textContent = Math.round(E.P.monedas);
    if (E.P.modo === 'dia') {
      $('#hud-progreso-fill').style.transform = `scaleX(${Math.min(1, E.P.monedas / E.P.cfg.objetivo)})`;
    }
  });
  E.on('vidas', renderVidas);
  E.on('horno:fase', ({ fase }) => {
    if (fase === 'perfecta') { sfx.ding(); renderHorno(); }
    if (fase === 'quemada') { sfx.quemada(); renderHorno(); }
    if (fase === 'pasada') renderHorno();
  });
  E.on('pico:activo', () => {
    $('#banda-mostrador').classList.add('pulso-pico');
    toast('¡PICO FINAL! Llegan más rápido');
  });
  E.on('fin', alFinalizar);
  E.on('accion', (a) => { if (tutorial) avanzarTutorial(a); });
  E.on('fx', (f) => {
    /* durante el tutorial el globo de Bernie ya comunica el mensaje: sin toasts duplicados */
    const msg = tutorial ? null : f.msg;
    switch (f.tipo) {
      case 'error': sfx.buzz(); if (msg) toast(msg); break;
      case 'plop': sfx.plop(); break;
      case 'chispa': sfx.chispa(); break;
      case 'glaseado': sfx.glaseado(); break;
      case 'pop': sfx.pop(); break;
      case 'whoosh': sfx.whoosh(); break;
      case 'caneca': sfx.pop(); break;
      case 'cruda': sfx.buzz(); if (msg) toast(msg); break;
      case 'quemada': sfx.quemada(); if (msg) toast(msg); break;
      case 'rechazo': sfx.buzz(); if (msg) toast(msg); reaccionRechazo(f.clienteId); break;
    }
  });
}

/* ══════════════ INIT ══════════════ */
export function init() {
  initPortada();
  construirComo();
  suscribir();

  dragCtrl = initDrag($('#area-juego'), {
    puedeArrastrar,
    puedeSoltar,
    alSoltar,
    alTocar,
    alSeleccionar: (id) => { if (id) sfx.pop(); },
  });

  $('#btn-pausa').innerHTML = ICONO_PAUSA;
  $('#btn-deshacer').innerHTML = ICONO_DESHACER;
  $('#btn-pausa').addEventListener('click', abrirPausa);
  $('#btn-continuar').addEventListener('click', () => { sfx.pop(); cerrarPausa(); });
  $('#btn-reintentar').addEventListener('click', () => {
    sfx.pop();
    $('#overlay-pausa').classList.add('oculto');
    if (tutorial) { tutorial = null; E.setGate(null); $('#overlay-tutorial').classList.add('oculto'); }
    if (E.P.modo === 'pico') empezarPico();
    else empezarDia(E.P.diaActual);
  });
  $('#btn-como-pausa').addEventListener('click', () => { sfx.pop(); abrirComo(); });
  $('#btn-salir-menu').addEventListener('click', () => {
    sfx.pop();
    $('#overlay-pausa').classList.add('oculto');
    if (tutorial) { tutorial = null; E.setGate(null); E.setCongelar(false); $('#overlay-tutorial').classList.add('oculto'); }
    E.abandonar();
    renderDias();
    mostrarPantalla('pantalla-dias');
  });
  $('#btn-cerrar-como').addEventListener('click', () => { sfx.pop(); $('#modal-como').classList.add('oculto'); });
  $('#modal-como').addEventListener('click', (e) => { if (e.target === $('#modal-como')) $('#modal-como').classList.add('oculto'); });

  /* sin zoom por doble tap ni menú contextual dentro del juego */
  $('#area-juego').addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', () => { if (tutorial) mostrarPasoTutorial(); });
}
