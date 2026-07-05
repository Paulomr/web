/* =====================================================================
   Texturas 100% por codigo (Graphics -> generateTexture). Cero assets.
   Direccion de arte "Crunchy Munch": atardecer rosado, sol blanco,
   Bernie el oso como proyectil, mundo galleta pastel.
   ===================================================================== */
import { MATS, PIG, PROJ, TNT } from '../config.js';

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

  // cerdo goloso (objetivo): verde pastel con migas de chocolate
  const P=PIG.r, DP=P*2+6;
  gr=g(scene);
  gr.fillStyle(0x4d8f4a,1).fillCircle(DP/2,DP/2,P+2);
  gr.fillStyle(0x93de8b,1).fillCircle(DP/2,DP/2,P);
  gr.fillStyle(0x6fc26a,1).fillTriangle(DP/2-14,8,DP/2-4,2,DP/2-6,12)
                          .fillTriangle(DP/2+14,8,DP/2+4,2,DP/2+6,12); // orejas
  gr.fillStyle(0xffffff,1).fillCircle(DP/2-8,DP/2-6,4.5).fillCircle(DP/2+8,DP/2-6,4.5);
  gr.fillStyle(0x111111,1).fillCircle(DP/2-7,DP/2-6,2).fillCircle(DP/2+7,DP/2-6,2);
  gr.fillStyle(0x6fc26a,1).fillEllipse(DP/2,DP/2+5,16,11); // hocico
  gr.fillStyle(0x2f5c1a,1).fillCircle(DP/2-3,DP/2+5,1.8).fillCircle(DP/2+3,DP/2+5,1.8);
  gr.fillStyle(0x5a3a1e,1).fillCircle(DP/2-10,DP/2+11,1.6).fillCircle(DP/2+9,DP/2+12,1.6); // migas robadas
  gr.generateTexture('pig',DP,DP); gr.destroy();

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

  // honda de calidad: horquilla con contorno, vetas, luz y venda de agarre
  gr=g(scene);
  const trunk=(x0,y0,x1,y1,w,c)=>{ gr.lineStyle(w,c,1);
    gr.beginPath(); gr.moveTo(x0,y0); gr.lineTo(x1,y1); gr.strokePath(); };
  // contorno oscuro
  trunk(38,164,38,66,20,0x2e1a0c); trunk(38,72,14,10,15,0x2e1a0c); trunk(38,72,62,10,15,0x2e1a0c);
  // madera base
  trunk(38,162,38,66,14,0x6b4423); trunk(38,70,15,11,10,0x6b4423); trunk(38,70,61,11,10,0x6b4423);
  // luz lateral (sol rosado)
  trunk(35,158,35,70,4,0x8a5a33); trunk(36,68,17,14,3,0x8a5a33);
  // vetas
  gr.lineStyle(1,0x4a2c14,0.5);
  gr.lineBetween(34,150,34,80); gr.lineBetween(42,155,42,85);
  // vendas de agarre en las puntas
  gr.fillStyle(0xd9b98c,1).fillRect(9,8,12,10).fillRect(55,8,12,10);
  gr.lineStyle(1,0x8a5a33,0.8);
  gr.lineBetween(9,11,21,11); gr.lineBetween(9,15,21,15);
  gr.lineBetween(55,11,67,11); gr.lineBetween(55,15,67,15);
  // monticulo de base
  gr.fillStyle(0x7a4c28,1).fillEllipse(38,163,34,10);
  gr.generateTexture('sling',76,170); gr.destroy();

  // suelo galleta: cobertura de fresa + masa con chips
  gr=g(scene);
  gr.fillStyle(0x8a5a2b,1).fillRect(0,0,64,96);
  gr.fillStyle(0x6e4520,1);
  for(let i=0;i<26;i++) gr.fillRect((i*23)%60, 20+(i*31)%72, 5, 4); // chips
  gr.fillStyle(0xff8fb3,1).fillRect(0,0,64,14);   // glaseado fresa
  gr.fillStyle(0xd96a92,1).fillRect(0,12,64,4);   // borde del glaseado
  gr.fillStyle(0xffc6da,1).fillRect(0,0,64,3);    // brillo superior
  gr.generateTexture('groundTex',64,96); gr.destroy();

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
