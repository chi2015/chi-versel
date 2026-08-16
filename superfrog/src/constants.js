// ============================================================================
// constants.js — shared config, tile IDs, and palette (Superfrog-ish colors)
// ============================================================================

const TILE_SIZE = 32;

// Tile grid indices used by level.js / MainScene tilemap layers
const TILE = {
  EMPTY: 0,
  GRASS: 1,   // grass-capped dirt, fully solid
  DIRT: 2,    // plain dirt fill, fully solid
  CAVE: 3,    // dark cave rock, fully solid
  ISLAND: 4,  // thin floating grass island, one-way solid (top only)
  LADDER: 5,  // climbable, not solid
};

const WORLD_COLS = 100;
const WORLD_ROWS = 16;

const COLORS = {
  skyTop: 0x8fd3ff,
  skyBottom: 0x4f8fe8,
  sun: 0xffe066,
  sunCore: 0xfff3b0,
  mountainFar: 0x8f86c9,
  mountainNear: 0x6d63ad,
  cloud: 0xffffff,

  grassTop: 0x6fcf3f,
  grassTopDark: 0x4fae23,
  dirt: 0x9a6a3a,
  dirtDark: 0x7c5029,
  dirtShadow: 0x5f3d1e,

  cave: 0x4a3a2c,
  caveDark: 0x2e2219,
  caveShadow: 0x1c140e,

  island: 0x7fdb4f,
  islandDark: 0x5fae2f,

  spike: 0xc6ccd4,
  spikeDark: 0x8a919c,

  wood: 0x8a5a2e,
  woodDark: 0x5f3c1c,

  frogBody: 0x4fc44f,
  frogDark: 0x2f9a3a,
  frogBelly: 0xe8f7c0,
  frogEye: 0xffffff,
  frogPupil: 0x1a1a1a,

  crawlerShell: 0x9a4fc4,
  crawlerDark: 0x6a2f8a,
  crawlerBelly: 0xe0c8f0,

  flyerBody: 0xf2b23c,
  flyerDark: 0xb8791f,
  flyerWing: 0xffffff,

  coin: 0xffd23c,
  coinDark: 0xcf9a12,
  mushroomCap: 0xe5473a,
  mushroomSpots: 0xffffff,
  mushroomStem: 0xf2e3c6,

  treeTrunk: 0x6b4423,
  treeCanopy: 0x2f8f3f,
  treeCanopyDark: 0x1f6b2b,

  flagPole: 0xc6ccd4,
  flagCloth: 0xff5a3c,

  heart: 0xff5a6a,
  heartEmpty: 0x3a3a3a,
};

// Physics tuning — floaty Superfrog-style arc
const PHYSICS = {
  gravityUp: 1000,     // gravity while ascending & jump held (floaty)
  gravityDown: 1900,   // gravity while falling (snappier descent)
  gravityDefault: 1600,
  runSpeed: 165,
  runAccel: 900,
  runDrag: 900,
  jumpVelocity: -480,
  coyoteMs: 100,
  jumpBufferMs: 120,
  climbSpeed: 110,
  invincibleMs: 1500,
  hurtKnockbackX: 140,
  hurtKnockbackY: -260,
};
