/* =====================================================================
   Niveles data-driven. Anadir un nivel = anadir un objeto, cero codigo.
   Lienzo logico 720x1080. Coordenadas absolutas.
     cookie : posicion inicial de la galleta
     bear   : centro del sprite de Bernie (la boca se calcula por skin)
     ropes  : [{x,y,len}] ancla fija + largo de cuerda en px
     chips  : hasta 3 chispas de chocolate (estrellas)
     bubbles: [{x,y,drift?}] burbuja; drift = deriva horizontal al flotar
     fans   : [{x,y,angle}] ventilador; angle en grados (0=derecha, 180=izq)
   Packs: 1-3 cuerdas · 4-6 chispas+timing · 7-9 burbujas (noche/vampira)
          · 10-12 ventilador y combos (navidad).
   ===================================================================== */
export const LEVELS=[
  /* ---- 1-3: solo cuerdas ---- */
  { name:'PRIMER CORTE',
    cookie:{x:360,y:410}, bear:{x:360,y:900},
    ropes:[{x:360,y:120,len:300}],
    chips:[{x:360,y:540},{x:360,y:660},{x:360,y:780}],
  },
  { name:'DOBLE NUDO',
    cookie:{x:360,y:390}, bear:{x:360,y:900},
    ropes:[{x:170,y:110,len:350},{x:550,y:110,len:350}],
    chips:[{x:360,y:520},{x:360,y:650},{x:360,y:780}],
  },
  { name:'EL PENDULO',
    cookie:{x:360,y:395}, bear:{x:620,y:880},
    ropes:[{x:360,y:110,len:290},{x:620,y:180,len:335}],
    chips:[{x:490,y:470},{x:620,y:630},{x:620,y:750}],
  },

  /* ---- 4-6: chispas + timing ---- */
  { name:'CORTE AL VUELO',
    cookie:{x:240,y:330}, bear:{x:540,y:790},
    ropes:[{x:360,y:110,len:250}],
    chips:[{x:390,y:420},{x:450,y:540},{x:510,y:660}],
  },
  { name:'TRES HILOS',
    cookie:{x:360,y:380}, bear:{x:320,y:860},
    ropes:[{x:120,y:140,len:340},{x:360,y:100,len:280},{x:600,y:140,len:340}],
    chips:[{x:430,y:425},{x:530,y:468},{x:390,y:600}],
  },
  { name:'GRAN COLUMPIO',
    cookie:{x:220,y:290}, bear:{x:250,y:840},
    ropes:[{x:500,y:130,len:322}],
    chips:[{x:420,y:430},{x:330,y:390},{x:240,y:540}],
  },

  /* ---- 7-9: burbujas (pack nocturno) ---- */
  { name:'LA BURBUJA',
    cookie:{x:360,y:400}, bear:{x:360,y:880},
    ropes:[{x:360,y:140,len:260}],
    chips:[{x:360,y:540},{x:360,y:300},{x:360,y:170}],
    bubbles:[{x:360,y:620}],
  },
  { name:'NOCHE FLOTANTE',
    cookie:{x:390,y:400}, bear:{x:240,y:880},
    ropes:[{x:560,y:130,len:320},{x:160,y:180,len:320}],
    chips:[{x:330,y:440},{x:240,y:350},{x:240,y:210}],
    bubbles:[{x:240,y:480}],
  },
  { name:'DERIVA LUNAR',
    cookie:{x:360,y:410}, bear:{x:560,y:860},
    ropes:[{x:360,y:130,len:280}],
    chips:[{x:360,y:540},{x:430,y:460},{x:500,y:310}],
    bubbles:[{x:360,y:600,drift:1.3}],
  },

  /* ---- 10-12: ventilador y combos (pack navideno) ---- */
  { name:'EL SOPLIDO',
    cookie:{x:180,y:430}, bear:{x:540,y:880},
    ropes:[{x:180,y:130,len:300}],
    chips:[{x:300,y:640},{x:420,y:700},{x:520,y:780}],
    fans:[{x:110,y:700,angle:0}],
  },
  { name:'VIENTO NAVIDENO',
    cookie:{x:560,y:420}, bear:{x:200,y:880},
    ropes:[{x:560,y:140,len:280}],
    chips:[{x:560,y:560},{x:450,y:260},{x:330,y:240}],
    bubbles:[{x:560,y:600}],
    fans:[{x:640,y:300,angle:180}],
  },
  { name:'BANQUETE FINAL',
    cookie:{x:360,y:370}, bear:{x:540,y:900},
    ropes:[{x:200,y:110,len:300},{x:520,y:110,len:300}],
    chips:[{x:360,y:540},{x:450,y:380},{x:540,y:300}],
    bubbles:[{x:360,y:640}],
    fans:[{x:110,y:420,angle:0}],
  },
];

// Skin de Bernie por indice de nivel (arte oficial Crunchy Munch)
export function skinFor(i){
  if(i>=9) return 'navidena';
  if(i>=6) return 'vampira';
  return 'chef';
}
