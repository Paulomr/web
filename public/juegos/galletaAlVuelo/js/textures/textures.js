/* =====================================================================
   Texturas 100% por codigo (Graphics -> generateTexture). El unico arte
   cargado de archivo son los PNG oficiales de Bernie (BootScene); aqui
   vive ademas su fallback procedural por si un load falla.
   ===================================================================== */
import { COOKIE, CHIP, BUBBLE, PAL } from '../config.js';

function g(scene){ return scene.make.graphics({add:false}); }

export function buildTextures(scene){
  let gr;

  // particula 6x6
  gr=g(scene); gr.fillStyle(0xffffff,1).fillRect(0,0,6,6);
  gr.generateTexture('px',6,6); gr.destroy();

  // galleta con chispas (la protagonista)
  const R=COOKIE.r, D=R*2+8, c=D/2;
  gr=g(scene);
  gr.fillStyle(0x8a5a2b,1).fillCircle(c,c,R+3);              // borde horneado
  gr.fillStyle(0xd9a15c,1).fillCircle(c,c,R);                // masa
  gr.fillStyle(0xe8bd85,0.55).fillCircle(c-8,c-9,R*0.55);    // luz superior
  gr.fillStyle(0x4a2c14,1);                                  // chispas de chocolate
  [[-14,-8,5],[8,-14,4.5],[15,4,5],[-4,10,5.5],[-17,9,4],[6,18,4]].forEach(([dx,dy,r])=>
    gr.fillCircle(c+dx,c+dy,r));
  gr.fillStyle(0x2e1a0c,0.5);
  [[-12,-10],[10,-12],[17,2],[-2,8]].forEach(([dx,dy])=>gr.fillCircle(c+dx,c+dy,1.8));
  gr.generateTexture('cookie',D,D); gr.destroy();

  // chispa de chocolate coleccionable (gota kiss con brillo)
  const CS=CHIP.r*2+6, cc=CS/2;
  gr=g(scene);
  gr.fillStyle(0xffd9a0,0.28).fillCircle(cc,cc,CHIP.r+3);    // halo dorado
  gr.fillStyle(0x2e1a0c,1).fillTriangle(cc,cc-CHIP.r,cc-CHIP.r+3,cc+CHIP.r-3,cc+CHIP.r-3,cc+CHIP.r-3);
  gr.fillStyle(0x4a2c14,1).fillTriangle(cc,cc-CHIP.r+4,cc-CHIP.r+6,cc+CHIP.r-4,cc+CHIP.r-6,cc+CHIP.r-4);
  gr.fillStyle(0xffffff,0.5).fillCircle(cc-3,cc,2.4);        // brillo
  gr.generateTexture('chip',CS,CS); gr.destroy();

  // burbuja translucida
  const BD=BUBBLE.r*2+8, bc=BD/2;
  gr=g(scene);
  gr.fillStyle(0xbfe9ff,0.18).fillCircle(bc,bc,BUBBLE.r);
  gr.lineStyle(3,0xdff4ff,0.85).strokeCircle(bc,bc,BUBBLE.r);
  gr.lineStyle(2,0xffffff,0.9);
  gr.beginPath(); gr.arc(bc,bc,BUBBLE.r-9,Phaser.Math.DegToRad(200),Phaser.Math.DegToRad(255)); gr.strokePath();
  gr.fillStyle(0xffffff,0.75).fillCircle(bc-BUBBLE.r*0.42,bc-BUBBLE.r*0.42,4);
  gr.generateTexture('bubble',BD,BD); gr.destroy();

  // ventilador/soplador pastel apuntando a la derecha (se rota por sprite)
  gr=g(scene);
  gr.fillStyle(0x9aa7b8,1).fillRoundedRect(6,18,34,44,8);      // cuerpo
  gr.fillStyle(0xf2a7c0,1).fillRoundedRect(10,22,26,36,6);     // carcasa rosada
  gr.fillStyle(0x7c8798,1).fillRect(36,30,18,20);              // boquilla
  gr.fillStyle(0xdfe7f2,1).fillRect(50,26,10,28);              // salida
  gr.fillStyle(0xffffff,0.85);                                 // rafaga
  gr.fillTriangle(62,32,86,40,62,48);
  gr.fillStyle(0x5c6673,1).fillRect(14,60,18,12);              // base
  gr.fillStyle(0xffffff,0.4).fillRect(12,24,6,30);             // brillo
  gr.generateTexture('fan',92,78); gr.destroy();

  // ancla de cuerda: nudo de madera
  gr=g(scene);
  gr.fillStyle(0x8a5a33,1).fillCircle(15,15,13);
  gr.fillStyle(0xb5793f,1).fillCircle(15,15,10);
  gr.fillStyle(0x6b4423,1).fillCircle(15,15,4);
  gr.lineStyle(2,0x6b4423,0.6).strokeCircle(15,15,7);
  gr.generateTexture('anchor',30,30); gr.destroy();

  // repisa pastel donde espera Bernie
  gr=g(scene);
  gr.fillStyle(0xc9688f,1).fillRoundedRect(0,10,220,22,8);
  gr.fillStyle(0xf2a7c0,1).fillRoundedRect(0,6,220,16,8);
  gr.fillStyle(0xffffff,0.35).fillRect(8,9,204,4);
  gr.generateTexture('shelf',220,34); gr.destroy();

  // cielos por pack: dia panaderia / noche vampira / navidad
  const sky=(key,topC,botC)=>{
    const grr=g(scene);
    const top=Phaser.Display.Color.ValueToColor(topC),
          bot=Phaser.Display.Color.ValueToColor(botC);
    for(let i=0;i<16;i++){
      const cI=Phaser.Display.Color.Interpolate.ColorWithColor(top,bot,15,i);
      grr.fillStyle(Phaser.Display.Color.GetColor(cI.r,cI.g,cI.b),1).fillRect(0,i*16,64,16);
    }
    grr.generateTexture(key,64,256); grr.destroy();
  };
  sky('skyDay',  0xfff3e4, 0xffc7d8);   // crema -> rosado Bernie
  sky('skyNight',0x241a3d, 0x4a2c55);   // noche morada (pack vampira)
  sky('skyXmas', 0xcfe6f5, 0xf6d7e2);   // invierno pastel (pack navideno)

  // nube crema
  gr=g(scene);
  gr.fillStyle(0xfff6ee,0.95);
  gr.fillCircle(26,26,16); gr.fillCircle(50,20,20); gr.fillCircle(74,27,15);
  gr.fillRect(24,24,52,14);
  gr.generateTexture('cloud',100,48); gr.destroy();

  // estrellita (noche) y copo (navidad)
  gr=g(scene);
  gr.fillStyle(0xffe9a0,1);
  gr.fillTriangle(7,0,9,5,5,5); gr.fillTriangle(7,14,9,9,5,9);
  gr.fillTriangle(0,7,5,5,5,9); gr.fillTriangle(14,7,9,5,9,9);
  gr.fillCircle(7,7,2.4);
  gr.generateTexture('starlet',14,14); gr.destroy();
  gr=g(scene);
  gr.lineStyle(2,0xffffff,0.95);
  [0,60,120].forEach(a=>{ const r=Phaser.Math.DegToRad(a), dx=Math.cos(r)*7, dy=Math.sin(r)*7;
    gr.lineBetween(7-dx,7-dy,7+dx,7+dy); });
  gr.generateTexture('flake',14,14); gr.destroy();
}

/* Fallback procedural de Bernie (solo si el PNG oficial no carga):
   cabeza de osa rosada con expresion segun la variante. */
export function buildBearFallback(scene,key){
  if(scene.textures.exists(key)) return;
  const S=260, cx=S/2, gr=g(scene);
  gr.fillStyle(PAL.bernieD,1).fillCircle(cx-72,86,34).fillCircle(cx+72,86,34); // orejas
  gr.fillStyle(PAL.bernie,1).fillCircle(cx-72,86,26).fillCircle(cx+72,86,26);
  gr.fillStyle(PAL.bernieD,1).fillCircle(cx,150,92);                            // contorno
  gr.fillStyle(PAL.bernie,1).fillCircle(cx,150,84);
  gr.fillStyle(0xfbdce8,1).fillEllipse(cx,178,74,52);                           // hocico
  gr.fillStyle(0x1c2b4a,1).fillCircle(cx-32,138,9).fillCircle(cx+32,138,9);     // ojos
  gr.fillStyle(0xffffff,1).fillCircle(cx-29,135,3).fillCircle(cx+35,135,3);
  gr.fillStyle(0x3a2210,1).fillEllipse(cx,164,18,12);                           // nariz
  if(key==='bernie-sorpresa'){ gr.fillStyle(0x5a2b3c,1).fillEllipse(cx,192,22,26); }
  else if(key==='bernie-comiendo'){ gr.fillStyle(0x5a2b3c,1).fillEllipse(cx,192,40,24);
    gr.fillStyle(0x8a5a2b,1).fillCircle(cx-18,200,5).fillCircle(cx+16,196,4); }
  else { gr.lineStyle(5,0x5a2b3c,1);
    gr.beginPath(); gr.arc(cx,184,20,Phaser.Math.DegToRad(20),Phaser.Math.DegToRad(160)); gr.strokePath(); }
  // gorro de chef generico
  gr.fillStyle(0xffffff,1).fillEllipse(cx,72,120,56).fillRect(cx-52,58,104,26);
  gr.generateTexture(key,S,S); gr.destroy();
}
