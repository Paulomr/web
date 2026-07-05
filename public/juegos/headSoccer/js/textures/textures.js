/* =====================================================================
   Texturas generadas por codigo UNA sola vez (perf): balon, estadio,
   red y sombra. Sin gradientes de Graphics (fallan en renderer Canvas).
   ===================================================================== */
import { W, H, GROUND_Y, GOAL_D, GOAL_H, GOAL_DROP, GOAL_BACK, POST_R } from '../config.js';

export function makeBallTexture(scene){
  // Alta resolucion (256px) mostrada a 64px: bordes perfectamente suaves
  const S=256, c=S/2, R=120, ink=0x1a1f25, TAU=Math.PI*2;
  const g=scene.make.graphics({add:false});
  g.fillStyle(0x0e1216,1); g.fillCircle(c,c,R+5);            // contorno
  g.fillStyle(0xd8dde3,1); g.fillCircle(c,c,R);              // base sombreada
  g.fillStyle(0xffffff,1); g.fillCircle(c-R*0.10,c-R*0.12,R*0.88); // luz esferica
  const penta=(x,y,r,rot)=>{const p=[];for(let i=0;i<5;i++){const a=rot+i*TAU/5;p.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r});}g.fillStyle(ink,1);g.fillPoints(p,true);};
  penta(c,c,R*0.30,-Math.PI/2);                              // pentagono central
  for(let i=0;i<5;i++){const a=-Math.PI/2+i*TAU/5;penta(c+Math.cos(a)*R*0.64,c+Math.sin(a)*R*0.64,R*0.20,a+Math.PI/5);}
  g.lineStyle(6,ink,0.8);                                    // costuras
  for(let i=0;i<5;i++){const a=-Math.PI/2+i*TAU/5;g.beginPath();g.moveTo(c+Math.cos(a)*R*0.30,c+Math.sin(a)*R*0.30);g.lineTo(c+Math.cos(a)*R*0.74,c+Math.sin(a)*R*0.74);g.strokePath();}
  g.fillStyle(0xffffff,0.5); g.fillCircle(c-R*0.30,c-R*0.34,R*0.18); // brillo
  g.generateTexture('ball',S,S); g.destroy();
}

export function makeNetTexture(scene){
  // Red CURVA del arco como sprite independiente: puede "reaccionar" (tween) al gol.
  // Perfil: espalda recta en x=GOAL_BACK + techo en cuarto de elipse que sube hasta
  // el nudo del travesano en (GOAL_D, 0). La malla se recorta contra esa curva.
  const RX=GOAL_D-GOAL_BACK, RY=GOAL_DROP;
  const g=scene.make.graphics({add:false});
  g.lineStyle(2,0xffffff,0.55);
  for(let x=GOAL_BACK;x<=GOAL_D;x+=14){ // hilos verticales: del techo curvo al piso
    const y0=GOAL_DROP - RY*Math.sqrt(Math.max(0,1-((GOAL_D-x)/RX)**2));
    g.beginPath();g.moveTo(x,y0);g.lineTo(x,GOAL_H);g.strokePath();
  }
  for(let y=6;y<=GOAL_H;y+=14){ // hilos horizontales: de la curva (o la espalda) a la boca
    const x0=y>=GOAL_DROP ? GOAL_BACK : GOAL_D - RX*Math.sqrt(Math.max(0,1-((GOAL_DROP-y)/RY)**2));
    g.beginPath();g.moveTo(x0,y);g.lineTo(GOAL_D,y);g.strokePath();
  }
  g.generateTexture('net',GOAL_D,GOAL_H); g.destroy();
}

function crowd(g,y0,h){ // publico denso por filas (se pinta UNA vez en la textura)
  const tones=[0xf6a5b0,0xffd6e0,0xf45b69,0xffffff,0x81d6e3,0xffe08a];
  const rows=Math.max(3,(h/14)|0), rh=h/rows;
  for(let r=0;r<rows;r++)for(let x=(r%2)*6;x<W;x+=12){
    g.fillStyle(tones[((x/12)+r)%6|0],1); g.fillCircle(x+4,y0+r*rh+rh*0.5,4);
  }
}

function bunting(g,y){ // guirnalda de banderines rosas
  for(let x=0;x<W;x+=46){
    g.lineStyle(2,0xffffff,0.8); g.beginPath(); g.moveTo(x,y); g.lineTo(x+46,y); g.strokePath();
    g.fillStyle((x/46)%2?0xf45b69:0xffd6e0,1); g.fillTriangle(x+13,y,x+33,y,x+23,y+18);
  }
}

export function makeFieldTexture(scene){
  const g=scene.make.graphics({add:false});
  const gt0=GROUND_Y-20, gt=GROUND_Y-GOAL_H, boardY=gt-34, wallY=boardY+30;
  // CIELO pixel-art: bandas planas de azul (sin gradientes de Graphics,
  // que fallan en el renderer Canvas y dejaban el cielo NEGRO)
  [0x3fa9f5,0x57b7f8,0x74c7fa,0x9cd9fc].forEach((col,i)=>{g.fillStyle(col,1);g.fillRect(0,i*18,W,18);});
  g.fillStyle(0xbfe8fd,1); g.fillRect(0,72,W,30);
  // nubes pixel (bloques escalonados)
  const cloud=(x,y,s)=>{
    g.fillStyle(0xffffff,1);
    g.fillRect(x+s,y-s,s*2,s); g.fillRect(x,y,s*4,s);
    g.fillStyle(0xe8f6ff,1); g.fillRect(x,y+s,s*4,(s*0.7)|0);
  };
  cloud(70,26,9); cloud(330,14,12); cloud(640,30,8); cloud(880,12,11); cloud(1130,24,9);
  cloud(480,38,6); cloud(1010,34,7);
  // sol con resplandor (anillos planos, coherente con el arte del menu)
  g.fillStyle(0xfff2c0,0.25); g.fillCircle(170,30,52);
  g.fillStyle(0xffe9a0,0.35); g.fillCircle(170,30,36);
  g.fillStyle(0xffdf70,1);    g.fillCircle(170,30,20);
  g.fillStyle(0xffffff,0.8);  g.fillCircle(164,24,7);
  // techo y anillo superior claros (luz de dia)
  g.fillStyle(0xdfe7f2,1); g.fillRect(0,70,W,18);
  g.fillStyle(0xffffff,0.55); g.fillRect(0,70,W,3);      // brillo del techo
  g.fillStyle(0xb9c6d8,1); g.fillRect(0,88,W,10);
  // mastiles con banderas rosas sobre el techo
  for(let x=60;x<W;x+=150){
    g.lineStyle(4,0x8fa2b8,1); g.beginPath(); g.moveTo(x,70); g.lineTo(x,40); g.strokePath();
    g.fillStyle(0xf45b69,1); g.fillTriangle(x,40,x,58,x+34,49);
  }
  // tribuna alta + palco + tribuna baja en concreto claro (dos niveles = estadio mas alto)
  g.fillStyle(0x86a3c6,1); g.fillRect(0,98,W,120);
  crowd(g,104,108);
  g.fillStyle(0x6d89ad,1); g.fillRect(0,218,W,24);
  g.fillStyle(0x7c9abd,1); g.fillRect(0,242,W,boardY-242);
  crowd(g,250,boardY-258);
  // guirnaldas de banderines rosas en ambos niveles
  bunting(g,98); bunting(g,242);
  // vallas LED (marco gris pizarra, sin negro puro)
  g.fillStyle(0x2a3a4a,1); g.fillRect(0,boardY,W,30);
  const cols=[0xf45b69,0xf6a5b0,0xf13030,0xffd6e0];
  for(let x=0,i=0;x<W;x+=118,i++){g.fillStyle(cols[i%4],0.95);g.fillRect(x+3,boardY+4,112,22);}
  g.fillStyle(0xffffff,0.25); g.fillRect(0,boardY,W,2);       // brillo superior
  g.fillStyle(0x1c2833,0.6);  g.fillRect(0,boardY+28,W,2);    // sombra inferior
  // muro perimetral entre la valla LED y el cesped (antes quedaba una franja negra)
  g.fillStyle(0xa8bfd8,1); g.fillRect(0,wallY,W,gt0-wallY);
  g.fillStyle(0x99b2cc,1); for(let y=wallY+44;y<gt0-24;y+=56) g.fillRect(0,y,W,4);
  g.fillStyle(0x8ea6c0,1); for(let x=40;x<W;x+=160) g.fillRect(x,wallY,10,gt0-wallY);
  // tuneles de vestuario (arcos oscuros, detalle de escala)
  [[W*0.28,0],[W*0.72,0]].forEach(([tx])=>{
    g.fillStyle(0x5a708c,1); g.fillRect(tx-34,wallY+66,68,gt0-wallY-66);
    g.fillCircle(tx,wallY+66,34);
    g.fillStyle(0x3d5169,1); g.fillRect(tx-26,wallY+78,52,gt0-wallY-78);
    g.fillCircle(tx,wallY+78,26);
  });
  g.fillStyle(0xf6a5b0,1); g.fillRect(0,gt0-12,W,8);   // franja rosa de marca
  // cesped soleado + franjas de corte + textura de puntos
  g.fillStyle(0x12a35f,1); g.fillRect(0,gt0,W,H-gt0);
  g.fillStyle(0x17b56c,1); for(let x=0;x<W;x+=150) g.fillRect(x,gt0,75,H-gt0);
  g.fillStyle(0x2bcf82,0.8); g.fillRect(0,gt0,W,3);    // borde iluminado del cesped
  let seed=7; const rnd=()=>((seed=(seed*9301+49297)%233280)/233280);
  g.fillStyle(0x0e8a50,0.5);
  for(let i=0;i<140;i++) g.fillRect((rnd()*W)|0, (gt0+6+rnd()*(H-gt0-12))|0, 3, 2);
  // lineas
  g.lineStyle(4,0xffffff,0.9);
  g.strokeRect(10,gt0+6,W-20,H-gt0-14);
  g.beginPath(); g.moveTo(W/2,gt0+6); g.lineTo(W/2,H-8); g.strokePath();
  const cyc=(gt0+H)/2; g.strokeCircle(W/2,cyc,30); g.fillStyle(0xffffff,0.9); g.fillCircle(W/2,cyc,4);
  const aH=H-gt0-30; g.strokeRect(10,gt0+12,150,aH); g.strokeRect(W-160,gt0+12,150,aH);
  // arcos CURVOS: espalda recta + techo en cuarto de elipse que remata en el nudo
  // del travesano (la red es sprite aparte). Misma curva que los palos fisicos.
  g.lineStyle(8,0xffffff,1);
  const RX=GOAL_D-GOAL_BACK, RY=GOAL_DROP;
  [[GOAL_BACK,1],[W-GOAL_BACK,-1]].forEach(([back,m])=>{
    g.beginPath(); g.moveTo(back,GROUND_Y); g.lineTo(back,gt+RY);
    for(let u=0;u<=90;u+=6){ const a=u*Math.PI/180;
      g.lineTo(back+m*RX*(1-Math.cos(a)), gt+RY-RY*Math.sin(a)); }
    g.strokePath();
  });
  g.fillStyle(0xffffff,1); g.fillCircle(GOAL_D,gt,POST_R); g.fillCircle(W-GOAL_D,gt,POST_R);
  g.generateTexture('field',W,H); g.destroy();
}

export function makeShadowTexture(scene){
  const g=scene.make.graphics({add:false});
  g.fillStyle(0x000000,1); g.fillEllipse(40,14,80,26);
  g.generateTexture('shadow',80,28); g.destroy();
}

export function makeConfettiTexture(scene){
  // cuadrito blanco 8x8: cada particula lo tinta (confeti de gol sin assets)
  const g=scene.make.graphics({add:false});
  g.fillStyle(0xffffff,1); g.fillRect(0,0,8,8);
  g.generateTexture('confetti',8,8); g.destroy();
}
