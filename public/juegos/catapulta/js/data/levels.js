/* =====================================================================
   Niveles data-driven. Anadir un nivel = anadir un objeto, cero codigo.
   Coordenadas: x absoluta del mundo; y = altura del CENTRO sobre el suelo
   (y=h/2 => apoyado en el suelo). Medidas de referencia:
     tablon vertical 22x110 -> y:55 | tablon horizontal sobre 2 verticales -> y:121
     caja 50x50 -> y:25/75/125 | cerdo r20 en suelo -> y:20 | sobre tablon -> y:152
     TNT 44 en suelo -> y:22
   ===================================================================== */
export const LEVELS=[
  { name:'PRIMER DISPARO', shots:3,
    blocks:[
      // caseta de una planta con tejado: al romper las patas todo cae sobre el cerdo
      {t:'wood',x:1390,y:55, w:22,h:110},{t:'wood',x:1510,y:55, w:22,h:110},
      {t:'wood',x:1450,y:121,w:170,h:22},
      {t:'ice', x:1450,y:155,w:48,h:48},
      {t:'wood',x:1610,y:25, w:50,h:50}, // caja suelta lateral
    ],
    targets:[{x:1450,y:20}],
  },

  { name:'PAREJA', shots:4,
    blocks:[
      // torre izquierda: cerdo abajo + cerdo expuesto en el tejado
      {t:'wood',x:1270,y:55, w:22,h:110},{t:'wood',x:1390,y:55, w:22,h:110},
      {t:'wood',x:1330,y:121,w:160,h:22},
      // torre derecha con remate de hielo
      {t:'wood',x:1560,y:55, w:22,h:110},{t:'wood',x:1680,y:55, w:22,h:110},
      {t:'wood',x:1620,y:121,w:160,h:22},
      {t:'ice', x:1620,y:155,w:48,h:48},
    ],
    // cerdos: bajo la mesa izq (colapso) + sobre el tejado izq (directo) + expuesto a la derecha
    targets:[{x:1330,y:20},{x:1330,y:154},{x:1770,y:20}],
  },

  { name:'HIELO Y TNT', shots:4,
    blocks:[
      {t:'ice', x:1300,y:25, w:50,h:50},          // muro bajo: no desvia los lobs
      // fortin de madera colapsable con remate de hielo
      {t:'wood',x:1560,y:55, w:22,h:110},{t:'wood',x:1680,y:55, w:22,h:110},
      {t:'wood',x:1620,y:121,w:170,h:22},
      {t:'ice', x:1620,y:154,w:46,h:46},
    ],
    tnt:[{x:1745,y:22}],                          // TNT en suelo, accesible por lob alto
    targets:[{x:1380,y:20},{x:1620,y:20},{x:1830,y:20}],
  },

  { name:'FORTALEZA', shots:4,
    blocks:[
      // torre de madera de 2 plantas con remate de piedra (masa que aplasta al caer)
      {t:'wood', x:1420,y:55, w:22,h:110},{t:'wood',x:1560,y:55, w:22,h:110},
      {t:'wood', x:1490,y:121,w:180,h:22},
      {t:'wood', x:1450,y:158,w:22,h:60},{t:'wood',x:1530,y:158,w:22,h:60},
      {t:'wood', x:1490,y:199,w:140,h:20},
      {t:'stone',x:1490,y:233,w:54,h:46},
      {t:'stone',x:1790,y:30, w:60,h:60},         // pedestal para el cerdo alto
    ],
    tnt:[{x:1650,y:22}],                          // TNT a la vista junto a la torre
    targets:[{x:1490,y:20},{x:1490,y:154},{x:1790,y:75}],
  },

  { name:'GRAN CASTILLO', shots:5,
    blocks:[
      {t:'wood', x:1220,y:55, w:22,h:110},{t:'wood',x:1340,y:55, w:22,h:110},
      {t:'wood', x:1280,y:121,w:150,h:22},
      {t:'stone',x:1560,y:55, w:22,h:110},{t:'stone',x:1740,y:55, w:22,h:110},
      {t:'stone',x:1650,y:122,w:220,h:24},
      {t:'wood', x:1600,y:189,w:22,h:110},{t:'wood',x:1700,y:189,w:22,h:110},
      {t:'wood', x:1650,y:255,w:160,h:22},
      {t:'stone',x:1980,y:30, w:60,h:60},{t:'stone',x:1980,y:90,w:60,h:60},
    ],
    tnt:[{x:1440,y:22},{x:1650,y:156},{x:1870,y:22}],
    targets:[{x:1280,y:20},{x:1650,y:20},{x:1650,y:286},{x:1980,y:140}],
  },

  /* ---- niveles 6-10: combos nuevos, dificultad creciente ---- */

  { name:'DOBLE CHISPA', shots:4,       // primer combo de TNT en cadena (120px)
    blocks:[
      {t:'wood',x:1290,y:55, w:22,h:110},{t:'wood',x:1410,y:55, w:22,h:110},
      {t:'wood',x:1350,y:121,w:170,h:22},
    ],
    tnt:[{x:1500,y:22},{x:1620,y:22}],
    targets:[{x:1240,y:20},{x:1350,y:154},{x:1560,y:20}],
  },

  { name:'TORRE DE BARQUILLOS', shots:4, // torre alta de madera con remate de piedra
    blocks:[
      {t:'wood', x:1540,y:55, w:22,h:110},{t:'wood',x:1660,y:55, w:22,h:110},
      {t:'wood', x:1600,y:121,w:170,h:22},
      {t:'wood', x:1560,y:187,w:22,h:110},{t:'wood',x:1640,y:187,w:22,h:110},
      {t:'wood', x:1600,y:253,w:140,h:22},
      {t:'stone',x:1600,y:287,w:54,h:46},
    ],
    targets:[{x:1470,y:20},{x:1672,y:154},{x:1730,y:20}],
  },

  { name:'MURALLA GLASEADA', shots:4,   // muros bajos + portal lejano
    blocks:[
      {t:'ice',  x:1300,y:25,w:50,h:50},{t:'ice',x:1360,y:25,w:50,h:50},
      {t:'stone',x:1450,y:30,w:60,h:60},{t:'stone',x:1450,y:90,w:60,h:60},
      {t:'wood', x:1820,y:55, w:22,h:110},{t:'wood',x:1940,y:55, w:22,h:110},
      {t:'wood', x:1880,y:121,w:170,h:22},
    ],
    tnt:[{x:1650,y:22}],
    targets:[{x:1550,y:20},{x:1750,y:20},{x:1880,y:154}],
  },

  { name:'TRACA CRUJIENTE', shots:4,    // cadena de 3 TNT (150px entre si)
    blocks:[
      {t:'wood',x:1240,y:55, w:22,h:110},{t:'wood',x:1360,y:55, w:22,h:110},
      {t:'wood',x:1300,y:121,w:170,h:22},
    ],
    // cadena separada del portal: el cerdo del tejado exige un 2o tiro
    tnt:[{x:1500,y:22},{x:1650,y:22},{x:1800,y:22}],
    targets:[{x:1300,y:154},{x:1575,y:20},{x:1725,y:20},{x:1870,y:20}],
  },

  { name:'EL GRAN BANQUETE', shots:5,   // mezcla final: torre pesada + TNT + pedestal
    blocks:[
      {t:'wood', x:1390,y:55, w:22,h:110},{t:'wood',x:1510,y:55, w:22,h:110},
      {t:'wood', x:1450,y:121,w:180,h:22},
      {t:'wood', x:1420,y:158,w:22,h:60},{t:'wood',x:1480,y:158,w:22,h:60},
      {t:'wood', x:1450,y:199,w:140,h:20},
      {t:'stone',x:1450,y:233,w:54,h:46},
      {t:'stone',x:1850,y:30, w:60,h:60},{t:'stone',x:1850,y:90,w:60,h:60},
    ],
    tnt:[{x:1620,y:22}],
    targets:[{x:1450,y:20},{x:1500,y:229},{x:1700,y:20},{x:1850,y:140}],
  },
];
