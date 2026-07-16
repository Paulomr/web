/* =====================================================================
   Texturas 100% por codigo (Graphics -> generateTexture). Cero assets.
   Direccion de arte "Crunchy Munch": atardecer rosado, sol blanco,
   Bernie el oso como proyectil, mundo galleta pastel.
   ===================================================================== */
import { MATS, CAN, PROJ, TNT, GROUND_H } from '../config.js';

function g(scene){ return scene.make.graphics({add:false}); }

/* Textura de bloque cacheada por material+tamano: 'blk_wood_150x22' */
export function ensureBlockTexture(scene, t, w, h){
  const key=`blk_${t}_${w}x${h}`;
  if(scene.textures.exists(key)) return key;
  const m=MATS[t], gr=g(scene);
  gr.fillStyle(m.color,1).fillRect(0,0,w,h);
  gr.lineStyle(3,m.dark,1).strokeRect(1.5,1.5,w-3,h-3);
  if(t==='wood'){ // vetas a lo largo del eje mayor
    gr.lineStyle(1,m.dark,0.35);
    if(w>=h) for(let y=6;y<h-3;y+=7) gr.lineBetween(4,y,w-4,y);
    else     for(let x=6;x<w-3;x+=7) gr.lineBetween(x,4,x,h-4);
  }else if(t==='stone'){ // juntas de sillares
    gr.lineStyle(2,m.dark,0.45);
    const s=Math.max(18,Math.min(w,h));
    for(let x=s;x<w;x+=s) gr.lineBetween(x,2,x,h-2);
    if(h>26) gr.lineBetween(2,h/2,w-2,h/2);
  }else{ // hielo: brillo diagonal
    gr.fillStyle(0xffffff,0.4).fillRect(w*0.15,3,Math.max(4,w*0.12),h-6);
    gr.fillStyle(0xffffff,0.25).fillRect(w*0.45,3,Math.max(3,w*0.07),h-6);
  }
  gr.generateTexture(key,w,h); gr.destroy();
  return key;
}

/* Lata de tomate: el objetivo. Cilindro rojo con tapa metálica, etiqueta crema
   con su banda verde y tomates. Dibujada por código como todo el juego. */
function buildCan(scene){
  const CW=CAN.w, CH=CAN.h, PAD=4, DW=CW+PAD*2, DH=CH+PAD*2;
  const x=PAD, y=PAD, cx=x+CW/2;
  const TAPA_RY=5.5, BASE_Y=y+CH-3;
  const gr=g(scene);

  // contorno oscuro (silueta un pelo mayor que el cuerpo)
  gr.fillStyle(0x5e1109,1);
  gr.fillRect(x-2,y+3,CW+4,CH-6);
  gr.fillEllipse(cx,y+3,CW+4,TAPA_RY*2+4);
  gr.fillEllipse(cx,BASE_Y,CW+4,TAPA_RY*2+3);

  // cuerpo rojo + volumen del cilindro (luz al centro-izquierda, sombra al borde)
  gr.fillStyle(0xd6302a,1).fillRect(x,y+3,CW,CH-6).fillEllipse(cx,BASE_Y,CW,TAPA_RY*2);
  gr.fillStyle(0xf2564a,0.85).fillRect(x+CW*0.18,y+3,CW*0.16,CH-6); // brillo vertical
  gr.fillStyle(0x9d1c14,0.5).fillRect(x+CW-6,y+3,6,CH-6);           // sombra derecha
  gr.fillStyle(0x9d1c14,0.35).fillRect(x,y+3,3,CH-6);               // sombra izquierda

  // tapa metálica con anilla
  gr.fillStyle(0x7c7660,1).fillEllipse(cx,y+3,CW,TAPA_RY*2);
  gr.fillStyle(0xc3bda0,1).fillEllipse(cx,y+2.5,CW-5,TAPA_RY*2-2.5);
  gr.lineStyle(1,0x7c7660,0.9).strokeEllipse(cx,y+2.5,CW-11,TAPA_RY*2-5);
  gr.fillStyle(0xe8e3cd,0.9).fillEllipse(cx-4,y+1.5,CW*0.4,2.4);   // reflejo
  gr.fillStyle(0x9a947c,1).fillEllipse(cx+7,y+3,7,3);              // anilla

  // etiqueta crema entre dos filetes dorados
  const LY=y+13, LH=CH-24;
  gr.fillStyle(0xe0b45c,1).fillRect(x,LY-2,CW,2).fillRect(x,LY+LH,CW,2);
  gr.fillStyle(0xf7edd6,1).fillRect(x,LY,CW,LH);
  gr.fillStyle(0xd9cdb0,0.55).fillRect(x+CW-5,LY,5,LH);            // curvatura
  gr.fillStyle(0xffffff,0.5).fillRect(x+CW*0.18,LY,CW*0.14,LH);

  // tomates de la etiqueta
  gr.fillStyle(0xc4241c,1).fillCircle(cx-6,LY+LH*0.5,4.6).fillCircle(cx+5,LY+LH*0.46,4)
                          .fillCircle(cx,LY+LH*0.66,4.2);
  gr.fillStyle(0xf2564a,0.9).fillCircle(cx-7.4,LY+LH*0.42,1.7).fillCircle(cx+3.8,LY+LH*0.38,1.4);
  gr.fillStyle(0x3f8a34,1).fillRect(cx-7,LY+LH*0.3,2,3).fillRect(cx+4,LY+LH*0.27,2,3); // rabitos

  // banda verde inferior (el "TOMATES ENTEROS PELADOS" de la lata real)
  gr.fillStyle(0x3f8a34,1).fillRect(x,LY+LH-7,CW,6);
  gr.fillStyle(0x2c6624,1).fillRect(x,LY+LH-2,CW,1);

  // "TOMATES" a 6px: a este tamaño es una manchita, pero lee como etiqueta
  const txt=scene.make.text({add:false,text:'TOMATES',style:{
    fontFamily:'monospace',fontStyle:'bold',fontSize:'7px',color:'#c4241c'}});
  const rt=scene.make.renderTexture({width:DW,height:DH,add:false});
  rt.draw(gr,0,0); rt.draw(txt,cx-txt.width/2,LY+2);
  rt.saveTexture('can'); rt.destroy(); txt.destroy(); gr.destroy();
}

/* Salpicaduras de tomate: manchas irregulares con gotas sueltas. Tres variantes
   para que el suelo no quede con el mismo sello repetido. */
function buildSplats(scene){
  for(let v=0;v<3;v++){
    const gr=g(scene), W=120, H=42, cx=W/2, cy=H-9;
    let s=1337+v*911;
    const rnd=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
    const capa=(color,alpha,esc)=>{
      gr.fillStyle(color,alpha);
      // cuerpo central achatado + lóbulos SOLAPADOS = charco de una pieza
      gr.fillEllipse(cx,cy,66*esc,17*esc);
      for(let i=0;i<7;i++){
        const a=rnd()*Math.PI*2, d=(8+rnd()*15)*esc;
        gr.fillEllipse(cx+Math.cos(a)*d*1.15, cy+Math.sin(a)*d*0.3,
                       (11+rnd()*14)*esc, (5+rnd()*7)*esc);
      }
    };
    capa(0x8f1109,1,1.06);   // borde oscuro
    capa(0xc4241c,1,0.9);    // pulpa
    capa(0xe8483c,0.95,0.55);// centro brillante
    // gotas sueltas: pegadas al charco, no desperdigadas por el suelo
    for(let i=0;i<8;i++){
      const dx=(rnd()-0.5)*82, r=1.3+rnd()*2.2;
      gr.fillStyle(rnd()>0.5?0xc4241c:0x8f1109,1);
      gr.fillEllipse(cx+dx, cy-rnd()*9, r*2, r*1.5);
    }
    // pepitas
    gr.fillStyle(0xf7e8b0,0.95);
    for(let i=0;i<4;i++) gr.fillEllipse(cx+(rnd()-0.5)*44, cy-rnd()*8, 2.6, 1.8);
    gr.generateTexture('splat'+v,W,H); gr.destroy();
  }
}

export function buildTextures(scene){
  let gr;

  // particula 6x6
  gr=g(scene); gr.fillStyle(0xffffff,1).fillRect(0,0,6,6);
  gr.generateTexture('px',6,6); gr.destroy();

  // proyectil: BERNIE, el oso heroe de las galletas
  const R=PROJ.r, D=R*2+10;
  gr=g(scene);
  // orejas (detras de la cabeza)
  gr.fillStyle(0x6e4426,1).fillCircle(D/2-R+3,D/2-R+5,7).fillCircle(D/2+R-3,D/2-R+5,7);
  gr.fillStyle(0xc98a52,1).fillCircle(D/2-R+3,D/2-R+5,3.5).fillCircle(D/2+R-3,D/2-R+5,3.5);
  // cabeza
  gr.fillStyle(0x6e4426,1).fillCircle(D/2,D/2,R+2);
  gr.fillStyle(0xa9744a,1).fillCircle(D/2,D/2,R);
  gr.fillStyle(0xc98a52,0.5).fillCircle(D/2-4,D/2-5,R*0.55); // luz superior
  // hocico crema + nariz
  gr.fillStyle(0xf3dcbc,1).fillEllipse(D/2,D/2+6,17,12);
  gr.fillStyle(0x3a2210,1).fillEllipse(D/2,D/2+3,7,5);
  // ojos decididos + cenio de heroe
  gr.fillStyle(0xffffff,1).fillCircle(D/2-7,D/2-4,4).fillCircle(D/2+7,D/2-4,4);
  gr.fillStyle(0x1c1008,1).fillCircle(D/2-6,D/2-4,2).fillCircle(D/2+6,D/2-4,2);
  gr.fillStyle(0x4a2c14,1).fillRect(D/2-11,D/2-11,9,3).fillRect(D/2+2,D/2-11,9,3);
  gr.generateTexture('ball',D,D); gr.destroy();

  buildCan(scene);
  buildSplats(scene);

  // caja TNT (caja + texto via RenderTexture)
  const S=TNT.size;
  gr=g(scene);
  gr.fillStyle(0x8f2410,1).fillRect(0,0,S,S);
  gr.fillStyle(0xc0452a,1).fillRect(3,3,S-6,S-6);
  gr.lineStyle(3,0x5a0f06,1).strokeRect(1.5,1.5,S-3,S-3);
  gr.fillStyle(0xf9e8c8,1).fillRect(4,S/2-8,S-8,16);
  gr.lineStyle(2,0x5a0f06,1).lineBetween(S/2,0,S/2,5); // mecha
  const txt=scene.make.text({add:false,text:'TNT',style:{
    fontFamily:'monospace',fontStyle:'bold',fontSize:'13px',color:'#5a0f06'}});
  const rt=scene.make.renderTexture({width:S,height:S,add:false});
  rt.draw(gr,0,0); rt.draw(txt,S/2-txt.width/2,S/2-txt.height/2);
  rt.saveTexture('tnt'); rt.destroy(); txt.destroy(); gr.destroy();

  // Honda: horquilla de madera noble. Se construye por capas (contorno → albura
  // → duramen → luz → vetas → nudos) para que la madera tenga profundidad en vez
  // de ser un palo de color plano.
  gr=g(scene);
  const CXS=44, DWS=88, DHS=182;
  const trunk=(x0,y0,x1,y1,w,c,a=1)=>{ gr.lineStyle(w,c,a);
    gr.beginPath(); gr.moveTo(x0,y0); gr.lineTo(x1,y1); gr.strokePath(); };
  // brazos: el tronco sube y se abre en V
  const YB=172, YF=74, LX=16, RX=72, YT=14;
  // 1) contorno oscuro
  trunk(CXS,YB,CXS,YF-4,24,0x2b170a); trunk(CXS,YF+4,LX,YT,18,0x2b170a); trunk(CXS,YF+4,RX,YT,18,0x2b170a);
  // 2) albura (madera clara del borde)
  trunk(CXS,YB-1,CXS,YF-2,19,0x8a5a33); trunk(CXS,YF+2,LX+1,YT+2,14,0x8a5a33); trunk(CXS,YF+2,RX-1,YT+2,14,0x8a5a33);
  // 3) duramen (corazón más oscuro y cálido)
  trunk(CXS,YB-2,CXS,YF,15,0x6b4423); trunk(CXS,YF+1,LX+2,YT+3,10.5,0x6b4423); trunk(CXS,YF+1,RX-2,YT+3,10.5,0x6b4423);
  // 4) luz del atardecer rosado por la izquierda
  trunk(CXS-4.5,YB-8,CXS-4.5,YF+2,3.5,0xa9744a,0.9); trunk(CXS-2,YF-2,LX+3,YT+5,3,0xa9744a,0.85);
  trunk(CXS+5,YB-8,CXS+5,YF+2,2,0x4a2c14,0.5); // sombra derecha
  // 5) vetas largas que siguen la fibra
  gr.lineStyle(1,0x4a2c14,0.45);
  gr.lineBetween(CXS-3,YB-14,CXS-3,YF+4); gr.lineBetween(CXS+2,YB-8,CXS+2,YF+2);
  gr.lineBetween(CXS+6,YB-20,CXS+6,YF+8);
  gr.lineStyle(1,0x4a2c14,0.35);
  gr.lineBetween(CXS-2,YF-2,LX+5,YT+7); gr.lineBetween(CXS+3,YF-2,RX-5,YT+7);
  // 6) nudos de la madera (los anillos delatan que es un tronco)
  const nudo=(nx,ny,r)=>{ gr.lineStyle(1.6,0x4a2c14,0.75); gr.strokeEllipse(nx,ny,r*2,r*1.5);
                          gr.lineStyle(1,0x4a2c14,0.5); gr.strokeEllipse(nx,ny,r,r*0.8); };
  nudo(CXS+1,124,4.5); nudo(CXS-2,96,3);
  // 7) vendas de cuero en las puntas: dos correas y su costura
  const venda=(vx)=>{
    gr.fillStyle(0x2b170a,1).fillRect(vx-2,YT-8,17,22);
    gr.fillStyle(0x7a4c28,1).fillRect(vx,YT-6,13,18);
    gr.fillStyle(0xa9744a,0.55).fillRect(vx+1,YT-6,4,18);    // luz del cuero
    gr.fillStyle(0x4a2c14,0.7).fillRect(vx,YT+1,13,2.5);     // separación de correas
    gr.fillStyle(0xd9b98c,0.6);                              // puntadas
    for(let i=0;i<3;i++) gr.fillRect(vx+2+i*4,YT-4,1.5,1.5).fillRect(vx+2+i*4,YT+6,1.5,1.5);
  };
  venda(LX-7); venda(RX-6);
  // 8) base: tierra apelmazada + piedritas
  gr.fillStyle(0x5e3a1e,1).fillEllipse(CXS,YB+3,46,14);
  gr.fillStyle(0x7a4c28,1).fillEllipse(CXS,YB+1,40,11);
  gr.fillStyle(0x8a5a33,0.8).fillEllipse(CXS-6,YB-1,16,5);
  gr.fillStyle(0x4a2c14,0.6).fillCircle(CXS-14,YB+3,2).fillCircle(CXS+13,YB+4,2.4)
                            .fillCircle(CXS+4,YB+6,1.6);
  gr.generateTexture('sling',DWS,DHS); gr.destroy();

  // Suelo galleta: cobertura de fresa + masa con chips. La textura es tan alta
  // como la franja de suelo (GROUND_H) a proposito: si fuese mas baja, el
  // tileSprite la repetiria en vertical y el glaseado rosa reaparecia a media
  // tierra (se veia al alejar la camara).
  gr=g(scene);
  gr.fillStyle(0x8a5a2b,1).fillRect(0,0,64,GROUND_H);
  gr.fillStyle(0x6e4520,1);
  for(let i=0;i<Math.round(GROUND_H/3.7);i++) gr.fillRect((i*23)%60, 20+(i*31)%(GROUND_H-24), 5, 4); // chips
  gr.fillStyle(0x5a3a1a,0.5).fillRect(0,GROUND_H*0.55,64,GROUND_H*0.45); // la masa oscurece en profundidad
  gr.fillStyle(0xff8fb3,1).fillRect(0,0,64,14);   // glaseado fresa
  gr.fillStyle(0xd96a92,1).fillRect(0,12,64,4);   // borde del glaseado
  gr.fillStyle(0xffc6da,1).fillRect(0,0,64,3);    // brillo superior
  gr.generateTexture('groundTex',64,GROUND_H); gr.destroy();

  // cielo: degradado rosado de abajo (rosa calido) a arriba (crema)
  gr=g(scene);
  const top=Phaser.Display.Color.ValueToColor(0xfff3e4),  // crema arriba
        bot=Phaser.Display.Color.ValueToColor(0xff92ad);  // rosa calido abajo
  for(let i=0;i<16;i++){
    const c=Phaser.Display.Color.Interpolate.ColorWithColor(top,bot,15,i);
    gr.fillStyle(Phaser.Display.Color.GetColor(c.r,c.g,c.b),1).fillRect(0,i*16,64,16);
  }
  gr.generateTexture('sky',64,256); gr.destroy();

  // sol blanco con halo amplio (circulos concentricos de alpha decreciente)
  gr=g(scene);
  const CX=170;
  [[165,0.05],[135,0.07],[105,0.10],[80,0.16],[60,0.28],[46,0.65],[38,1]].forEach(([r,a])=>
    gr.fillStyle(0xffffff,a).fillCircle(CX,CX,r));
  gr.generateTexture('sun',340,340); gr.destroy();

  // nube crema
  gr=g(scene);
  gr.fillStyle(0xfff6ee,0.95);
  gr.fillCircle(26,26,16); gr.fillCircle(50,20,20); gr.fillCircle(74,27,15);
  gr.fillRect(24,24,52,14);
  gr.generateTexture('cloud',100,48); gr.destroy();

  // colinas pastel (rosa empolvado y menta, dos texturas)
  gr=g(scene);
  gr.fillStyle(0xe8a7bb,1).fillEllipse(160,110,320,180);
  gr.generateTexture('hill',320,110); gr.destroy();
  gr=g(scene);
  gr.fillStyle(0xb7dcc3,1).fillEllipse(160,110,320,180);
  gr.generateTexture('hillMint',320,110); gr.destroy();
}
