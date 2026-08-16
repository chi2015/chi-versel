// ============================================================================
// GameOverScene.js — shown on death or on reaching the flag; restarts level.
// ============================================================================

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.won = !!data.win;
    this.score = data.score || 0;
    this.levelNumber = data.levelNumber || '';
    this.levelIndex = data.levelIndex || 0;
    this.hasNext = !!data.hasNext;
    this.nextLevelIndex = data.nextLevelIndex;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(this.won ? '#1c3d1c' : '#3d1c1c');
    const allComplete = this.won && !this.hasNext;

    const title = this.won ? `LEVEL ${this.levelNumber} COMPLETE!` : 'GAME OVER';
    this.add.text(width / 2, height / 2 - 60, title, {
      fontFamily: 'monospace', fontSize: '40px', color: this.won ? '#8fff8f' : '#ff8f8f',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Score: ${this.score}${allComplete ? '  —  You beat the game!' : ''}`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const btnLabel = this.won && this.hasNext
      ? '[ Press SPACE / Tap for Next Level ]'
      : allComplete
        ? '[ Press SPACE / Tap to Play Again ]'
        : '[ Press SPACE / Tap to Retry ]';
    const btn = this.add.text(width / 2, height / 2 + 60, btnLabel, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffe066',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: btn, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    const targetLevelIndex = this.won && this.hasNext ? this.nextLevelIndex : (allComplete ? 0 : this.levelIndex);
    const restart = () => this.scene.start('MainScene', { levelIndex: targetLevelIndex });
    this.input.keyboard.once('keydown-SPACE', restart);
    this.input.once('pointerdown', restart);
  }
}
