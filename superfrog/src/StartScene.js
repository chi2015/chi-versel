// ============================================================================
// StartScene.js — title/start screen with two menu items:
//   START GAME  -> level 1-1
//   CHEAT CODE  -> 4-digit code entry that jumps straight to a later level
// Works with keyboard (arrows/W/S, Enter/Space, digits, Backspace, Esc) and
// with mouse/touch (tap menu items and the on-screen keypad).
// ============================================================================

class StartScene extends Phaser.Scene {
  constructor() { super('StartScene'); }

  create() {
    const { width, height } = this.scale;
    this.mode = 'menu';
    this.code = '';
    this.busy = false;

    this.buildBackdrop(width, height);

    // ---- main menu ----
    this.menuItems = [
      { label: 'START GAME', action: () => this.startLevel(0) },
      { label: 'CHEAT CODE', action: () => this.openCheat() },
    ];
    this.selected = 0;
    this.menuGroup = this.add.container(0, 0);
    this.menuTexts = this.menuItems.map((item, i) => {
      const t = this.add.text(width / 2, 300 + i * 64, item.label, {
        fontFamily: 'monospace', fontSize: '36px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.select(i));
      t.on('pointerdown', () => { SFX.unlock(); this.select(i); item.action(); });
      this.menuGroup.add(t);
      return t;
    });
    this.pointer = this.add.text(0, 0, '▶', {
      fontFamily: 'monospace', fontSize: '32px', color: '#ffe066',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);
    this.menuGroup.add(this.pointer);
    this.tweens.add({ targets: this.pointer, scaleX: 0.8, scaleY: 0.8, duration: 350, yoyo: true, repeat: -1 });
    this.menuGroup.add(this.add.text(width / 2, height - 28, '↑/↓ choose · ENTER/SPACE select', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffffcc',
    }).setOrigin(0.5));
    this.select(0, true);

    this.buildCheatPanel(width, height);

    this.input.keyboard.on('keydown', (e) => this.onKey(e));
    this.input.once('pointerdown', () => SFX.unlock());
  }

  // ---------------------------------------------------------------- visuals
  buildBackdrop(width, height) {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    g.fillRect(0, 0, width, height);
    this.add.image(width - 110, 90, 'sun').setAlpha(0.9);

    // grass + dirt strip along the bottom
    for (let x = 0; x < width; x += TILE_SIZE) {
      this.add.image(x + 16, height - 80, 'tile-grass');
      this.add.image(x + 16, height - 48, 'tile-dirt');
      this.add.image(x + 16, height - 16, 'tile-dirt');
    }

    // bouncing frog as the logo
    const frog = this.add.image(width / 2, 170, 'frog-idle').setScale(4);
    this.tweens.add({
      targets: frog, y: 140, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeOut',
      onYoyo: () => frog.setTexture('frog-jump'),
      onRepeat: () => frog.setTexture('frog-idle'),
    });
  }

  select(i, silent) {
    if (i !== this.selected && !silent) SFX.blip();
    this.selected = i;
    this.menuTexts.forEach((t, j) => t.setColor(j === i ? '#ffe066' : '#ffffff'));
    const t = this.menuTexts[i];
    this.pointer.setPosition(t.x - t.width / 2 - 34, t.y);
  }

  buildCheatPanel(width, height) {
    const p = this.add.container(0, 0).setVisible(false);
    this.cheatPanel = p;

    p.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55));
    p.add(this.add.rectangle(width / 2, 255, 420, 470, 0x1a1a2e, 0.95).setStrokeStyle(4, 0x000000));
    p.add(this.add.text(width / 2, 46, 'ENTER CHEAT CODE', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffe066', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5));

    // four digit boxes
    this.digitBoxes = [];
    this.digitTexts = [];
    for (let i = 0; i < 4; i++) {
      const x = width / 2 + (i - 1.5) * 70;
      const box = this.add.rectangle(x, 112, 56, 64, 0x000000, 0.5).setStrokeStyle(3, 0xffffff);
      const txt = this.add.text(x, 112, '', {
        fontFamily: 'monospace', fontSize: '40px', color: '#ffffff',
      }).setOrigin(0.5);
      p.add([box, txt]);
      this.digitBoxes.push(box);
      this.digitTexts.push(txt);
    }

    this.cheatMsg = this.add.text(width / 2, 168, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    p.add(this.cheatMsg);

    // on-screen keypad (needed on touch devices)
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
    keys.forEach((k, i) => {
      const x = width / 2 + ((i % 3) - 1) * 110;
      const y = 222 + Math.floor(i / 3) * 58;
      const btn = this.add.rectangle(x, y, 96, 48, 0x4f8fe8).setStrokeStyle(3, 0x000000)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, k, {
        fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setFillStyle(0x6fcf3f));
      btn.on('pointerout', () => btn.setFillStyle(0x4f8fe8));
      btn.on('pointerdown', () => {
        if (k === '⌫') this.backspace();
        else if (k === 'OK') this.submitCode();
        else this.typeDigit(k);
      });
      p.add([btn, label]);
    });

    const back = this.add.text(width / 2, 458, '[ BACK ]', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffe066'));
    back.on('pointerout', () => back.setColor('#ffffff'));
    back.on('pointerdown', () => this.closeCheat());
    p.add(back);
    p.add(this.add.text(width / 2, height - 28, 'type digits · BACKSPACE delete · ENTER ok · ESC back', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffffcc',
    }).setOrigin(0.5));
  }

  // ---------------------------------------------------------------- input
  onKey(e) {
    SFX.unlock();
    if (this.busy) return;
    if (this.mode === 'menu') {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.select((this.selected + this.menuItems.length - 1) % this.menuItems.length);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.select((this.selected + 1) % this.menuItems.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        this.menuItems[this.selected].action();
      }
      return;
    }
    if (/^[0-9]$/.test(e.key)) this.typeDigit(e.key);
    else if (e.key === 'Backspace') this.backspace();
    else if (e.key === 'Enter') this.submitCode();
    else if (e.key === 'Escape') this.closeCheat();
  }

  // ---------------------------------------------------------------- cheat code
  openCheat() {
    SFX.blip();
    this.mode = 'cheat';
    this.code = '';
    this.renderCode();
    this.cheatMsg.setText('');
    this.menuGroup.setVisible(false);
    this.cheatPanel.setVisible(true);
  }

  closeCheat() {
    if (this.busy) return;
    SFX.blip();
    this.mode = 'menu';
    this.cheatPanel.setVisible(false);
    this.menuGroup.setVisible(true);
  }

  typeDigit(d) {
    if (this.busy || this.code.length >= 4) return;
    SFX.blip();
    this.code += d;
    this.cheatMsg.setText('');
    this.renderCode();
    if (this.code.length === 4) this.time.delayedCall(180, () => this.submitCode());
  }

  backspace() {
    if (this.busy || !this.code.length) return;
    SFX.blip();
    this.code = this.code.slice(0, -1);
    this.renderCode();
  }

  renderCode() {
    this.digitTexts.forEach((t, i) => t.setText(this.code[i] || ''));
    this.digitBoxes.forEach((b, i) => b.setStrokeStyle(3, i === this.code.length ? 0xffe066 : 0xffffff));
  }

  submitCode() {
    if (this.busy || this.mode !== 'cheat') return;
    if (this.code.length < 4) {
      this.cheatMsg.setColor('#ffffff').setText('ENTER 4 DIGITS');
      return;
    }
    const levelIndex = levelIndexForCheatCode(this.code);
    if (levelIndex === -1) {
      SFX.hit();
      this.cheatMsg.setColor('#ff8f8f').setText('WRONG CODE');
      this.busy = true;
      const boxes = [...this.digitBoxes, ...this.digitTexts];
      const xs = boxes.map((o) => o.x);
      this.tweens.add({
        targets: boxes, x: '+=8', duration: 50, yoyo: true, repeat: 3,
        onComplete: () => {
          boxes.forEach((o, i) => { o.x = xs[i]; });
          this.code = '';
          this.renderCode();
          this.busy = false;
        },
      });
      return;
    }
    SFX.powerup();
    this.cheatMsg.setColor('#8fff8f').setText(`WARP TO LEVEL ${LEVEL_NUMBERS[levelIndex]}!`);
    this.busy = true;
    this.time.delayedCall(700, () => this.startLevel(levelIndex));
  }

  startLevel(levelIndex) {
    this.busy = true;
    SFX.unlock();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainScene', { levelIndex }));
  }
}
