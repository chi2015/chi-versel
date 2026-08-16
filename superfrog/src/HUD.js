// ============================================================================
// HUD.js — top-left health + score display, fixed to camera.
// ============================================================================

class HUD {
  constructor(scene, maxHealth) {
    this.scene = scene;
    this.maxHealth = maxHealth;
    this.hearts = [];

    this.levelTitleText = scene.add.text(scene.scale.width / 2, 16, '', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000).setAlpha(0);

    for (let i = 0; i < maxHealth; i++) {
      const heart = scene.add.image(16 + i * 24, 16, 'hud-heart')
        .setScrollFactor(0).setDepth(1000).setOrigin(0, 0);
      this.hearts.push(heart);
    }

    this.coinIcon = scene.add.image(16, 44, 'hud-coin').setScrollFactor(0).setDepth(1000).setOrigin(0, 0);
    this.scoreText = scene.add.text(38, 38, '0', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', stroke: '#00000080', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(1000);

    this.msgText = scene.add.text(scene.scale.width / 2, 70, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
  }

  setHealth(health) {
    this.hearts.forEach((h, i) => h.setTexture(i < health ? 'hud-heart' : 'hud-heart-empty'));
  }

  setScore(score) {
    this.scoreText.setText(String(score));
  }

  flashMessage(text, ms) {
    this.msgText.setText(text);
    this.scene.time.delayedCall(ms || 1200, () => {
      if (this.msgText.text === text) this.msgText.setText('');
    });
  }

  showLevelTitle(text, holdMs) {
    this.levelTitleText.setText(text).setAlpha(0);
    this.scene.tweens.add({
      targets: this.levelTitleText,
      alpha: 1,
      duration: 400,
      hold: holdMs || 1800,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }
}
