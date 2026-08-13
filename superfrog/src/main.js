// ============================================================================
// main.js — Phaser.Game bootstrap.
// ============================================================================

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game-container',
  backgroundColor: '#4f8fe8',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MainScene, GameOverScene],
};

window.addEventListener('load', () => {
  window.__game = new Phaser.Game(config); // exposed for debugging/QA
});
