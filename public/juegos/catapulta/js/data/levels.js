/* =====================================================================
   Niveles data-driven. Anadir un nivel = anadir un objeto, cero codigo.
   Coordenadas: x absoluta del mundo; y = altura del CENTRO sobre el suelo
   (y=h/2 => apoyado en el suelo). Medidas de referencia:
     tablon vertical 22x110 -> y:55 | tablon horizontal sobre 2 verticales -> y:121
     caja 50x50 -> y:25/75/125 | lata 36x46 en suelo -> y:23 | sobre tablon -> y:155
     TNT 44 en suelo -> y:22
   Una PLANTA de madera = 2 pilares de 110 + forjado de 22 => 132 de alto.
   Plantas apiladas: pilares y:55 / 187 / 319 ; forjados y:121 / 253 / 385.
   Lata sobre cada forjado: y:155 / 287 / 419.
   ===================================================================== */
export const LEVELS=[
  { name:'PRIMER DISPARO', shots:3,
    blocks:[
      // caseta de dos plantas: al romper las patas todo cae sobre la lata
      {t:'wood',x:1390,y:55, w:22,h:110},{t:'wood',x:1510,y:55, w:22,h:110},
      {t:'wood',x:1450,y:121,w:170,h:22},
      {t:'wood',x:1400,y:187,w:22,h:110},{t:'wood',x:1500,y:187,w:22,h:110},
      {t:'wood',x:1450,y:253,w:150,h:22},
      {t:'ice', x:1450,y:288,w:48,h:48},
      {t:'wood',x:1610,y:25, w:50,h:50}, // caja suelta lateral
    ],
    targets:[{x:1450,y:23},{x:1450,y:155}],
  },

  { name:'PAREJA', shots:4,
    blocks:[
      // torre izquierda de dos plantas: lata abajo + lata en el forjado
      {t:'wood',x:1270,y:55, w:22,h:110},{t:'wood',x:1390,y:55, w:22,h:110},
      {t:'wood',x:1330,y:121,w:160,h:22},
      {t:'wood',x:1285,y:187,w:22,h:110},{t:'wood',x:1375,y:187,w:22,h:110},
      {t:'wood',x:1330,y:253,w:140,h:22},
      // torre derecha con remate de hielo
      {t:'wood',x:1560,y:55, w:22,h:110},{t:'wood',x:1680,y:55, w:22,h:110},
      {t:'wood',x:1620,y:121,w:160,h:22},
      {t:'wood',x:1575,y:187,w:22,h:110},{t:'wood',x:1665,y:187,w:22,h:110},
      {t:'wood',x:1620,y:253,w:140,h:22},
      {t:'ice', x:1620,y:288,w:48,h:48},
    ],
    targets:[{x:1330,y:23},{x:1330,y:287},{x:1620,y:155},{x:1790,y:23}],
  },

  { name:'HIELO Y TNT', shots:4,
    blocks:[
      {t:'ice', x:1300,y:25, w:50,h:50},          // muro bajo: no desvia los lobs
      // fortin de madera de dos plantas con remate de hielo
      {t:'wood',x:1560,y:55, w:22,h:110},{t:'wood',x:1680,y:55, w:22,h:110},
      {t:'wood',x:1620,y:121,w:170,h:22},
      {t:'ice', x:1575,y:187,w:22,h:110},{t:'ice',x:1665,y:187,w:22,h:110},
      {t:'wood',x:1620,y:253,w:150,h:22},
      {t:'ice', x:1620,y:287,w:46,h:46},
    ],
    tnt:[{x:1745,y:22}],                          // TNT en suelo, accesible por lob alto
    targets:[{x:1380,y:23},{x:1620,y:23},{x:1620,y:155},{x:1840,y:23}],
  },

  { name:'FORTALEZA', shots:4,
    blocks:[
      // torre de madera de 3 plantas con remate de piedra (masa que aplasta)
      {t:'wood', x:1420,y:55, w:22,h:110},{t:'wood',x:1560,y:55, w:22,h:110},
      {t:'wood', x:1490,y:121,w:180,h:22},
      {t:'wood', x:1435,y:187,w:22,h:110},{t:'wood',x:1545,y:187,w:22,h:110},
      {t:'wood', x:1490,y:253,w:160,h:22},
      {t:'wood', x:1450,y:319,w:22,h:110},{t:'wood',x:1530,y:319,w:22,h:110},
      {t:'wood', x:1490,y:385,w:140,h:20},
      {t:'stone',x:1490,y:419,w:54,h:46},
      {t:'stone',x:1790,y:30, w:60,h:60},         // pedestal para la lata alta
      {t:'stone',x:1790,y:90, w:60,h:60},
    ],
    tnt:[{x:1650,y:22}],                          // TNT a la vista junto a la torre
    targets:[{x:1490,y:23},{x:1490,y:155},{x:1490,y:287},{x:1790,y:143}],
  },

  { name:'GRAN CASTILLO', shots:5,
    blocks:[
      // ala izquierda de dos plantas
      {t:'wood', x:1220,y:55, w:22,h:110},{t:'wood',x:1340,y:55, w:22,h:110},
      {t:'wood', x:1280,y:121,w:150,h:22},
      {t:'wood', x:1235,y:187,w:22,h:110},{t:'wood',x:1325,y:187,w:22,h:110},
      {t:'wood', x:1280,y:253,w:130,h:22},
      // torre del homenaje: piedra abajo, madera arriba
      {t:'stone',x:1560,y:55, w:22,h:110},{t:'stone',x:1740,y:55, w:22,h:110},
      {t:'stone',x:1650,y:122,w:220,h:24},
      {t:'wood', x:1600,y:189,w:22,h:110},{t:'wood',x:1700,y:189,w:22,h:110},
      {t:'wood', x:1650,y:255,w:160,h:22},
      {t:'wood', x:1610,y:321,w:22,h:110},{t:'wood',x:1690,y:321,w:22,h:110},
      {t:'wood', x:1650,y:387,w:140,h:22},
      {t:'stone',x:1650,y:421,w:50,h:44},
      // torreta lejana
      {t:'stone',x:1980,y:30, w:60,h:60},{t:'stone',x:1980,y:90,w:60,h:60},
      {t:'stone',x:1980,y:150,w:60,h:60},
    ],
    tnt:[{x:1440,y:22},{x:1650,y:156},{x:1870,y:22}],
    targets:[{x:1280,y:23},{x:1280,y:287},{x:1650,y:23},{x:1650,y:289},{x:1980,y:203}],
  },

  /* ---- niveles 6-10: combos nuevos, dificultad creciente ---- */

  { name:'DOBLE CHISPA', shots:4,       // primer combo de TNT en cadena (120px)
    blocks:[
      {t:'wood',x:1290,y:55, w:22,h:110},{t:'wood',x:1410,y:55, w:22,h:110},
      {t:'wood',x:1350,y:121,w:170,h:22},
      {t:'wood',x:1305,y:187,w:22,h:110},{t:'wood',x:1395,y:187,w:22,h:110},
      {t:'wood',x:1350,y:253,w:150,h:22},
    ],
    tnt:[{x:1500,y:22},{x:1620,y:22}],
    targets:[{x:1240,y:23},{x:1350,y:155},{x:1350,y:287},{x:1560,y:23}],
  },

  { name:'TORRE DE BARQUILLOS', shots:4, // torre alta de madera con remate de piedra
    blocks:[
      {t:'wood', x:1540,y:55, w:22,h:110},{t:'wood',x:1660,y:55, w:22,h:110},
      {t:'wood', x:1600,y:121,w:170,h:22},
      {t:'wood', x:1555,y:187,w:22,h:110},{t:'wood',x:1645,y:187,w:22,h:110},
      {t:'wood', x:1600,y:253,w:150,h:22},
      {t:'wood', x:1565,y:319,w:22,h:110},{t:'wood',x:1635,y:319,w:22,h:110},
      {t:'wood', x:1600,y:385,w:130,h:22},
      {t:'stone',x:1600,y:419,w:54,h:46},
    ],
    targets:[{x:1470,y:23},{x:1600,y:155},{x:1600,y:287},{x:1740,y:23}],
  },

  { name:'MURALLA GLASEADA', shots:4,   // muralla alta + portal lejano
    blocks:[
      {t:'ice',  x:1300,y:25,w:50,h:50},{t:'ice',x:1360,y:25,w:50,h:50},
      {t:'ice',  x:1330,y:75,w:50,h:50},
      {t:'stone',x:1450,y:30,w:60,h:60},{t:'stone',x:1450,y:90,w:60,h:60},
      {t:'stone',x:1450,y:150,w:60,h:60},
      {t:'wood', x:1820,y:55, w:22,h:110},{t:'wood',x:1940,y:55, w:22,h:110},
      {t:'wood', x:1880,y:121,w:170,h:22},
      {t:'wood', x:1835,y:187,w:22,h:110},{t:'wood',x:1925,y:187,w:22,h:110},
      {t:'wood', x:1880,y:253,w:150,h:22},
    ],
    tnt:[{x:1650,y:22}],
    targets:[{x:1450,y:203},{x:1550,y:23},{x:1750,y:23},{x:1880,y:155},{x:1880,y:287}],
  },

  { name:'TRACA CRUJIENTE', shots:4,    // cadena de 3 TNT (150px entre si)
    blocks:[
      {t:'wood',x:1240,y:55, w:22,h:110},{t:'wood',x:1360,y:55, w:22,h:110},
      {t:'wood',x:1300,y:121,w:170,h:22},
      {t:'wood',x:1255,y:187,w:22,h:110},{t:'wood',x:1345,y:187,w:22,h:110},
      {t:'wood',x:1300,y:253,w:150,h:22},
    ],
    // cadena separada del portal: la lata del tejado exige un 2o tiro
    tnt:[{x:1500,y:22},{x:1650,y:22},{x:1800,y:22}],
    targets:[{x:1300,y:155},{x:1300,y:287},{x:1575,y:23},{x:1725,y:23},{x:1870,y:23}],
  },

  { name:'EL GRAN BANQUETE', shots:5,   // mezcla final: torre pesada + TNT + pedestal
    blocks:[
      {t:'wood', x:1390,y:55, w:22,h:110},{t:'wood',x:1510,y:55, w:22,h:110},
      {t:'wood', x:1450,y:121,w:180,h:22},
      {t:'stone',x:1405,y:187,w:22,h:110},{t:'stone',x:1495,y:187,w:22,h:110},
      {t:'wood', x:1450,y:253,w:160,h:22},
      {t:'wood', x:1415,y:319,w:22,h:110},{t:'wood',x:1485,y:319,w:22,h:110},
      {t:'wood', x:1450,y:385,w:140,h:20},
      {t:'stone',x:1450,y:419,w:54,h:46},
      {t:'stone',x:1850,y:30, w:60,h:60},{t:'stone',x:1850,y:90,w:60,h:60},
      {t:'stone',x:1850,y:150,w:60,h:60},
    ],
    tnt:[{x:1620,y:22}],
    targets:[{x:1450,y:23},{x:1450,y:155},{x:1450,y:287},{x:1700,y:23},{x:1850,y:203}],
  },
];
