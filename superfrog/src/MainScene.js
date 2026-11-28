// ============================================================================
// MainScene.js — builds the tilemap from level data, spawns entities, wires
// up physics/camera/HUD, and runs the per-frame game loop.
// ============================================================================

class MainScene extends Phaser.Scene {
  constructor() { super('MainScene'); }

  init(data) {
    this.levelIndex = (data && data.levelIndex) || 0;
  }

  create() {
    this.score = 0;
    this.gameEnded = false;

    const level = buildLevel(this.levelIndex);
    this.level = level;
    const worldW = level.cols * TILE_SIZE;
    const worldH = level.rows * TILE_SIZE;
    this.worldW = worldW;
    this.worldH = worldH;

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.physics.world.gravity.y = 0; // per-body gravity is set explicitly

    this.buildBackground(worldW, worldH);
    this.buildTilemapLayers(level);
    this.spawnDecor(level);

    this.coins = [];
    this.mushrooms = [];
    this.fruits = [];
    this.crawlers = [];
    this.flyers = [];
    this.spikesGroup = this.physics.add.staticGroup();

    this.spawnEntities(level);

    // ---- player ----
    const start = level.entities.playerStart;
    this.player = new Player(this, start.col * TILE_SIZE + 16, start.row * TILE_SIZE + 16);

    this.physics.add.collider(this.player, this.solidLayer);
    this.physics.add.collider(this.player, this.islandLayer, null, this.oneWayProcess, this);

    this.crawlersGroup = this.physics.add.group();
    this.crawlers.forEach((c) => this.crawlersGroup.add(c));
    this.physics.add.collider(this.crawlersGroup, this.solidLayer);

    this.flyersGroup = this.physics.add.group();
    this.flyers.forEach((f) => this.flyersGroup.add(f));

    this.physics.add.overlap(this.player, this.crawlersGroup, this.onEnemyOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.flyersGroup, this.onEnemyOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.spikesGroup, (p, s) => p.hurt(s.x), undefined, this);

    this.coinsGroup = this.physics.add.group();
    this.coins.forEach((c) => this.coinsGroup.add(c));
    this.physics.add.overlap(this.player, this.coinsGroup, (p, c) => {
      if (!c.active || !c.body.enable) return;
      c.collect();
      this.addScore(100);
      this.coinsLeft -= 1;
      this.hud.setCoinsLeft(this.coinsLeft);
      this.checkDoorUnlock();
    }, undefined, this);

    this.mushroomsGroup = this.physics.add.group();
    this.mushrooms.forEach((m) => this.mushroomsGroup.add(m));
    this.physics.add.overlap(this.player, this.mushroomsGroup, (p, m) => {
      if (!m.active || !m.body.enable) return;
      m.collect();
      p.applyBoost(6000);
      this.addScore(500);
      this.hud.flashMessage('Speed Boost!', 1500);
    }, undefined, this);

    this.fruitsGroup = this.physics.add.group();
    this.fruits.forEach((f) => this.fruitsGroup.add(f));
    this.physics.add.overlap(this.player, this.fruitsGroup, (p, f) => {
      if (!f.active || !f.body.enable) return;
      f.collect();
      this.addScore(50);
    }, undefined, this);

    // level-end door: locked until every coin is collected (and, on boss
    // levels, the boss is beaten). Sprite + a plain trigger zone.
    const doorData = level.entities.door;
    this.coinsLeft = this.coins.length;
    this.doorUnlocked = false;
    this.bossDefeated = false;
    this.nextLockedHintAt = 0;
    this.door = this.add.image(
      doorData.col * TILE_SIZE + 16, (doorData.row + 1) * TILE_SIZE, 'door-locked'
    ).setOrigin(0.5, 1);
    this.doorTrigger = this.add.zone(
      doorData.col * TILE_SIZE + 16, doorData.row * TILE_SIZE + 16, TILE_SIZE, TILE_SIZE * 2
    );
    this.physics.add.existing(this.doorTrigger, true);
    this.physics.add.overlap(this.player, this.doorTrigger, () => this.onDoorOverlap(), undefined, this);

    if (this.boss) {
      this.physics.add.collider(this.boss, this.solidLayer);
      this.physics.add.overlap(this.player, this.boss, this.onBossOverlap, undefined, this);
    }

    // ---- camera ----
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(140, 100);

    // ---- input ----
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.touch = new TouchControls(this);
    this.prevTouchJump = false;

    SFX.unlock();
    this.input.once('pointerdown', () => SFX.unlock());
    this.input.keyboard.once('keydown', () => SFX.unlock());

    // ---- HUD ----
    this.hud = new HUD(this, this.player.maxHealth);
    this.hud.setHealth(this.player.health);
    this.hud.setScore(this.score);
    this.hud.setCoinsLeft(this.coinsLeft);
    this.hud.showLevelTitle(`LEVEL ${level.number} ${level.title}`);

    this.events.on('playerHurt', (health) => this.hud.setHealth(health));
    this.events.on('playerDied', () => this.onPlayerDied());
    this.events.on('bossAwake', (health, max) => {
      this.hud.showBossHealth(health, max);
      this.hud.flashMessage('KING BEETLE! Jump on it 3 times!', 2200);
    });
    this.events.on('bossHit', (health) => this.hud.setBossHealth(health));
    this.events.on('bossDefeated', () => {
      this.bossDefeated = true;
      this.bossDefeatedAt = this.time.now;
      this.addScore(5000);
      this.hud.flashMessage(this.coinsLeft > 0
        ? `BOSS DEFEATED! Collect ${this.coinsLeft} more coin${this.coinsLeft === 1 ? '' : 's'}!`
        : 'BOSS DEFEATED!', 2500);
      this.checkDoorUnlock();
    });
  }

  /** What still keeps the door shut, or null when it can open. */
  doorLockReason() {
    const parts = [];
    if (this.coinsLeft > 0) parts.push(`${this.coinsLeft} coin${this.coinsLeft === 1 ? '' : 's'} left`);
    if (this.boss && !this.bossDefeated) parts.push('beat the King Beetle');
    return parts.length ? parts.join(' + ') : null;
  }

  checkDoorUnlock() {
    if (this.doorUnlocked) return;
    if (this.doorLockReason()) {
      if (this.coinsLeft === 0) this.hud.flashMessage('ALL COINS! Now beat the King Beetle!', 2200);
      return;
    }
    this.doorUnlocked = true;
    SFX.powerup();
    this.door.setTexture('door-open');
    this.tweens.add({ targets: this.door, scaleX: 1.2, scaleY: 1.2, duration: 160, yoyo: true, repeat: 1 });
    // if the boss just died, let its "BOSS DEFEATED!" message show first
    const justBeatBoss = this.bossDefeated && this.time.now - this.bossDefeatedAt < 500;
    this.time.delayedCall(justBeatBoss ? 2600 : 0, () => {
      if (!this.gameEnded) this.hud.flashMessage('DOOR UNLOCKED! Head to the exit!', 2500);
    });
  }

  onDoorOverlap() {
    if (this.doorUnlocked) { this.completeLevel(); return; }
    if (this.time.now < this.nextLockedHintAt) return;
    this.nextLockedHintAt = this.time.now + 2000;
    SFX.blip();
    this.hud.flashMessage(`LOCKED: ${this.doorLockReason()}`, 1800);
    this.tweens.add({ targets: this.door, x: this.door.x + 3, duration: 50, yoyo: true, repeat: 2 });
  }

  // ------------------------------------------------------------ background
  buildBackground(worldW, worldH) {
    const cam = this.cameras.main;
    const vw = this.scale.width, vh = this.scale.height;

    this.add.image(0, 0, 'sky-gradient').setOrigin(0, 0).setScrollFactor(0).setDepth(-100)
      .setDisplaySize(vw, vh);

    this.mountainLayer = this.add.tileSprite(0, vh - 260, vw, 260, 'mountain-tile')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-60).setAlpha(0.9);
    this.cloudLayer = this.add.tileSprite(0, 20, vw, 160, 'cloud-tile')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-70).setAlpha(0.8);

    this.add.image(worldW * 0.22, 90, 'sun').setScrollFactor(0.15, 0.05).setDepth(-30);
  }

  // ------------------------------------------------------------ tilemap
  buildTilemapLayers(level) {
    const T = TILE_SIZE;
    const rows = level.rows, cols = level.cols;
    const only = (keep) => {
      const out = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) row.push(keep.includes(level.grid[r][c]) ? level.grid[r][c] : 0);
        out.push(row);
      }
      return out;
    };

    const makeLayer = (data, depth) => {
      const map = this.make.tilemap({ data, tileWidth: T, tileHeight: T });
      const tileset = map.addTilesetImage('tiles', 'tileset', T, T, 0, 0);
      const layer = map.createLayer(0, tileset, 0, 0).setDepth(depth);
      return layer;
    };

    this.solidLayer = makeLayer(only([TILE.GRASS, TILE.DIRT, TILE.CAVE]), 0);
    this.solidLayer.setCollision([TILE.GRASS, TILE.DIRT, TILE.CAVE]);

    this.islandLayer = makeLayer(only([TILE.ISLAND]), 0);
    this.islandLayer.setCollision([TILE.ISLAND]);

    this.ladderLayer = makeLayer(only([TILE.LADDER]), -10);
  }

  oneWayProcess(player, tile) {
    if (player.body.velocity.y < 0) return false;
    const prevBottom = player.body.bottom - player.body.deltaY();
    return prevBottom <= tile.pixelY + 2;
  }

  // ------------------------------------------------------------ decor
  spawnDecor(level) {
    level.entities.trees.forEach((t) => {
      spawnTree(this, t.col * TILE_SIZE + 16, (t.row + 1) * TILE_SIZE, t.scale);
    });
  }

  // ------------------------------------------------------------ entities
  spawnEntities(level) {
    const e = level.entities;
    e.coins.forEach((c) => this.coins.push(new Coin(this, c.col * TILE_SIZE + 16, c.row * TILE_SIZE + 16)));
    e.mushrooms.forEach((m) => this.mushrooms.push(new Mushroom(this, m.col * TILE_SIZE + 16, m.row * TILE_SIZE + 16)));
    e.fruits.forEach((f) => this.fruits.push(new Fruit(this, f.col * TILE_SIZE + 16, f.row * TILE_SIZE + 16, f.type)));

    e.spikes.forEach((s) => {
      const spr = this.spikesGroup.create(s.col * TILE_SIZE + 16, s.row * TILE_SIZE + 24, 'spike');
      spr.setSize(26, 12).setOffset(3, 4).refreshBody();
    });

    e.crawlers.forEach((c) => {
      const minX = c.minCol * TILE_SIZE + 8, maxX = c.maxCol * TILE_SIZE + 24;
      this.crawlers.push(new Crawler(this, minX, c.row * TILE_SIZE + 16, minX, maxX));
    });

    e.flyers.forEach((f) => {
      const minX = f.minCol * TILE_SIZE + 8, maxX = f.maxCol * TILE_SIZE + 24;
      this.flyers.push(new Flyer(this, minX, f.row * TILE_SIZE + 16, minX, maxX, f.amp, f.speed));
    });

    if (e.boss) {
      const b = e.boss;
      this.boss = new Boss(this, b.col * TILE_SIZE + 16, b.row * TILE_SIZE + 16,
        b.minCol * TILE_SIZE + 32, b.maxCol * TILE_SIZE, b.triggerCol * TILE_SIZE);
    } else {
      this.boss = null;
    }
  }

  onBossOverlap(player, boss) {
    if (boss.dead || !player.alive) return;
    const time = this.time.now;
    // a stomp = falling, and the frog's feet were above the boss's back last frame
    const prevBottom = player.body.bottom - player.body.deltaY();
    const stomping = player.body.velocity.y > 0 && prevBottom <= boss.body.top + 10;
    if (stomping) {
      player.setVelocityY(PHYSICS.jumpVelocity * 0.85);
      if (boss.hit(time)) this.addScore(1000);
    } else if (!boss.isInvulnerable(time)) {
      player.hurt(boss.x);
    }
  }

  onEnemyOverlap(player, enemy) {
    if (enemy.dead || !player.alive) return;
    const stomping = player.body.velocity.y > 0 && player.y < enemy.y - 6;
    if (stomping) {
      enemy.stomp();
      player.setVelocityY(PHYSICS.jumpVelocity * 0.6);
      this.addScore(500);
    } else {
      player.hurt(enemy.x);
    }
  }

  addScore(n) {
    this.score += n;
    this.hud.setScore(this.score);
  }

  onPlayerDied() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    SFX.gameover();
    this.time.delayedCall(700, () => this.scene.start('GameOverScene', {
      win: false, score: this.score, levelIndex: this.levelIndex, levelNumber: this.level.number,
    }));
  }

  completeLevel() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    SFX.win();
    this.player.setVelocity(0, 0);
    this.player.body.moves = false;
    const hasNext = this.levelIndex + 1 < LEVEL_BUILDERS.length;
    this.time.delayedCall(900, () => this.scene.start('GameOverScene', {
      win: true, score: this.score, levelIndex: this.levelIndex, levelNumber: this.level.number,
      hasNext, nextLevelIndex: hasNext ? this.levelIndex + 1 : null,
    }));
  }

  // ------------------------------------------------------------ update
  update(time, delta) {
    if (this.mountainLayer) this.mountainLayer.tilePositionX = this.cameras.main.scrollX * 0.3;
    if (this.cloudLayer) this.cloudLayer.tilePositionX = this.cameras.main.scrollX * 0.5;

    if (this.gameEnded) return;

    const touchState = this.touch.getState();
    const touchJumpJustDown = touchState.jump && !this.prevTouchJump;
    this.prevTouchJump = touchState.jump;

    const input = {
      left: this.cursors.left.isDown || this.keys.A.isDown || touchState.left,
      right: this.cursors.right.isDown || this.keys.D.isDown || touchState.right,
      up: this.cursors.up.isDown || this.keys.W.isDown,
      down: this.cursors.down.isDown || this.keys.S.isDown,
      jump: this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.W.isDown || touchState.jump,
      jumpJustDown:
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
        Phaser.Input.Keyboard.JustDown(this.keys.W) ||
        touchJumpJustDown,
    };

    const ladderTile = this.ladderLayer.getTileAtWorldXY(this.player.x, this.player.y, true);
    const onLadder = !!(ladderTile && ladderTile.index === TILE.LADDER);

    this.player.update(input, time, delta, onLadder);

    this.crawlers = this.crawlers.filter((c) => c.active);
    this.flyers = this.flyers.filter((f) => f.active);
    this.coins = this.coins.filter((c) => c.active);
    this.mushrooms = this.mushrooms.filter((m) => m.active);
    this.fruits = this.fruits.filter((f) => f.active);

    this.crawlers.forEach((c) => c.update(time));
    this.flyers.forEach((f) => f.update(time));
    this.coins.forEach((c) => c.update(time));
    this.mushrooms.forEach((m) => m.update(time));
    this.fruits.forEach((f) => f.update(time));
    if (this.boss && this.boss.active) this.boss.update(time, this.player);

    // safety net: falling out of the world counts as a hit-to-death
    if (this.player.y > this.worldH + 100) {
      this.player.health = 0;
      this.player.alive = false;
      this.onPlayerDied();
    }
  }
}
