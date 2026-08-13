// ============================================================================
// BootScene.js — generates every texture procedurally, then hands off.
// ============================================================================

class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const { width, height } = this.scale;
    const label = this.add.text(width / 2, height / 2, 'Generating world…', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);

    generateAllTextures(this);

    label.destroy();
    this.scene.start('MainScene');
  }
}
