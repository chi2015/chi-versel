// ============================================================================
// level.js — procedural level data, built like a Tiled workflow: a 2D tile
// grid (per-layer) plus an entity spawn list. Pure data/logic, no Phaser
// dependency, so it can be swapped for a real Tiled JSON export later.
// ============================================================================

/**
 * Interpolate a smooth surface-height curve through keyframes, clamped to a
 * max step of 1 row per column so every slope stays walkable.
 */
function interpolateHeights(keyframes, cols) {
  const raw = new Array(cols).fill(keyframes[keyframes.length - 1][1]);
  for (let i = 0; i < keyframes.length - 1; i++) {
    const [c0, r0] = keyframes[i];
    const [c1, r1] = keyframes[i + 1];
    const span = Math.max(1, c1 - c0);
    for (let c = c0; c <= c1 && c < cols; c++) {
      const t = (c - c0) / span;
      raw[c] = r0 + (r1 - r0) * t;
    }
  }
  const rounded = new Array(cols);
  rounded[0] = Math.round(raw[0]);
  for (let c = 1; c < cols; c++) {
    const target = Math.round(raw[c]);
    const prev = rounded[c - 1];
    if (target > prev) rounded[c] = prev + 1;
    else if (target < prev) rounded[c] = prev - 1;
    else rounded[c] = prev;
  }
  return rounded;
}

function buildLevel1_1() {
  const cols = WORLD_COLS;
  const rows = WORLD_ROWS;

  // --- surface height keyframes (col, row) -> smooth walkable hill line ---
  const keyframes = [
    [0, 11], [3, 10], [6, 8], [9, 9], [12, 7], [16, 10],
    [17, 12], [30, 12],
    [31, 11], [46, 11],
    [47, 11], [52, 8], [57, 6], [60, 6],
    [64, 7], [70, 8], [75, 9],
    [76, 9], [99, 9],
  ];
  const surfaceRow = interpolateHeights(keyframes, cols);

  // --- base grid: solid ground from surface down to bottom row ---
  const grid = [];
  for (let r = 0; r < rows; r++) grid.push(new Array(cols).fill(TILE.EMPTY));
  for (let c = 0; c < cols; c++) {
    for (let r = surfaceRow[c]; r < rows; r++) {
      grid[r][c] = r === surfaceRow[c] ? TILE.GRASS : TILE.DIRT;
    }
  }

  const entities = {
    coins: [], mushrooms: [], fruits: [], spikes: [], trees: [],
    crawlers: [], flyers: [], flag: null, playerStart: null, decorSuns: [],
  };

  const setTile = (r, c, v) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = v;
  };

  // ---- Zone 2: floating islands (cols 17-30) --------------------------
  const islands = [
    { c0: 18, c1: 20, row: 7 },
    { c0: 22, c1: 23, row: 5 },
    { c0: 25, c1: 27, row: 8 },
    { c0: 29, c1: 30, row: 6 },
  ];
  islands.forEach((isl) => {
    for (let c = isl.c0; c <= isl.c1; c++) setTile(isl.row, c, TILE.ISLAND);
    entities.coins.push({ col: (isl.c0 + isl.c1) / 2, row: isl.row - 1 });
  });
  entities.mushrooms.push({ col: 22, row: islands[1].row - 1 });
  entities.fruits.push({ col: 20, row: islands[0].row - 1, type: 'apple' });
  entities.flyers.push({ minCol: 18, maxCol: 29, row: 9, amp: 2.2, speed: 55 });

  // ---- Zone 3: cave detour (cols 31-46) --------------------------------
  const tunnelFloorRow = 14;
  const tunnelAirRows = [12, 13];
  const caveC0 = 31, caveC1 = 46;
  for (let c = caveC0; c <= caveC1; c++) {
    tunnelAirRows.forEach((r) => setTile(r, c, TILE.EMPTY));
    setTile(tunnelFloorRow, c, TILE.CAVE);
    if (surfaceRow[c] > 11) setTile(11, c, TILE.CAVE); // recolor stray ceiling fill
  }
  setTile(tunnelAirRows[0] - 0, caveC0, TILE.CAVE); // reinforce left end wall
  for (let r = tunnelAirRows[0]; r <= tunnelFloorRow; r++) {
    setTile(r, caveC0, TILE.CAVE);
    setTile(r, caveC1, TILE.CAVE);
  }

  const shaftDownCol = 33, shaftDownWide = 34;
  const shaftUpCol = 44, shaftUpWide = 45;
  for (let r = surfaceRow[shaftDownCol]; r <= 13; r++) {
    setTile(r, shaftDownCol, TILE.LADDER);
    setTile(r, shaftDownWide, TILE.EMPTY);
  }
  for (let r = surfaceRow[shaftUpCol]; r <= 13; r++) {
    setTile(r, shaftUpCol, TILE.LADDER);
    setTile(r, shaftUpWide, TILE.EMPTY);
  }

  // coins along the tunnel floor, plus a bonus mushroom in a nook
  for (let c = caveC0 + 2; c <= caveC1 - 2; c += 2) {
    entities.coins.push({ col: c, row: tunnelFloorRow - 1 });
  }
  entities.mushrooms.push({ col: 38, row: tunnelFloorRow - 1 });
  entities.fruits.push({ col: 41, row: tunnelFloorRow - 1, type: 'banana' });

  // ---- Zone 4: steep hill climb with spikes (cols 47-60) --------------
  [53, 55, 57].forEach((c) => {
    entities.spikes.push({ col: c, row: surfaceRow[c] - 1 });
  });
  for (let c = 48; c <= 60; c += 3) {
    entities.coins.push({ col: c, row: surfaceRow[c] - 2 });
  }
  entities.fruits.push({ col: 58, row: surfaceRow[58] - 2, type: 'cherry' });

  // ---- Zone 5: forest cluster (cols 61-75) -----------------------------
  [64, 67, 70, 73].forEach((c, i) => {
    entities.trees.push({ col: c, row: surfaceRow[c] - 1, scale: i % 2 === 0 ? 1.1 : 0.85 });
  });
  entities.crawlers.push({ minCol: 62, maxCol: 68, row: surfaceRow[65] - 1 });
  entities.mushrooms.push({ col: 71, row: surfaceRow[71] - 1 });
  entities.fruits.push({ col: 68, row: surfaceRow[68] - 2, type: 'apple' });

  // ---- Zone 1 extra: an early crawler on the hills ----------------------
  entities.crawlers.push({ minCol: 5, maxCol: 9, row: surfaceRow[7] - 1 });
  for (let c = 1; c <= 15; c += 2) {
    entities.coins.push({ col: c, row: surfaceRow[c] - 2 });
  }

  // ---- Zone 6: final stretch + flag (cols 76-99) ------------------------
  for (let c = 77; c <= 93; c += 2) {
    entities.coins.push({ col: c, row: surfaceRow[c] - 2 });
  }
  entities.flyers.push({ minCol: 84, maxCol: 94, row: surfaceRow[88] - 3, amp: 1.5, speed: 60 });
  entities.crawlers.push({ minCol: 78, maxCol: 83, row: surfaceRow[80] - 1 });
  entities.fruits.push({ col: 90, row: surfaceRow[90] - 2, type: 'banana' });
  entities.fruits.push({ col: 94, row: surfaceRow[94] - 2, type: 'cherry' });

  const flagCol = 96;
  entities.flag = { col: flagCol, row: surfaceRow[flagCol] - 1 };

  entities.playerStart = { col: 1, row: surfaceRow[1] - 1 };
  entities.decorSuns.push({ col: 20, row: 1 });

  return { cols, rows, tileSize: TILE_SIZE, grid, surfaceRow, entities, number: '1-1', title: 'Forest' };
}

/**
 * Level 1-2 — bigger and busier than 1-1: a bonus well shaft near the start,
 * two floating-island clusters, a standalone climbable spire, two cave/mine
 * tunnels, two spike climbs, and a longer forest run to the flag.
 */
function buildLevel1_2() {
  const cols = 150;
  const rows = 20;

  // --- surface height keyframes (col, row) -> smooth walkable hill line ---
  const keyframes = [
    [0, 11], [4, 10], [6, 11], [9, 11],
    [13, 8], [16, 11], [20, 12], [21, 12],
    [40, 12], [41, 11], [45, 11],
    [46, 11], [64, 11],
    [65, 10], [68, 9], [72, 6], [76, 5], [80, 5],
    [81, 6], [84, 8],
    [85, 10], [108, 10],
    [109, 9], [112, 7], [115, 6], [116, 11], [119, 11],
    [120, 11], [134, 11],
    [135, 10], [138, 9], [139, 9], [146, 9],
    [147, 9], [149, 9],
  ];
  const surfaceRow = interpolateHeights(keyframes, cols);

  // --- base grid: solid ground from surface down to bottom row ---
  const grid = [];
  for (let r = 0; r < rows; r++) grid.push(new Array(cols).fill(TILE.EMPTY));
  for (let c = 0; c < cols; c++) {
    for (let r = surfaceRow[c]; r < rows; r++) {
      grid[r][c] = r === surfaceRow[c] ? TILE.GRASS : TILE.DIRT;
    }
  }

  const entities = {
    coins: [], mushrooms: [], fruits: [], spikes: [], trees: [],
    crawlers: [], flyers: [], flag: null, playerStart: null, decorSuns: [],
  };

  const setTile = (r, c, v) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = v;
  };

  // ---- Zone 0: opening hills + a bonus well shaft (cols 0-20) ----------
  entities.crawlers.push({ minCol: 12, maxCol: 18, row: surfaceRow[15] - 1 });
  for (let c = 1; c <= 5; c += 2) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });
  for (let c = 10; c <= 20; c += 2) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });

  // bonus well: a 3-wide pit with a central ladder, side ledges, and a floor
  const wellC0 = 6, wellC1 = 8, wellLadderCol = 7, wellFloorRow = rows - 1, wellLedgeRow = 14;
  for (let r = 11; r <= wellFloorRow - 1; r++) {
    setTile(r, wellC0, TILE.EMPTY);
    setTile(r, wellLadderCol, TILE.LADDER);
    setTile(r, wellC1, TILE.EMPTY);
  }
  setTile(wellFloorRow, wellC0, TILE.CAVE);
  setTile(wellFloorRow, wellLadderCol, TILE.CAVE);
  setTile(wellFloorRow, wellC1, TILE.CAVE);
  setTile(wellLedgeRow, wellC0, TILE.CAVE);
  setTile(wellLedgeRow, wellC1, TILE.CAVE);
  entities.coins.push({ col: wellC0, row: wellLedgeRow - 1 });
  entities.coins.push({ col: wellC1, row: wellLedgeRow - 1 });
  entities.fruits.push({ col: wellLadderCol, row: wellFloorRow - 1, type: 'cherry' });

  // ---- Zone 1: floating island cluster 1 (cols 22-40) -----------------
  const islands1 = [
    { c0: 23, c1: 25, row: 8 },
    { c0: 27, c1: 28, row: 6 },
    { c0: 30, c1: 32, row: 9 },
    { c0: 34, c1: 35, row: 5 },
    { c0: 37, c1: 39, row: 7 },
  ];
  islands1.forEach((isl) => {
    for (let c = isl.c0; c <= isl.c1; c++) setTile(isl.row, c, TILE.ISLAND);
    entities.coins.push({ col: (isl.c0 + isl.c1) / 2, row: isl.row - 1 });
  });
  entities.mushrooms.push({ col: 28, row: islands1[1].row - 1 });
  entities.fruits.push({ col: 34, row: islands1[3].row - 1, type: 'apple' });
  entities.flyers.push({ minCol: 22, maxCol: 40, row: 10, amp: 2.4, speed: 58 });

  // ---- Zone 2: cave/mine tunnel 1 (cols 46-64) --------------------------
  const cave1FloorRow = 16, cave1AirRows = [14, 15];
  const cave1C0 = 46, cave1C1 = 64;
  for (let c = cave1C0; c <= cave1C1; c++) {
    cave1AirRows.forEach((r) => setTile(r, c, TILE.EMPTY));
    setTile(cave1FloorRow, c, TILE.CAVE);
    if (surfaceRow[c] > 11) setTile(11, c, TILE.CAVE);
  }
  for (let r = cave1AirRows[0]; r <= cave1FloorRow; r++) {
    setTile(r, cave1C0, TILE.CAVE);
    setTile(r, cave1C1, TILE.CAVE);
  }
  const cave1ShaftDown = 48, cave1ShaftDownWide = 49;
  const cave1ShaftUp = 62, cave1ShaftUpWide = 63;
  for (let r = surfaceRow[cave1ShaftDown]; r <= cave1FloorRow - 1; r++) {
    setTile(r, cave1ShaftDown, TILE.LADDER);
    setTile(r, cave1ShaftDownWide, TILE.EMPTY);
  }
  for (let r = surfaceRow[cave1ShaftUp]; r <= cave1FloorRow - 1; r++) {
    setTile(r, cave1ShaftUp, TILE.LADDER);
    setTile(r, cave1ShaftUpWide, TILE.EMPTY);
  }
  for (let c = cave1C0 + 2; c <= cave1C1 - 2; c += 2) {
    entities.coins.push({ col: c, row: cave1FloorRow - 1 });
  }
  entities.mushrooms.push({ col: 55, row: cave1FloorRow - 1 });
  entities.fruits.push({ col: 51, row: cave1FloorRow - 1, type: 'banana' });
  entities.crawlers.push({ minCol: cave1C0 + 2, maxCol: 57, row: cave1FloorRow - 1 });

  // ---- Zone 3: spike climb 1 (cols 68-80) -------------------------------
  entities.crawlers.push({ minCol: 65, maxCol: 68, row: surfaceRow[66] - 1 });
  [71, 74, 77, 79].forEach((c) => entities.spikes.push({ col: c, row: surfaceRow[c] - 1 }));
  for (let c = 69; c <= 79; c += 3) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });

  // ---- Zone 4: floating island cluster 2 + standalone spire (85-108) ---
  const islands2 = [
    { c0: 87, c1: 89, row: 8 },
    { c0: 92, c1: 93, row: 6 },
    { c0: 99, c1: 100, row: 5 },
    { c0: 103, c1: 105, row: 7 },
    { c0: 107, c1: 108, row: 9 },
  ];
  islands2.forEach((isl) => {
    for (let c = isl.c0; c <= isl.c1; c++) setTile(isl.row, c, TILE.ISLAND);
    entities.coins.push({ col: (isl.c0 + isl.c1) / 2, row: isl.row - 1 });
  });
  const spireCol = 96, spireTopRow = 4;
  for (let r = spireTopRow; r <= 9; r++) setTile(r, spireCol, TILE.CAVE);
  entities.fruits.push({ col: spireCol, row: spireTopRow - 1, type: 'cherry' });
  entities.flyers.push({ minCol: 85, maxCol: 108, row: 11, amp: 2, speed: 62 });
  entities.mushrooms.push({ col: 104, row: islands2[3].row - 1 });

  // ---- Zone 5: spike descent 2 (cols 110-118) ---------------------------
  [111, 114, 117].forEach((c) => entities.spikes.push({ col: c, row: surfaceRow[c] - 1 }));
  for (let c = 110; c <= 118; c += 2) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });

  // ---- Zone 6: cave/mine tunnel 2 (cols 120-134) ------------------------
  const cave2FloorRow = 16, cave2AirRows = [14, 15];
  const cave2C0 = 120, cave2C1 = 134;
  for (let c = cave2C0; c <= cave2C1; c++) {
    cave2AirRows.forEach((r) => setTile(r, c, TILE.EMPTY));
    setTile(cave2FloorRow, c, TILE.CAVE);
    if (surfaceRow[c] > 11) setTile(11, c, TILE.CAVE);
  }
  for (let r = cave2AirRows[0]; r <= cave2FloorRow; r++) {
    setTile(r, cave2C0, TILE.CAVE);
    setTile(r, cave2C1, TILE.CAVE);
  }
  const cave2ShaftDown = 122, cave2ShaftDownWide = 123;
  const cave2ShaftUp = 132, cave2ShaftUpWide = 133;
  for (let r = surfaceRow[cave2ShaftDown]; r <= cave2FloorRow - 1; r++) {
    setTile(r, cave2ShaftDown, TILE.LADDER);
    setTile(r, cave2ShaftDownWide, TILE.EMPTY);
  }
  for (let r = surfaceRow[cave2ShaftUp]; r <= cave2FloorRow - 1; r++) {
    setTile(r, cave2ShaftUp, TILE.LADDER);
    setTile(r, cave2ShaftUpWide, TILE.EMPTY);
  }
  // a couple of low step platforms jutting from the floor for variety
  setTile(cave2FloorRow - 1, 125, TILE.CAVE);
  setTile(cave2FloorRow - 1, 130, TILE.CAVE);
  for (let c = cave2C0 + 2; c <= cave2C1 - 2; c += 2) {
    entities.coins.push({ col: c, row: cave2FloorRow - 1 });
  }
  entities.mushrooms.push({ col: 125, row: cave2FloorRow - 2 });
  entities.fruits.push({ col: 130, row: cave2FloorRow - 2, type: 'cherry' });
  entities.crawlers.push({ minCol: cave2C0 + 2, maxCol: 126, row: cave2FloorRow - 1 });
  entities.crawlers.push({ minCol: 128, maxCol: cave2C1 - 2, row: cave2FloorRow - 1 });

  // ---- Zone 7: forest final stretch + flag (cols 136-149) ---------------
  [137, 139, 141, 143, 145].forEach((c, i) => {
    entities.trees.push({ col: c, row: surfaceRow[c] - 1, scale: i % 2 === 0 ? 1.1 : 0.85 });
  });
  entities.crawlers.push({ minCol: 136, maxCol: 141, row: surfaceRow[138] - 1 });
  entities.flyers.push({ minCol: 141, maxCol: 146, row: surfaceRow[143] - 3, amp: 1.4, speed: 60 });
  entities.mushrooms.push({ col: 140, row: surfaceRow[140] - 1 });
  entities.fruits.push({ col: 138, row: surfaceRow[138] - 2, type: 'apple' });
  entities.fruits.push({ col: 144, row: surfaceRow[144] - 2, type: 'banana' });
  for (let c = 136; c <= 146; c += 2) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });

  const flagCol = 147;
  entities.flag = { col: flagCol, row: surfaceRow[flagCol] - 1 };

  entities.playerStart = { col: 1, row: surfaceRow[1] - 1 };
  entities.decorSuns.push({ col: 30, row: 1 });
  entities.decorSuns.push({ col: 120, row: 1 });

  return { cols, rows, tileSize: TILE_SIZE, grid, surfaceRow, entities, number: '1-2', title: 'Cloud Caverns' };
}

/**
 * Level 1-3 — bigger and harder than 1-2: a deeper twin-ladder well, tighter
 * island hopping, a two-level cave tunnel, a dense spike gauntlet, twin
 * standalone spires, a spike-lined valley with narrow stepping-stone
 * platforming, a long twisty second cave, and a crowded forest finale.
 */
function buildLevel1_3() {
  const cols = 190;
  const rows = 22;

  // --- surface height keyframes (col, row) -> smooth walkable hill line ---
  const keyframes = [
    [0, 13], [4, 12], [7, 13], [24, 13],
    [25, 13], [50, 13],
    [51, 13], [76, 13],
    [77, 12], [80, 10], [84, 8], [88, 6], [92, 5], [96, 6],
    [97, 8], [100, 11], [132, 11],
    [133, 12], [138, 16], [142, 12], [146, 14], [150, 12],
    [151, 12], [178, 12],
    [179, 11], [183, 10], [186, 10], [189, 10],
  ];
  const surfaceRow = interpolateHeights(keyframes, cols);

  // --- base grid: solid ground from surface down to bottom row ---
  const grid = [];
  for (let r = 0; r < rows; r++) grid.push(new Array(cols).fill(TILE.EMPTY));
  for (let c = 0; c < cols; c++) {
    for (let r = surfaceRow[c]; r < rows; r++) {
      grid[r][c] = r === surfaceRow[c] ? TILE.GRASS : TILE.DIRT;
    }
  }

  const entities = {
    coins: [], mushrooms: [], fruits: [], spikes: [], trees: [],
    crawlers: [], flyers: [], flag: null, playerStart: null, decorSuns: [],
  };

  const setTile = (r, c, v) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = v;
  };

  // ---- Zone 0: opening + a deep twin-ladder well (cols 0-24) -----------
  entities.crawlers.push({ minCol: 14, maxCol: 22, row: surfaceRow[18] - 1 });
  for (let c = 1; c <= 6; c += 2) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });
  for (let c = 12; c <= 24; c += 2) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });

  const wellC0 = 8, wellC1 = 10, wellLadderCol = 9, wellFloorRow = rows - 1;
  const wellLedgeRowA = 15, wellLedgeRowB = 18;
  for (let r = 13; r <= wellFloorRow - 1; r++) {
    setTile(r, wellC0, TILE.EMPTY);
    setTile(r, wellLadderCol, TILE.LADDER);
    setTile(r, wellC1, TILE.EMPTY);
  }
  setTile(wellFloorRow, wellC0, TILE.CAVE);
  setTile(wellFloorRow, wellLadderCol, TILE.CAVE);
  setTile(wellFloorRow, wellC1, TILE.CAVE);
  [wellLedgeRowA, wellLedgeRowB].forEach((r) => {
    setTile(r, wellC0, TILE.CAVE);
    setTile(r, wellC1, TILE.CAVE);
  });
  entities.coins.push({ col: wellC0, row: wellLedgeRowA - 1 });
  entities.coins.push({ col: wellC1, row: wellLedgeRowA - 1 });
  entities.coins.push({ col: wellC0, row: wellLedgeRowB - 1 });
  entities.fruits.push({ col: wellC1, row: wellLedgeRowB - 1, type: 'apple' });
  entities.spikes.push({ col: wellLadderCol, row: wellFloorRow - 1 });
  entities.fruits.push({ col: wellC0, row: wellFloorRow - 1, type: 'cherry' });

  // ---- Zone 1: tight floating island cluster (cols 25-50) --------------
  const islands1 = [
    { c0: 27, c1: 28, row: 9 },
    { c0: 30, c1: 31, row: 7 },
    { c0: 33, c1: 33, row: 5 },
    { c0: 36, c1: 37, row: 8 },
    { c0: 39, c1: 39, row: 6 },
    { c0: 42, c1: 43, row: 9 },
    { c0: 46, c1: 47, row: 6 },
  ];
  islands1.forEach((isl) => {
    for (let c = isl.c0; c <= isl.c1; c++) setTile(isl.row, c, TILE.ISLAND);
    entities.coins.push({ col: isl.c0, row: isl.row - 1 });
  });
  entities.mushrooms.push({ col: 33, row: islands1[2].row - 1 });
  entities.fruits.push({ col: 39, row: islands1[4].row - 1, type: 'banana' });
  entities.flyers.push({ minCol: 25, maxCol: 50, row: 12, amp: 2.6, speed: 66 });
  entities.flyers.push({ minCol: 28, maxCol: 46, row: 8, amp: 1.6, speed: 60 });

  // ---- Zone 2: two-level cave tunnel (cols 51-76) -----------------------
  const cave1FloorRow = 19, cave1AirRows = [16, 17, 18];
  const cave1C0 = 51, cave1C1 = 76;
  for (let c = cave1C0; c <= cave1C1; c++) {
    cave1AirRows.forEach((r) => setTile(r, c, TILE.EMPTY));
    setTile(cave1FloorRow, c, TILE.CAVE);
    if (surfaceRow[c] > 13) setTile(13, c, TILE.CAVE);
  }
  for (let r = cave1AirRows[0]; r <= cave1FloorRow; r++) {
    setTile(r, cave1C0, TILE.CAVE);
    setTile(r, cave1C1, TILE.CAVE);
  }
  // raised mid-tunnel ledge (a second, higher floor level) reached by a short ladder
  const cave1LedgeC0 = 61, cave1LedgeC1 = 67, cave1LedgeRow = 17;
  for (let c = cave1LedgeC0; c <= cave1LedgeC1; c++) setTile(cave1LedgeRow, c, TILE.CAVE);
  setTile(cave1FloorRow - 1, 64, TILE.LADDER); // short ladder up from the tunnel floor onto the ledge
  entities.coins.push({ col: 63, row: cave1LedgeRow - 1 });
  entities.coins.push({ col: 66, row: cave1LedgeRow - 1 });
  entities.mushrooms.push({ col: 64, row: cave1LedgeRow - 1 });

  const cave1ShaftDown = 53, cave1ShaftDownWide = 54;
  const cave1ShaftUp = 74, cave1ShaftUpWide = 75;
  for (let r = surfaceRow[cave1ShaftDown]; r <= cave1FloorRow - 1; r++) {
    setTile(r, cave1ShaftDown, TILE.LADDER);
    setTile(r, cave1ShaftDownWide, TILE.EMPTY);
  }
  for (let r = surfaceRow[cave1ShaftUp]; r <= cave1FloorRow - 1; r++) {
    setTile(r, cave1ShaftUp, TILE.LADDER);
    setTile(r, cave1ShaftUpWide, TILE.EMPTY);
  }
  for (let c = cave1C0 + 2; c <= cave1C1 - 2; c += 2) {
    if (c >= cave1LedgeC0 - 1 && c <= cave1LedgeC1 + 1) continue; // skip under the raised ledge
    entities.coins.push({ col: c, row: cave1FloorRow - 1 });
  }
  entities.fruits.push({ col: 57, row: cave1FloorRow - 1, type: 'apple' });
  entities.fruits.push({ col: 72, row: cave1FloorRow - 1, type: 'cherry' });
  entities.crawlers.push({ minCol: cave1C0 + 2, maxCol: 59, row: cave1FloorRow - 1 });
  entities.crawlers.push({ minCol: 69, maxCol: cave1C1 - 2, row: cave1FloorRow - 1 });

  // ---- Zone 3: dense spike gauntlet climb (cols 77-96) ------------------
  entities.crawlers.push({ minCol: 77, maxCol: 82, row: surfaceRow[79] - 1 });
  [79, 81, 83, 85, 87, 89, 91, 93].forEach((c) => {
    entities.spikes.push({ col: c, row: surfaceRow[c] - 1 });
  });
  for (let c = 78; c <= 95; c += 3) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });
  entities.fruits.push({ col: 92, row: surfaceRow[92] - 2, type: 'cherry' });

  // ---- Zone 4: island cluster 2 + twin spires (cols 97-132) ------------
  const islands2 = [
    { c0: 99, c1: 100, row: 9 },
    { c0: 103, c1: 104, row: 7 },
    { c0: 107, c1: 108, row: 5 },
    { c0: 121, c1: 122, row: 6 },
    { c0: 125, c1: 126, row: 8 },
    { c0: 128, c1: 130, row: 9 },
  ];
  islands2.forEach((isl) => {
    for (let c = isl.c0; c <= isl.c1; c++) setTile(isl.row, c, TILE.ISLAND);
    entities.coins.push({ col: isl.c0, row: isl.row - 1 });
  });
  const spireACol = 112, spireBCol = 118, spireTopRow = 4;
  for (let r = spireTopRow; r <= 11; r++) { setTile(r, spireACol, TILE.CAVE); setTile(r, spireBCol, TILE.CAVE); }
  setTile(spireTopRow, 114, TILE.ISLAND);
  setTile(spireTopRow, 115, TILE.ISLAND);
  entities.coins.push({ col: 114, row: spireTopRow - 1 });
  entities.fruits.push({ col: spireACol, row: spireTopRow - 1, type: 'cherry' });
  entities.fruits.push({ col: spireBCol, row: spireTopRow - 1, type: 'banana' });
  entities.flyers.push({ minCol: 97, maxCol: 132, row: 13, amp: 2.4, speed: 70 });
  entities.flyers.push({ minCol: 108, maxCol: 121, row: 9, amp: 1.4, speed: 64 });
  entities.mushrooms.push({ col: 104, row: islands2[1].row - 1 });
  entities.mushrooms.push({ col: 126, row: islands2[4].row - 1 });

  // ---- Zone 5: spike-lined valley + stepping-stone platforming (133-150) --
  [135, 136].forEach((c) => setTile(13, c, TILE.ISLAND));
  [140, 141].forEach((c) => setTile(13, c, TILE.ISLAND));
  entities.coins.push({ col: 135, row: 12 });
  entities.coins.push({ col: 140, row: 12 });
  [137, 138, 139].forEach((c) => entities.spikes.push({ col: c, row: surfaceRow[c] - 1 }));
  entities.crawlers.push({ minCol: 143, maxCol: 148, row: surfaceRow[145] - 1 });
  for (let c = 133; c <= 150; c += 3) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });

  // ---- Zone 6: long twisty cave tunnel (cols 151-178) -------------------
  const cave2FloorRow = 18, cave2AirRows = [15, 16, 17];
  const cave2C0 = 151, cave2C1 = 178;
  for (let c = cave2C0; c <= cave2C1; c++) {
    cave2AirRows.forEach((r) => setTile(r, c, TILE.EMPTY));
    setTile(cave2FloorRow, c, TILE.CAVE);
    if (surfaceRow[c] > 13) setTile(13, c, TILE.CAVE);
  }
  for (let r = cave2AirRows[0]; r <= cave2FloorRow; r++) {
    setTile(r, cave2C0, TILE.CAVE);
    setTile(r, cave2C1, TILE.CAVE);
  }
  const cave2ShaftDown = 153, cave2ShaftDownWide = 154;
  const cave2ShaftMid = 165, cave2ShaftMidWide = 166;
  const cave2ShaftUp = 176, cave2ShaftUpWide = 177;
  [[cave2ShaftDown, cave2ShaftDownWide], [cave2ShaftMid, cave2ShaftMidWide], [cave2ShaftUp, cave2ShaftUpWide]]
    .forEach(([shaftCol, wideCol]) => {
      for (let r = surfaceRow[shaftCol]; r <= cave2FloorRow - 1; r++) {
        setTile(r, shaftCol, TILE.LADDER);
        setTile(r, wideCol, TILE.EMPTY);
      }
    });
  // low step blocks jutting from the floor for jump variety
  [157, 161, 169, 173].forEach((c) => setTile(cave2FloorRow - 1, c, TILE.CAVE));
  for (let c = cave2C0 + 2; c <= cave2C1 - 2; c += 2) {
    entities.coins.push({ col: c, row: cave2FloorRow - 1 });
  }
  entities.mushrooms.push({ col: 159, row: cave2FloorRow - 2 });
  entities.mushrooms.push({ col: 171, row: cave2FloorRow - 2 });
  entities.fruits.push({ col: 163, row: cave2FloorRow - 1, type: 'apple' });
  entities.fruits.push({ col: 175, row: cave2FloorRow - 1, type: 'cherry' });
  entities.crawlers.push({ minCol: cave2C0 + 2, maxCol: 163, row: cave2FloorRow - 1 });
  entities.crawlers.push({ minCol: 163, maxCol: 172, row: cave2FloorRow - 1 });
  entities.crawlers.push({ minCol: 172, maxCol: cave2C1 - 2, row: cave2FloorRow - 1 });

  // ---- Zone 7: crowded forest finale + flag (cols 179-189) --------------
  [180, 182, 184, 186].forEach((c, i) => {
    entities.trees.push({ col: c, row: surfaceRow[c] - 1, scale: i % 2 === 0 ? 1.1 : 0.85 });
  });
  entities.crawlers.push({ minCol: 179, maxCol: 184, row: surfaceRow[181] - 1 });
  entities.flyers.push({ minCol: 179, maxCol: 188, row: surfaceRow[184] - 3, amp: 1.6, speed: 72 });
  entities.mushrooms.push({ col: 183, row: surfaceRow[183] - 1 });
  entities.fruits.push({ col: 181, row: surfaceRow[181] - 2, type: 'apple' });
  entities.fruits.push({ col: 185, row: surfaceRow[185] - 2, type: 'banana' });
  for (let c = 179; c <= 188; c += 2) entities.coins.push({ col: c, row: surfaceRow[c] - 2 });

  const flagCol = 186;
  entities.flag = { col: flagCol, row: surfaceRow[flagCol] - 1 };

  entities.playerStart = { col: 1, row: surfaceRow[1] - 1 };
  entities.decorSuns.push({ col: 35, row: 1 });
  entities.decorSuns.push({ col: 115, row: 1 });
  entities.decorSuns.push({ col: 165, row: 1 });

  return { cols, rows, tileSize: TILE_SIZE, grid, surfaceRow, entities, number: '1-3', title: 'Highlands' };
}

const LEVEL_BUILDERS = [buildLevel1_1, buildLevel1_2, buildLevel1_3];

function buildLevel(index) {
  const i = Math.max(0, Math.min(index || 0, LEVEL_BUILDERS.length - 1));
  return LEVEL_BUILDERS[i]();
}
