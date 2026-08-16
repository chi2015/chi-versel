// ============================================================================
// textures.js — procedurally draws every sprite/tile via Phaser Graphics and
// bakes each into a texture with generateTexture(). No external image files.
// ============================================================================

/** Draw with a Graphics object into a texture, then discard the Graphics. */
function bake(scene, key, w, h, drawFn) {
  const g = scene.add.graphics();
  drawFn(g, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

function noiseDots(g, w, h, count, color, alpha) {
  g.fillStyle(color, alpha);
  for (let i = 0; i < count; i++) {
    const x = Math.floor((i * 37 + (i % 5) * 13) % w);
    const y = Math.floor((i * 19 + (i % 7) * 11) % h);
    g.fillRect(x, y, 2, 2);
  }
}

function generateAllTextures(scene) {
  const T = TILE_SIZE;

  // ---------------------------------------------------------------- tiles
  bake(scene, 'tile-grass', T, T, (g) => {
    g.fillStyle(COLORS.dirt, 1); g.fillRect(0, 0, T, T);
    g.fillStyle(COLORS.dirtDark, 1); g.fillRect(0, T - 6, T, 6);
    noiseDots(g, T, T, 10, COLORS.dirtShadow, 0.5);
    g.fillStyle(COLORS.grassTop, 1); g.fillRect(0, 0, T, 9);
    g.fillStyle(COLORS.grassTopDark, 1); g.fillRect(0, 7, T, 3);
    // little tufts
    g.fillStyle(COLORS.grassTopDark, 1);
    for (let x = 2; x < T; x += 6) g.fillTriangle(x, 0, x + 3, 0, x + 1.5, -4);
    g.fillStyle(COLORS.grassTop, 1);
    g.fillRect(0, 0, T, 3);
  });

  bake(scene, 'tile-dirt', T, T, (g) => {
    g.fillStyle(COLORS.dirt, 1); g.fillRect(0, 0, T, T);
    noiseDots(g, T, T, 14, COLORS.dirtShadow, 0.45);
    g.lineStyle(1, COLORS.dirtDark, 0.6);
    g.strokeRect(0.5, 0.5, T - 1, T - 1);
  });

  bake(scene, 'tile-cave', T, T, (g) => {
    g.fillStyle(COLORS.cave, 1); g.fillRect(0, 0, T, T);
    noiseDots(g, T, T, 16, COLORS.caveShadow, 0.6);
    g.lineStyle(1, COLORS.caveDark, 0.8);
    g.strokeRect(0.5, 0.5, T - 1, T - 1);
    g.fillStyle(COLORS.caveDark, 0.5);
    g.fillTriangle(2, 2, 8, 2, 2, 8);
    g.fillTriangle(T - 2, T - 2, T - 10, T - 2, T - 2, T - 10);
  });

  bake(scene, 'tile-island', T, T, (g) => {
    g.fillStyle(COLORS.dirt, 1); g.fillRoundedRect(0, 6, T, T - 6, 4);
    g.fillStyle(COLORS.dirtDark, 1); g.fillRect(0, T - 5, T, 5);
    noiseDots(g, T, T - 6, 6, COLORS.dirtShadow, 0.4);
    g.fillStyle(COLORS.island, 1); g.fillRect(0, 4, T, 8);
    g.fillStyle(COLORS.islandDark, 1); g.fillRect(0, 10, T, 3);
    g.fillStyle(COLORS.island, 1);
    for (let x = 2; x < T; x += 6) g.fillTriangle(x, 4, x + 3, 4, x + 1.5, 0);
  });

  bake(scene, 'tile-ladder', T, T, (g) => {
    g.fillStyle(COLORS.wood, 0.25); g.fillRect(6, 0, T - 12, T);
    g.fillStyle(COLORS.woodDark, 1);
    g.fillRect(4, 0, 4, T); g.fillRect(T - 8, 0, 4, T);
    g.fillStyle(COLORS.wood, 1);
    for (let y = 3; y < T; y += 8) g.fillRect(4, y, T - 8, 4);
  });

  // ---------------------------------------------------------------- hazards
  bake(scene, 'spike', T, 16, (g) => {
    g.fillStyle(COLORS.spikeDark, 1);
    for (let x = 0; x < T; x += 8) g.fillTriangle(x, 16, x + 8, 16, x + 4, 2);
    g.fillStyle(COLORS.spike, 1);
    for (let x = 0; x < T; x += 8) g.fillTriangle(x + 1, 16, x + 7, 16, x + 4, 4);
  });

  // ---------------------------------------------------------------- flag
  bake(scene, 'flag', 24, T * 3, (g) => {
    g.fillStyle(COLORS.flagPole, 1); g.fillRect(10, 0, 4, T * 3);
    g.fillStyle(COLORS.flagCloth, 1);
    g.fillTriangle(14, 4, 14, 26, 24, 15);
    g.fillStyle(COLORS.spike, 1); g.fillCircle(12, 2, 3);
  });

  // ---------------------------------------------------------------- frog player frames
  const drawFrog = (g, pose) => {
    const cx = 16, cy = 22;
    // back legs
    g.fillStyle(COLORS.frogDark, 1);
    if (pose === 'walk1') { g.fillEllipse(7, 27, 8, 6); g.fillEllipse(25, 24, 7, 5); }
    else if (pose === 'walk2') { g.fillEllipse(7, 24, 7, 5); g.fillEllipse(25, 27, 8, 6); }
    else if (pose === 'jump') { g.fillEllipse(6, 25, 7, 9); g.fillEllipse(26, 25, 7, 9); }
    else { g.fillEllipse(7, 26, 7, 6); g.fillEllipse(25, 26, 7, 6); }
    // body
    g.fillStyle(COLORS.frogBody, 1);
    g.fillEllipse(cx, cy - 4, 20, 16);
    g.fillStyle(COLORS.frogBelly, 1);
    g.fillEllipse(cx, cy, 12, 9);
    // eye bumps
    g.fillStyle(COLORS.frogBody, 1);
    g.fillCircle(11, 9, 6);
    g.fillCircle(21, 9, 6);
    g.fillStyle(pose === 'hurt' ? COLORS.mushroomCap : COLORS.frogEye, 1);
    g.fillCircle(11, 9, 3.4);
    g.fillCircle(21, 9, 3.4);
    g.fillStyle(COLORS.frogPupil, 1);
    const px = pose === 'hurt' ? 0 : 1;
    g.fillCircle(11 + px, 9, 1.6);
    g.fillCircle(21 + px, 9, 1.6);
    // front arms
    g.fillStyle(COLORS.frogDark, 1);
    if (pose === 'jump') { g.fillEllipse(4, 16, 5, 4); g.fillEllipse(28, 16, 5, 4); }
    else { g.fillEllipse(6, 20, 5, 4); g.fillEllipse(26, 20, 5, 4); }
    // mouth
    g.lineStyle(1.4, COLORS.frogDark, 0.8);
    g.beginPath(); g.arc(16, 13, 3, 0.2, Math.PI - 0.2); g.strokePath();
  };
  ['idle', 'walk1', 'walk2', 'jump', 'hurt'].forEach((p) => {
    bake(scene, `frog-${p}`, 32, 32, (g) => drawFrog(g, p));
  });

  // ---------------------------------------------------------------- crawler enemy
  const drawCrawler = (g, frame) => {
    const bob = frame === 1 ? 1 : 0;
    g.fillStyle(COLORS.crawlerDark, 1);
    g.fillEllipse(16, 20 - bob, 15, 6);
    g.fillStyle(COLORS.crawlerBelly, 1);
    g.fillEllipse(16, 21 - bob, 11, 4);
    g.fillStyle(COLORS.crawlerShell, 1);
    g.fillEllipse(16, 14 - bob, 14, 11);
    g.fillStyle(COLORS.crawlerDark, 1);
    g.fillEllipse(16, 12 - bob, 9, 6);
    g.fillStyle(COLORS.frogEye, 1);
    g.fillCircle(9, 15 - bob, 3); g.fillCircle(23, 15 - bob, 3);
    g.fillStyle(COLORS.frogPupil, 1);
    g.fillCircle(9, 15 - bob, 1.3); g.fillCircle(23, 15 - bob, 1.3);
    g.fillStyle(COLORS.crawlerDark, 1);
    g.fillRect(4, 22 - bob, 3, 4); g.fillRect(25, 22 - bob, 3, 4);
    g.fillRect(11, 24 - bob, 3, 3); g.fillRect(18, 24 - bob, 3, 3);
  };
  bake(scene, 'crawler-1', 32, 26, (g) => drawCrawler(g, 0));
  bake(scene, 'crawler-2', 32, 26, (g) => drawCrawler(g, 1));

  // ---------------------------------------------------------------- flyer enemy
  const drawFlyer = (g, frame) => {
    const wing = frame === 1 ? 10 : 6;
    g.fillStyle(COLORS.flyerWing, 0.85);
    g.fillEllipse(11, 11 - wing / 3, 9, 4);
    g.fillEllipse(21, 11 - wing / 3, 9, 4);
    g.fillStyle(COLORS.flyerBody, 1);
    g.fillEllipse(16, 15, 13, 9);
    g.fillStyle(COLORS.flyerDark, 1);
    g.fillRect(9, 11, 14, 3); g.fillRect(9, 17, 14, 3);
    g.fillStyle(COLORS.frogEye, 1);
    g.fillCircle(21, 12, 3);
    g.fillStyle(COLORS.frogPupil, 1);
    g.fillCircle(22, 12, 1.4);
    g.lineStyle(1.5, COLORS.crawlerDark, 1);
    g.beginPath(); g.moveTo(27, 13); g.lineTo(31, 11); g.strokePath();
    g.beginPath(); g.moveTo(27, 16); g.lineTo(31, 18); g.strokePath();
  };
  bake(scene, 'flyer-1', 32, 22, (g) => drawFlyer(g, 0));
  bake(scene, 'flyer-2', 32, 22, (g) => drawFlyer(g, 1));

  // ---------------------------------------------------------------- coin (rotation frames)
  [1, 0.66, 0.28, 0.66].forEach((squash, i) => {
    bake(scene, `coin-${i + 1}`, 16, 16, (g) => {
      const w = Math.max(2, 12 * squash);
      g.fillStyle(COLORS.coinDark, 1); g.fillEllipse(8, 8, w, 12);
      g.fillStyle(COLORS.coin, 1); g.fillEllipse(8, 8, Math.max(1, w - 3), 9);
      if (squash > 0.5) {
        g.fillStyle(COLORS.coinDark, 1);
        g.fillRect(8 - 1, 4, 2, 8);
      }
    });
  });

  // ---------------------------------------------------------------- fruits
  bake(scene, 'fruit-apple', 20, 20, (g) => {
    g.fillStyle(COLORS.woodDark, 1); g.fillRect(9, 1, 2, 5);
    g.fillStyle(COLORS.treeCanopy, 1); g.fillEllipse(13, 4, 6, 4);
    g.fillStyle(0xe0342a, 1);
    g.fillCircle(8, 12, 7); g.fillCircle(13, 12, 7);
    g.fillStyle(0xffffff, 0.25); g.fillCircle(8, 9, 2.4);
  });

  bake(scene, 'fruit-banana', 22, 20, (g) => {
    g.lineStyle(6, 0xf2d13c, 1);
    g.beginPath();
    g.arc(11, 16, 11, Math.PI * 1.15, Math.PI * 1.9);
    g.strokePath();
    g.lineStyle(2, 0x9a7a1a, 1);
    g.beginPath();
    g.moveTo(1, 12); g.lineTo(3, 8); g.strokePath();
  });

  bake(scene, 'fruit-cherry', 20, 20, (g) => {
    g.lineStyle(2, COLORS.treeCanopy, 1);
    g.beginPath(); g.moveTo(9, 1); g.lineTo(7, 9); g.strokePath();
    g.beginPath(); g.moveTo(9, 1); g.lineTo(14, 8); g.strokePath();
    g.fillStyle(0xd6203c, 1);
    g.fillCircle(6, 13, 6); g.fillCircle(14, 12, 6);
    g.fillStyle(0xffffff, 0.25); g.fillCircle(4, 11, 1.8); g.fillCircle(12, 10, 1.8);
  });

  // ---------------------------------------------------------------- mushroom
  bake(scene, 'mushroom', 26, 24, (g) => {
    g.fillStyle(COLORS.mushroomStem, 1);
    g.fillRoundedRect(8, 12, 10, 12, 3);
    g.fillStyle(COLORS.mushroomCap, 1);
    g.fillEllipse(13, 10, 24, 16);
    g.fillStyle(COLORS.mushroomSpots, 1);
    g.fillCircle(7, 6, 2.6); g.fillCircle(18, 5, 2.2); g.fillCircle(13, 11, 2.4);
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(13, 15, 20, 4);
  });

  // ---------------------------------------------------------------- tree (trunk + canopy)
  [1.0, 0.85].forEach((scale, i) => {
    const w = Math.round(56 * scale), h = Math.round(72 * scale);
    bake(scene, `tree-${i + 1}`, w, h, (g) => {
      const trunkW = w * 0.16;
      g.fillStyle(COLORS.treeTrunk, 1);
      g.fillRect(w / 2 - trunkW / 2, h * 0.55, trunkW, h * 0.45);
      g.fillStyle(COLORS.woodDark, 0.5);
      g.fillRect(w / 2 - trunkW / 2, h * 0.55, trunkW * 0.35, h * 0.45);
      // rounded lumpy canopy made of overlapping circles
      g.fillStyle(COLORS.treeCanopyDark, 1);
      g.fillCircle(w * 0.5, h * 0.42, w * 0.34);
      g.fillCircle(w * 0.27, h * 0.5, w * 0.24);
      g.fillCircle(w * 0.73, h * 0.5, w * 0.24);
      g.fillStyle(COLORS.treeCanopy, 1);
      g.fillCircle(w * 0.5, h * 0.34, w * 0.34);
      g.fillCircle(w * 0.25, h * 0.42, w * 0.22);
      g.fillCircle(w * 0.75, h * 0.42, w * 0.22);
      g.fillCircle(w * 0.5, h * 0.5, w * 0.26);
      g.fillStyle(0xffffff, 0.08);
      g.fillCircle(w * 0.38, h * 0.28, w * 0.12);
    });
  });

  // ---------------------------------------------------------------- decor: sun / clouds / mountains
  bake(scene, 'sun', 96, 96, (g) => {
    const cx = 48, cy = 48;
    g.lineStyle(6, COLORS.sun, 0.9);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
      g.lineTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46);
      g.strokePath();
    }
    g.fillStyle(COLORS.sun, 1); g.fillCircle(cx, cy, 30);
    g.fillStyle(COLORS.sunCore, 1); g.fillCircle(cx, cy, 20);
  });

  bake(scene, 'cloud-tile', 400, 200, (g) => {
    const puff = (x, y, s) => {
      g.fillStyle(COLORS.cloud, 0.85);
      g.fillCircle(x, y, 16 * s);
      g.fillCircle(x + 14 * s, y - 6 * s, 13 * s);
      g.fillCircle(x - 14 * s, y - 4 * s, 12 * s);
      g.fillCircle(x + 2 * s, y - 12 * s, 11 * s);
    };
    puff(60, 40, 1);
    puff(230, 80, 0.8);
    puff(340, 30, 0.6);
  });

  bake(scene, 'mountain-tile', 400, 220, (g) => {
    g.fillStyle(COLORS.mountainFar, 0.7);
    g.beginPath();
    g.moveTo(0, 220); g.lineTo(0, 140);
    g.lineTo(60, 70); g.lineTo(130, 130); g.lineTo(210, 40);
    g.lineTo(290, 120); g.lineTo(360, 60); g.lineTo(400, 110);
    g.lineTo(400, 220); g.closePath(); g.fillPath();
    g.fillStyle(COLORS.mountainNear, 0.85);
    g.beginPath();
    g.moveTo(0, 220); g.lineTo(0, 180);
    g.lineTo(90, 110); g.lineTo(180, 175); g.lineTo(260, 100);
    g.lineTo(330, 165); g.lineTo(400, 130); g.lineTo(400, 220);
    g.closePath(); g.fillPath();
  });

  bake(scene, 'sky-gradient', 960, 540, (g) => {
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(COLORS.skyTop),
        Phaser.Display.Color.ValueToColor(COLORS.skyBottom),
        steps, i
      );
      g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
      g.fillRect(0, Math.floor((540 / steps) * i), 960, Math.ceil(540 / steps) + 1);
    }
  });

  // ---------------------------------------------------------------- HUD icons
  bake(scene, 'hud-heart', 20, 18, (g) => {
    g.fillStyle(COLORS.heart, 1);
    g.fillCircle(6, 6, 6); g.fillCircle(14, 6, 6);
    g.fillTriangle(0, 8, 20, 8, 10, 18);
  });
  bake(scene, 'hud-heart-empty', 20, 18, (g) => {
    g.lineStyle(2, COLORS.heartEmpty, 0.8);
    g.strokeCircle(6, 6, 5); g.strokeCircle(14, 6, 5);
    g.strokeTriangle(1, 8, 19, 8, 10, 17);
  });
  bake(scene, 'hud-coin', 18, 18, (g) => {
    g.fillStyle(COLORS.coinDark, 1); g.fillCircle(9, 9, 9);
    g.fillStyle(COLORS.coin, 1); g.fillCircle(9, 9, 7);
    g.lineStyle(1, COLORS.coinDark, 0.6); g.strokeCircle(9, 9, 4);
  });

  // 1x1 white pixel, handy for tinted rects/particles
  bake(scene, 'pixel', 4, 4, (g) => {
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4);
  });

  // ---------------------------------------------------------------- packed
  // tileset spritesheet: frame index == TILE.* value, for the Tiled-style
  // tilemap layers built from the plain 2D array in level.js.
  const tileKeysByIndex = [null, 'tile-grass', 'tile-dirt', 'tile-cave', 'tile-island', 'tile-ladder'];
  const rt = scene.add.renderTexture(0, 0, T * tileKeysByIndex.length, T);
  tileKeysByIndex.forEach((key, i) => { if (key) rt.draw(key, i * T, 0); });
  rt.saveTexture('tileset');
  rt.destroy();
}
