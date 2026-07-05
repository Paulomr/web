/* =====================================================================
   Cuerda = cadena de cuerpos Matter pequenos unidos por constraints,
   anclada a un punto fijo; la galleta cuelga del ultimo eslabon.
   El corte elimina UN constraint: el tramo del ancla queda colgando y
   el tramo de la galleta cae con ella (estilo Cut the Rope).
   ===================================================================== */
import { ROPE } from '../config.js';

// distancia^2 punto-segmento (sin allocaciones)
function ptSeg2(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  let t=l2 ? ((px-ax)*dx+(py-ay)*dy)/l2 : 0;
  t=t<0?0:(t>1?1:t);
  const qx=ax+t*dx-px, qy=ay+t*dy-py;
  return qx*qx+qy*qy;
}
const cross=(ox,oy,ax,ay,bx,by)=>(ax-ox)*(by-oy)-(ay-oy)*(bx-ox);
// interseccion estricta de segmentos AB x CD
function segsHit(ax,ay,bx,by,cx,cy,dx,dy){
  const d1=cross(cx,cy,dx,dy,ax,ay), d2=cross(cx,cy,dx,dy,bx,by),
        d3=cross(ax,ay,bx,by,cx,cy), d4=cross(ax,ay,bx,by,dx,dy);
  return ((d1>0)!==(d2>0)) && ((d3>0)!==(d4>0));
}
// cercania generosa para dedos: interseccion O distancia minima < r
function segsClose(ax,ay,bx,by,cx,cy,dx,dy,r){
  if(segsHit(ax,ay,bx,by,cx,cy,dx,dy)) return true;
  const r2=r*r;
  return ptSeg2(ax,ay,cx,cy,dx,dy)<r2 || ptSeg2(bx,by,cx,cy,dx,dy)<r2 ||
         ptSeg2(cx,cy,ax,ay,bx,by)<r2 || ptSeg2(dx,dy,ax,ay,bx,by)<r2;
}

export class Rope{
  constructor(scene, cookie, { x, y, len }){
    this.scene=scene; this.cookie=cookie;
    this.anchor={ x, y };
    const n=this.n=Math.max(2,Math.round(len/ROPE.seg));
    const segLen=len/(n+1);
    const filter={ category:0x0008, mask:0 };       // no colisiona con nada
    this.links=[];
    for(let i=1;i<=n;i++){
      const t=i/(n+1);
      this.links.push(scene.matter.add.circle(
        x+(cookie.x-x)*t, y+(cookie.y-y)*t, ROPE.linkR,
        { density:ROPE.density, frictionAir:ROPE.frictionAir,
          collisionFilter:filter, label:'ropelink' }));
    }
    // cons[i] une P_i con P_{i+1}: ancla, eslabones..., galleta
    this.cons=[ scene.matter.add.worldConstraint(this.links[0], segLen, ROPE.stiffness,
      { pointA:{ x, y } }) ];
    for(let i=1;i<n;i++)
      this.cons.push(scene.matter.add.constraint(this.links[i-1],this.links[i],segLen,ROPE.stiffness));
    this.cons.push(scene.matter.add.constraint(this.links[n-1],cookie.body,segLen,ROPE.stiffness));
    this.holding=true;
  }

  // puntos de la polilinea: ancla, eslabones, galleta
  pointAt(i){
    if(i===0) return this.anchor;
    if(i<=this.n) return this.links[i-1].position;
    return this.cookie.body ? this.cookie.body.position : this.links[this.n-1].position;
  }

  // prueba el trazo (x1,y1)->(x2,y2) contra cada tramo; corta lo cruzado.
  // Devuelve los puntos de corte (para FX).
  trySlice(x1,y1,x2,y2,r){
    const hits=[];
    for(let i=0;i<this.cons.length;i++){
      if(!this.cons[i]) continue;
      const a=this.pointAt(i), b=this.pointAt(i+1);
      if(segsClose(x1,y1,x2,y2,a.x,a.y,b.x,b.y,r)){
        this.scene.matter.world.removeConstraint(this.cons[i]);
        this.cons[i]=null; this.holding=false;
        hits.push({ x:(a.x+b.x)/2, y:(a.y+b.y)/2 });
      }
    }
    return hits;
  }

  // suelta a la galleta (al comerla: que no arrastre la cuerda)
  releaseCookie(){
    const last=this.cons[this.cons.length-1];
    if(last){ this.scene.matter.world.removeConstraint(last); this.cons[this.cons.length-1]=null; }
    this.holding=false;
  }

  // render como polilinea suave: tramos + nudos redondos en cada eslabon
  draw(gfx){
    gfx.lineStyle(ROPE.width,ROPE.color,1);
    gfx.fillStyle(ROPE.color,1);
    for(let i=0;i<this.cons.length;i++){
      if(!this.cons[i]) continue;
      const a=this.pointAt(i), b=this.pointAt(i+1);
      gfx.lineBetween(a.x,a.y,b.x,b.y);
      gfx.fillCircle(b.x,b.y,ROPE.width/2);
    }
  }
}
