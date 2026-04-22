export interface ObjectTileSizeGrouping {
  atlasSize: string
  minIndex: number
  maxIndex: number
}

export interface ObjectFootprint {
  width: number
  height: number
}

export const OBJECT_BASE_TILE_SIZE_PX = 16

// Atlas groupings present in public/assets/objects.json.
export const OBJECT_TILE_SIZE_GROUPINGS: ReadonlyArray<ObjectTileSizeGrouping> =
  [
    { atlasSize: '16x16', minIndex: 1, maxIndex: 50 },
    { atlasSize: '32x32', minIndex: 1, maxIndex: 32 },
    { atlasSize: '48x48', minIndex: 1, maxIndex: 24 },
    { atlasSize: '48x64', minIndex: 1, maxIndex: 8 },
    { atlasSize: '64x96', minIndex: 1, maxIndex: 3 },
  ] as const

// Lower depth is farther back. Depths are named by tile-size grouping.
export const OBJECT_RENDER_DEPTH_BY_TILE_SIZE = {
  // 48x64 objects sit just above terrain (depth 1) but behind all other object sizes.
  size48x64Background: 1.05,
  size16x16: 1.2,
  size32x32: 1.35,
  size64x96: 1.5,
  size48x48: 1.6,
  underPlatform: 0.5,
  defaultForeground: 4,
} as const

export function resolveObjectFootprintFromAtlasSize(
  atlasSize: string,
  baseTileSizePx = OBJECT_BASE_TILE_SIZE_PX
): ObjectFootprint {
  const match = /^(\d+)x(\d+)$/.exec(atlasSize)
  if (!match) {
    return { width: 1, height: 1 }
  }

  const widthPx = Number.parseInt(match[1], 10)
  const heightPx = Number.parseInt(match[2], 10)
  if (widthPx <= 0 || heightPx <= 0 || baseTileSizePx <= 0) {
    return { width: 1, height: 1 }
  }

  return {
    width: Math.max(1, Math.round(widthPx / baseTileSizePx)),
    height: Math.max(1, Math.round(heightPx / baseTileSizePx)),
  }
}

export const ROCK_LAYER_32X32_CONFIG = {
  atlasSize: '32x32',
  indexRange: { min: 1, max: 32 },
  footprint: resolveObjectFootprintFromAtlasSize('32x32'),
  renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size32x32,
  renderYOffsetPx: 2,
  requireInteriorSupportSurface: true,
  minSpacingTiles: {
    horizontal: 1,
    vertical: 1,
  },
  // Frequency tuning for the 32x32 rock layer.
  chance: {
    groundTop: 0.72,
    platformTop: 0.68,
  },
  // Gap tuning: lower numbers produce denser placement.
  randomGaps: {
    groundTop: { baseChance: 0.14, adjacentChance: 0.24 },
    platformTop: { baseChance: 0.16, adjacentChance: 0.26 },
  },
} as const

export const ROCK_LAYER_48X48_CONFIG = {
  atlasSize: '48x48',
  indexRange: { min: 1, max: 24 },
  footprint: resolveObjectFootprintFromAtlasSize('48x48'),
  renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size48x48,
  renderYOffsetPx: 1,
  requireInteriorSupportSurface: true,
  minSpacingTiles: {
    horizontal: 1,
    vertical: 1,
  },
  blockedAdjacentAtlasSizes: ['32x32'],
  chance: {
    groundTop: 0.86,
    platformTop: 0.8,
  },
  randomGaps: {
    groundTop: { baseChance: 0.1, adjacentChance: 0.18 },
    platformTop: { baseChance: 0.12, adjacentChance: 0.2 },
  },
} as const
