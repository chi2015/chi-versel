// ============================================================================
// TouchControls.js — on-screen left/right/jump buttons, touch devices only.
// ============================================================================

class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.state = { left: false, right: false, jump: false };
    this.active = !!(scene.sys.game.device.input.touch);
    if (!this.active) return;

    const { width, height } = scene.scale;
    const r = 32;
    const mk = (x, y, label, key) => {
      const circle = scene.add.circle(x, y, r, 0xffffff, 0.25)
        .setScrollFactor(0).setDepth(1000).setInteractive();
      scene.add.text(x, y, label, { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(1001);
      circle.on('pointerdown', () => { this.state[key] = true; });
      circle.on('pointerup', () => { this.state[key] = false; });
      circle.on('pointerout', () => { this.state[key] = false; });
      return circle;
    };

    mk(50, height - 60, '◀', 'left');
    mk(130, height - 60, '▶', 'right');
    mk(width - 60, height - 60, '⤒', 'jump');
  }

  getState() {
    return this.state;
  }
}
