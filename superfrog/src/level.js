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

function buildLevel() {
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
    coins: [], mushrooms: [], spikes: [], trees: [],
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

  // ---- Zone 4: steep hill climb with spikes (cols 47-60) --------------
  [53, 55, 57].forEach((c) => {
    entities.spikes.push({ col: c, row: surfaceRow[c] - 1 });
  });
  for (let c = 48; c <= 60; c += 3) {
    entities.coins.push({ col: c, row: surfaceRow[c] - 2 });
  }

  // ---- Zone 5: forest cluster (cols 61-75) -----------------------------
  [64, 67, 70, 73].forEach((c, i) => {
    entities.trees.push({ col: c, row: surfaceRow[c] - 1, scale: i % 2 === 0 ? 1.1 : 0.85 });
  });
  entities.crawlers.push({ minCol: 62, maxCol: 68, row: surfaceRow[65] - 1 });
  entities.mushrooms.push({ col: 71, row: surfaceRow[71] - 1 });

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

  const flagCol = 96;
  entities.flag = { col: flagCol, row: surfaceRow[flagCol] - 1 };

  entities.playerStart = { col: 1, row: surfaceRow[1] - 1 };
  entities.decorSuns.push({ col: 20, row: 1 });

  return { cols, rows, tileSize: TILE_SIZE, grid, surfaceRow, entities };
}
