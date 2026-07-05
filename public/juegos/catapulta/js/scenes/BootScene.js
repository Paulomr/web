/* Genera todas las texturas por codigo y arranca el juego en modo menu. */
import { buildTextures } from '../textures/textures.js';

export class BootScene extends Phaser.Scene{
  constructor(){ super('Boot'); }
  create(){
    buildTextures(this);
    this.scene.start('Game', { level:null }); // null = solo escenario de fondo
  }
}
