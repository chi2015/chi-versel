# Superfrog-style Demo Level (Phaser 3)

A single self-contained side-scrolling platformer level in the visual/gameplay
style of Team17's *Superfrog*, built with **Phaser 3.70 (CDN)** and no
external art or audio assets — every sprite, tile, and sound effect is
generated procedurally at boot time.

## Run it

No build step required.

```bash
# from the project root
python3 -m http.server 8080
# then open http://localhost:8080 in a browser
```

Or just double-click `index.html` — it works directly via `file://` too,
since Phaser is loaded from a CDN `<script>` tag and the game code is plain
(non-module) scripts, which sidesteps the CORS restrictions ES modules hit
under `file://`.

**Why CDN instead of npm/vite:** the brief called for whichever gets a
working demo running fastest with no external image/audio downloads needed
at runtime beyond the Phaser library itself. A single `index.html` +
`<script>` tags needs no `npm install` / build step and still keeps the code
split into clear files.

## Controls

- **Move:** Arrow keys or `A` / `D`
- **Jump:** `Space`, `Up`, or `W` (tap for a short hop, hold for a higher,
  floatier arc — includes ~100ms coyote time and input buffering)
- **Climb ladders:** `Up` / `Down` while overlapping a ladder tile
- **Touch devices:** on-screen ◀ ▶ ⤒ buttons appear automatically (detected
  via `game.device.input.touch`)

3 hits of health (top-left hearts), score/coins top-left. Falling in the pit
at world's bottom or 3 hits ends the run; reaching the flag completes it.
Space / tap restarts from the Game Over / Level Complete screen.

## Project structure

```
index.html            Page shell, loads Phaser from CDN, then src/ in order
src/
  constants.js         Tile IDs, palette, physics tuning — single source of truth
  audio.js              SFX — tiny Web Audio oscillator synth (jump/coin/hit/stomp/etc.)
  textures.js           Procedural art: Graphics -> generateTexture() for every
                         tile/sprite, plus a packed "tileset" spritesheet baked
                         from the individual tile textures via RenderTexture
  level.js              Level DATA ONLY (no Phaser calls): builds a smooth
                         walkable height-map, carves the cave shafts/tunnel,
                         and returns a tile grid + entity spawn list — the
                         same shape a real Tiled JSON export would give you,
                         so swapping in an actual Tiled level later is a
                         drop-in replacement for this one function
  entities.js            Player, Crawler, Flyer, Coin, Mushroom classes + tree/flag helpers
  HUD.js                 Top-left hearts + score display
  TouchControls.js       On-screen mobile buttons
  BootScene.js            Generates all textures, then starts MainScene
  MainScene.js            Builds tilemap layers from level.js data, spawns
                          entities, wires colliders/overlaps, camera, input loop
  GameOverScene.js        Death / level-complete screen with restart
  main.js                 Phaser.Game config + scene list
```

## Level layout (≈100×16 tiles)

1. **Rolling hills** — smooth walkable height-map (max 1-tile step per
   column, so no impossible cliffs), scattered coins, one patrolling crawler.
2. **Floating islands** — 4 grass-capped one-way platforms with coins, a
   mushroom, and a sine-path flyer weaving between them.
3. **Cave detour** — a ladder shaft down from the surface into a horizontal
   tunnel (dark cave tiles), coins + a bonus mushroom along the floor, then a
   second ladder shaft back up to daylight.
4. **Steep hill climb** — rising terrain with a row of spike hazards to jump
   over/around, risk-reward coins near the top.
5. **Forest cluster** — 4 procedurally-drawn trees (lumpy rounded canopy,
   idle sway tween), a patrolling crawler, a mushroom.
6. **Final stretch** — open run with coins and a flyer, ending at a flag.

## Technical notes

- **Physics:** Arcade Physics, per-body gravity (not global) so the player
  can get Superfrog's floaty jump (lower gravity while ascending + holding
  jump, snappier gravity while falling) independent of enemies/props.
- **Tilemap:** built the "Tiled way" — `level.js` returns a plain 2D index
  array, `MainScene` turns it into real `Phaser.Tilemap` layers via
  `scene.make.tilemap({ data, ... })` against a packed tileset spritesheet,
  with separate layers for solid ground, one-way floating islands, and
  (non-solid) ladders.
- **One-way platforms:** the island layer uses a `processCallback` on its
  collider that only allows a collision when the player's *previous* frame
  bottom was above the tile top and they're moving downward — stand-on-top
  works, jumping up through them works.
- **Parallax:** mountain + cloud layers are `TileSprite`s pinned to the
  camera (`scrollFactor(0)`) with `tilePositionX` driven by
  `camera.scrollX * factor` each frame — two independent speeds.
- **No asset downloads:** every texture is drawn with `Phaser.GameObjects.Graphics`
  and baked via `generateTexture()`/`RenderTexture`; every sound is a
  Web Audio oscillator envelope (see `audio.js`) — nothing fetched over the
  network except the Phaser library itself.

## Known simplifications (demo scope)

- Mushroom power-up grants a temporary speed boost + green tint (no separate
  invincibility state beyond the standard post-hit i-frames).
- Enemy patrol bounds are authored per-spawn in `level.js` rather than
  derived from real-time ledge raycasts, which keeps behavior deterministic
  and matches the intended layout.
