import type { DirectionRuleSet } from '../../types/tilemaps'

export const GRID_WIDTH = 60
export const GRID_HEIGHT = 20
export const TILE_SIZE_PX = 16
export const CHUNK_WIDTH_PX = GRID_WIDTH * TILE_SIZE_PX
export const CHUNK_HEIGHT_PX = GRID_HEIGHT * TILE_SIZE_PX
export const MAX_ACTIVE_CHUNKS = 3

export enum Tile {
  AIR = 0,
  GROUND = 1,
  DIRT = 2,
  PLATFORM = 3,
  WALL = 4,
  SPIKE = 5,
  COLUMN = 6,
  CRATE = 7,
  COIN = 8,
  BRIDGE = 9,
}

export const ALL_TILES: Tile[] = [
  Tile.AIR,
  Tile.GROUND,
  Tile.DIRT,
  Tile.PLATFORM,
  Tile.WALL,
  Tile.SPIKE,
  Tile.COLUMN,
  Tile.CRATE,
  Tile.COIN,
  Tile.BRIDGE,
]

export const RULES: Record<Tile, DirectionRuleSet> = {
  [Tile.AIR]: {
    up: [Tile.AIR, Tile.COIN],
    down: [
      Tile.AIR,
      Tile.GROUND,
      Tile.PLATFORM,
      Tile.SPIKE,
      Tile.COIN,
      Tile.CRATE,
      Tile.BRIDGE,
      Tile.COLUMN,
    ],
    left: [
      Tile.AIR,
      Tile.PLATFORM,
      Tile.WALL,
      Tile.COLUMN,
      Tile.COIN,
      Tile.CRATE,
      Tile.BRIDGE,
      Tile.SPIKE,
    ],
    right: [
      Tile.AIR,
      Tile.PLATFORM,
      Tile.WALL,
      Tile.COLUMN,
      Tile.COIN,
      Tile.CRATE,
      Tile.BRIDGE,
      Tile.SPIKE,
    ],
  },
  [Tile.GROUND]: {
    up: [Tile.AIR, Tile.COIN, Tile.CRATE, Tile.SPIKE],
    down: [Tile.DIRT, Tile.GROUND, Tile.WALL],
    left: [Tile.GROUND, Tile.DIRT, Tile.WALL, Tile.BRIDGE],
    right: [Tile.GROUND, Tile.DIRT, Tile.WALL, Tile.BRIDGE],
  },
  [Tile.DIRT]: {
    up: [Tile.GROUND, Tile.DIRT, Tile.WALL, Tile.BRIDGE],
    down: [Tile.DIRT, Tile.WALL, Tile.COLUMN],
    left: [Tile.DIRT, Tile.GROUND, Tile.WALL, Tile.COLUMN],
    right: [Tile.DIRT, Tile.GROUND, Tile.WALL, Tile.COLUMN],
  },
  [Tile.PLATFORM]: {
    up: [Tile.AIR, Tile.COIN, Tile.CRATE],
    down: [Tile.AIR, Tile.COLUMN],
    left: [Tile.AIR, Tile.PLATFORM, Tile.WALL, Tile.BRIDGE],
    right: [Tile.AIR, Tile.PLATFORM, Tile.WALL, Tile.BRIDGE],
  },
  [Tile.WALL]: {
    up: [Tile.GROUND, Tile.WALL, Tile.PLATFORM],
    down: [Tile.DIRT, Tile.WALL, Tile.COLUMN],
    left: [Tile.AIR, Tile.GROUND, Tile.DIRT, Tile.WALL, Tile.COLUMN],
    right: [Tile.AIR, Tile.GROUND, Tile.DIRT, Tile.WALL, Tile.COLUMN],
  },
  [Tile.SPIKE]: {
    up: [Tile.AIR, Tile.COIN],
    down: [Tile.GROUND, Tile.PLATFORM, Tile.BRIDGE],
    left: [Tile.AIR, Tile.SPIKE],
    right: [Tile.AIR, Tile.SPIKE],
  },
  [Tile.COLUMN]: {
    up: [Tile.AIR, Tile.PLATFORM, Tile.COLUMN, Tile.BRIDGE],
    down: [Tile.DIRT, Tile.WALL, Tile.COLUMN],
    left: [Tile.AIR, Tile.WALL, Tile.COLUMN],
    right: [Tile.AIR, Tile.WALL, Tile.COLUMN],
  },
  [Tile.CRATE]: {
    up: [Tile.AIR, Tile.COIN],
    down: [Tile.GROUND, Tile.PLATFORM, Tile.BRIDGE],
    left: [Tile.AIR, Tile.CRATE],
    right: [Tile.AIR, Tile.CRATE],
  },
  [Tile.COIN]: {
    up: [Tile.AIR, Tile.COIN],
    down: [Tile.AIR, Tile.PLATFORM, Tile.GROUND, Tile.BRIDGE],
    left: [Tile.AIR, Tile.COIN],
    right: [Tile.AIR, Tile.COIN],
  },
  [Tile.BRIDGE]: {
    up: [Tile.AIR, Tile.COIN, Tile.CRATE],
    down: [Tile.AIR, Tile.COLUMN, Tile.DIRT],
    left: [Tile.AIR, Tile.PLATFORM, Tile.BRIDGE, Tile.WALL],
    right: [Tile.AIR, Tile.PLATFORM, Tile.BRIDGE, Tile.WALL],
  },
}

export const COLLIDABLE_TILES = new Set<Tile>([
  Tile.GROUND,
  Tile.DIRT,
  Tile.PLATFORM,
  Tile.WALL,
  Tile.SPIKE,
  Tile.COLUMN,
  Tile.CRATE,
  Tile.BRIDGE,
])

export const TILE_RENDER_INDEX: Record<Tile, number> = {
  // Frame indices for the 64×1232 tileset (4 cols × 77 rows, 16×16px per tile).
  // Frame = row * 4 + col.  All values here are in rows 0–8 which are the
  // clearly coloured grass/ground tiles visible in tiles.png.
  [Tile.AIR]: -1, // empty — Phaser renders nothing for -1
  [Tile.GROUND]: 0, // row 0 col 0 — solid grass-top surface
  [Tile.DIRT]: 16, // row 4 col 0 — pure dirt fill (no grass cap)
  [Tile.PLATFORM]: 2, // row 0 col 2 — surface variant (floating ledge look)
  [Tile.WALL]: 12, // row 3 col 0 — solid vertical wall
  [Tile.SPIKE]: 32, // row 8 col 0 — distinctive geometric spike shape
  [Tile.COLUMN]: 8, // row 2 col 0 — pillar variant
  [Tile.CRATE]: 4, // row 1 col 0 — box-like tile
  [Tile.COIN]: 6, // row 1 col 2 — distinct decorative tile
  [Tile.BRIDGE]: 20, // row 5 col 0 — horizontal bridge element
}

export function getInitialOptionsForRow(row: number): Tile[] {
  if (row <= 2) {
    return [Tile.AIR, Tile.COIN]
  }

  if (row <= 7) {
    return [Tile.AIR, Tile.COIN, Tile.PLATFORM]
  }

  if (row <= 11) {
    return [Tile.AIR, Tile.PLATFORM, Tile.COIN, Tile.BRIDGE, Tile.COLUMN]
  }

  if (row <= 15) {
    return [
      Tile.AIR,
      Tile.GROUND,
      Tile.PLATFORM,
      Tile.WALL,
      Tile.SPIKE,
      Tile.CRATE,
      Tile.BRIDGE,
      Tile.COLUMN,
    ]
  }

  if (row <= 17) {
    return [Tile.AIR, Tile.GROUND, Tile.DIRT, Tile.WALL, Tile.SPIKE, Tile.CRATE]
  }

  if (row === 18) {
    return [Tile.GROUND, Tile.DIRT, Tile.WALL, Tile.COLUMN]
  }

  return [Tile.DIRT, Tile.WALL, Tile.COLUMN]
}
