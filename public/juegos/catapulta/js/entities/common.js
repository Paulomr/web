/* Base comun de entidades daniables: hp, umbral, tinte por dano y muerte. */
export function makeEnt(scene, go, { kind, hp, threshold, sfxKey }){
  const ent={
    go, kind, hp, maxHp:hp, threshold, sfxKey, dead:false,
    takeDamage(d){
      if(this.dead) return;
      this.hp-=d;
      if(this.hp<=0){ this.kill(); return; }
      // oscurece segun dano acumulado (feedback de "grietas")
      const r=Math.max(0.45,this.hp/this.maxHp), v=(85+170*r)|0;
      go.setTint(Phaser.Display.Color.GetColor(v,v,v));
    },
    kill(){
      if(this.dead) return;
      this.dead=true;
      scene.killEnt(this);
    },
  };
  go.setDepth(5);
  go.body.entRef=ent;
  return ent;
}
