// ============================================================================
// GameOverScene.js — shown on death or on reaching the flag; restarts level.
// ============================================================================

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.won = !!data.win;
    this.score = data.score || 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(this.won ? '#1c3d1c' : '#3d1c1c');

    this.add.text(width / 2, height / 2 - 60, this.won ? 'LEVEL COMPLETE!' : 'GAME OVER', {
      fontFamily: 'monospace', fontSize: '40px', color: this.won ? '#8fff8f' : '#ff8f8f',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Score: ${this.score}`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const btn = this.add.text(width / 2, height / 2 + 60, '[ Press SPACE / Tap to Restart ]', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffe066',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: btn, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    const restart = () => this.scene.start('MainScene');
    this.input.keyboard.once('keydown-SPACE', restart);
    this.input.once('pointerdown', restart);
  }
}
