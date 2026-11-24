// ============================================================================
// entities.js — Player controller + enemy/collectible/prop classes.
// ============================================================================

// ---------------------------------------------------------------- Player
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'frog-idle');
    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(20, 24).setOffset(6, 8);
    this.setCollideWorldBounds(true);
    this.setMaxVelocity(260, 900);
    this.setDragX(PHYSICS.runDrag);
    this.body.setGravityY(PHYSICS.gravityDown);

    this.health = 3;
    this.maxHealth = 3;
    this.invincible = false;
    this.invincibleUntil = 0;
    this.facing = 1;
    this.lastGroundedTime = -9999;
    this.jumpPressedTime = -9999;
    this.isClimbing = false;
    this.boostUntil = 0;
    this.alive = true;

    this.anims.create({ key: 'frog-walk', frames: [{ key: 'frog-walk1' }, { key: 'frog-walk2' }], frameRate: 8, repeat: -1 });
  }

  get isBoosted() { return this.scene.time.now < this.boostUntil; }

  applyBoost(durationMs) {
    this.boostUntil = this.scene.time.now + durationMs;
    this.setTint(0x9fffb0);
  }

  hurt(sourceX) {
    if (this.invincible || !this.alive) return false;
    this.health = Math.max(0, this.health - 1);
    this.invincible = true;
    this.invincibleUntil = this.scene.time.now + PHYSICS.invincibleMs;
    const dir = this.x < sourceX ? -1 : 1;
    this.setVelocityX(dir * PHYSICS.hurtKnockbackX);
    this.setVelocityY(PHYSICS.hurtKnockbackY);
    this.setTexture('frog-hurt');
    SFX.hit();
    this.scene.events.emit('playerHurt', this.health);
    if (this.health <= 0) {
      this.alive = false;
      this.scene.events.emit('playerDied');
    }
    return true;
  }

  update(input, time, delta, onLadderTile) {
    if (!this.alive) return;

    const left = input.left, right = input.right, jumpDown = input.jump, jumpJustDown = input.jumpJustDown;
    const speedMul = this.isBoosted ? 1.6 : 1;

    // ---- climbing ----
    if (onLadderTile && (input.up || input.down || this.isClimbing)) {
      this.isClimbing = true;
      this.body.setAllowGravity(false);
      let climbY = 0;
      if (input.up) climbY = -PHYSICS.climbSpeed;
      else if (input.down) climbY = PHYSICS.climbSpeed;
      this.setVelocityY(climbY);
      this.setVelocityX(left ? -PHYSICS.runSpeed * 0.6 : right ? PHYSICS.runSpeed * 0.6 : 0);
      if (jumpJustDown) {
        this.isClimbing = false;
        this.body.setAllowGravity(true);
        this.setVelocityY(PHYSICS.jumpVelocity * 0.7);
      }
    } else {
      if (this.isClimbing) { this.isClimbing = false; this.body.setAllowGravity(true); }

      // ---- horizontal movement ----
      if (left && !right) {
        this.setAccelerationX(-PHYSICS.runAccel);
        this.facing = -1;
      } else if (right && !left) {
        this.setAccelerationX(PHYSICS.runAccel);
        this.facing = 1;
      } else {
        this.setAccelerationX(0);
      }
      const maxSpd = PHYSICS.runSpeed * speedMul;
      this.setMaxVelocity(maxSpd, 900);

      // ---- jump (coyote time + variable gravity for floaty arc) ----
      const grounded = this.body.blocked.down || this.body.touching.down;
      if (grounded) this.lastGroundedTime = time;
      if (jumpJustDown) this.jumpPressedTime = time;

      const withinCoyote = time - this.lastGroundedTime <= PHYSICS.coyoteMs;
      const withinBuffer = time - this.jumpPressedTime <= PHYSICS.jumpBufferMs;
      if (withinBuffer && withinCoyote) {
        this.setVelocityY(PHYSICS.jumpVelocity);
        this.lastGroundedTime = -9999;
        this.jumpPressedTime = -9999;
        SFX.jump();
      }

      // floaty ascent, snappier fall
      if (this.body.velocity.y < 0) {
        this.body.setGravityY(jumpDown ? PHYSICS.gravityUp : PHYSICS.gravityDown);
      } else {
        this.body.setGravityY(PHYSICS.gravityDown);
      }
    }

    // ---- invincibility flicker ----
    if (this.invincible) {
      this.setVisible(Math.floor(time / 80) % 2 === 0);
      if (time > this.invincibleUntil) { this.invincible = false; this.setVisible(true); }
    }
    if (this.isBoosted) this.setTint(0x9fffb0); else if (!this.invincible) this.clearTint();

    // ---- animation state ----
    if (!this.invincible || Math.floor(time / 80) % 2 === 0) {
      const grounded = this.body.blocked.down || this.body.touching.down;
      if (!grounded && !this.isClimbing) {
        this.setTexture('frog-jump');
      } else if (Math.abs(this.body.velocity.x) > 20) {
        this.setTexture(Math.floor(time / 110) % 2 === 0 ? 'frog-walk1' : 'frog-walk2');
      } else {
        this.setTexture('frog-idle');
      }
    }
    this.setFlipX(this.facing < 0);
  }
}

// ---------------------------------------------------------------- Crawler enemy
class Crawler extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, minX, maxX) {
    super(scene, x, y, 'crawler-1');
    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(22, 16).setOffset(5, 8);
    this.body.setGravityY(PHYSICS.gravityDown);
    this.minX = minX; this.maxX = maxX;
    this.dir = 1;
    this.speed = 45;
    this.dead = false;
    this.setCollideWorldBounds(false);
  }

  update(time) {
    if (this.dead) return;
    if (this.x <= this.minX) this.dir = 1;
    if (this.x >= this.maxX) this.dir = -1;
    if (this.body.blocked.right) this.dir = -1;
    if (this.body.blocked.left) this.dir = 1;
    this.setVelocityX(this.speed * this.dir);
    this.setFlipX(this.dir < 0);
    this.setTexture(Math.floor(time / 220) % 2 === 0 ? 'crawler-1' : 'crawler-2');
  }

  stomp() {
    if (this.dead) return;
    this.dead = true;
    SFX.stomp();
    this.body.enable = false;
    this.scene.tweens.add({
      targets: this, scaleY: 0.15, scaleX: 1.2, y: this.y + 8, alpha: 0.6,
      duration: 180, onComplete: () => this.destroy(),
    });
  }
}

// ---------------------------------------------------------------- Flyer enemy
class Flyer extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, minX, maxX, amp, speed) {
    super(scene, x, y, 'flyer-1');
    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setSize(22, 16).setOffset(5, 4);
    this.minX = minX; this.maxX = maxX;
    this.baseY = y;
    this.amp = amp * TILE_SIZE;
    this.hspeed = speed;
    this.dir = 1;
    this.phase = Math.random() * Math.PI * 2;
    this.dead = false;
  }

  update(time) {
    if (this.dead) return;
    if (this.x <= this.minX) this.dir = 1;
    if (this.x >= this.maxX) this.dir = -1;
    this.setVelocityX(this.hspeed * this.dir);
    this.y = this.baseY + Math.sin(time / 450 + this.phase) * this.amp;
    this.setFlipX(this.dir < 0);
    this.setTexture(Math.floor(time / 180) % 2 === 0 ? 'flyer-1' : 'flyer-2');
  }

  stomp() {
    if (this.dead) return;
    this.dead = true;
    SFX.stomp();
    this.body.enable = false;
    this.scene.tweens.add({
      targets: this, scale: 0.1, alpha: 0, angle: 180,
      duration: 200, onComplete: () => this.destroy(),
    });
  }
}

// ---------------------------------------------------------------- Boss: King Beetle
// Sleeps until the player passes triggerX, then patrols its arena and hops.
// Takes 3 stomps; after each one it flashes, is briefly invulnerable, and
// gets faster and hops more often.
class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, minX, maxX, triggerX) {
    super(scene, x, y, 'boss-1');
    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(48, 32).setOffset(8, 14);
    this.body.setGravityY(PHYSICS.gravityDown);
    this.setCollideWorldBounds(true);
    this.setDepth(5);
    this.minX = minX; this.maxX = maxX; this.triggerX = triggerX;
    this.maxHealth = 3;
    this.health = 3;
    this.dir = -1;
    this.awake = false;
    this.dead = false;
    this.invulnerableUntil = 0;
    this.nextHopAt = 0;
  }

  get speed() { return [0, 150, 110, 75][this.health]; }

  isInvulnerable(time) { return time < this.invulnerableUntil; }

  update(time, player) {
    if (this.dead) return;
    this.setTexture(Math.floor(time / (this.awake ? 160 : 400)) % 2 === 0 ? 'boss-1' : 'boss-2');
    if (!this.awake) {
      this.setVelocityX(0);
      if (player.x > this.triggerX) {
        this.awake = true;
        this.nextHopAt = time + 1500;
        this.scene.events.emit('bossAwake', this.health, this.maxHealth);
      }
      return;
    }
    if (this.x <= this.minX || this.body.blocked.left) this.dir = 1;
    if (this.x >= this.maxX || this.body.blocked.right) this.dir = -1;
    this.setVelocityX(this.speed * this.dir);

    const grounded = this.body.blocked.down;
    if (grounded && time > this.nextHopAt) {
      const anger = this.maxHealth - this.health;
      this.setVelocityY(-380 - anger * 60);
      this.nextHopAt = time + 2200 - anger * 500 + Math.random() * 900;
    }

    this.setAlpha(this.isInvulnerable(time) && Math.floor(time / 70) % 2 === 0 ? 0.4 : 1);
  }

  hit(time) {
    if (this.dead || this.isInvulnerable(time)) return false;
    this.health -= 1;
    SFX.stomp();
    this.invulnerableUntil = time + 1000;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
    this.scene.cameras.main.shake(150, 0.006);
    this.scene.events.emit('bossHit', this.health, this.maxHealth);
    if (this.health <= 0) this.die();
    return true;
  }

  die() {
    this.dead = true;
    this.body.enable = false;
    this.setAlpha(1);
    SFX.gameover();
    this.scene.tweens.add({
      targets: this, scaleY: 0.2, scaleX: 1.3, y: this.y + 14, alpha: 0, angle: 10,
      duration: 700, ease: 'Quad.easeIn',
      onComplete: () => {
        this.scene.events.emit('bossDefeated');
        this.destroy();
      },
    });
  }
}

// ---------------------------------------------------------------- Coin
class Coin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'coin-1');
    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.moves = false;
    this.setSize(14, 14);
    this.baseY = y;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(time) {
    if (!this.active || !this.body || !this.body.enable) return; // skip bob once collect() takes over `y`
    this.y = this.baseY + Math.sin(time / 260 + this.phase) * 3;
    this.body.reset(this.x, this.y);
    const f = Math.floor(time / 110 + this.phase * 10) % 4;
    this.setTexture(`coin-${f + 1}`);
  }

  collect() {
    SFX.coin();
    this.scene.tweens.add({ targets: this, y: this.y - 14, alpha: 0, duration: 220, onComplete: () => this.destroy() });
    this.body.enable = false;
  }
}

// ---------------------------------------------------------------- Fruit
const FRUIT_TYPES = ['apple', 'banana', 'cherry'];

class Fruit extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type) {
    super(scene, x, y, `fruit-${type}`);
    this.scene = scene;
    this.type = type;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.moves = false;
    this.setSize(16, 16);
    this.baseY = y;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(time) {
    if (!this.active || !this.body || !this.body.enable) return; // skip bob once collect() takes over `y`
    this.y = this.baseY + Math.sin(time / 300 + this.phase) * 3;
    this.body.reset(this.x, this.y);
  }

  collect() {
    SFX.coin();
    this.scene.tweens.add({ targets: this, y: this.y - 14, alpha: 0, scale: 1.3, duration: 220, onComplete: () => this.destroy() });
    this.body.enable = false;
  }
}

// ---------------------------------------------------------------- Mushroom power-up
class Mushroom extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'mushroom');
    this.scene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.moves = false;
    this.setSize(20, 18);
    this.baseY = y;
  }

  update(time) {
    if (!this.active || !this.body || !this.body.enable) return; // skip bob once collect() takes over `y`
    this.y = this.baseY + Math.sin(time / 400) * 2;
    this.body.reset(this.x, this.y);
  }

  collect() {
    SFX.powerup();
    this.scene.tweens.add({ targets: this, scale: 1.4, alpha: 0, duration: 250, onComplete: () => this.destroy() });
    this.body.enable = false;
  }
}

// ---------------------------------------------------------------- helpers: tree / flag
function spawnTree(scene, x, y, scale) {
  const key = Math.random() < 0.5 ? 'tree-1' : 'tree-2';
  const img = scene.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale);
  scene.tweens.add({
    targets: img,
    angle: { from: -2.5, to: 2.5 },
    duration: 1800 + Math.random() * 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: Math.random() * 500,
  });
  return img;
}
