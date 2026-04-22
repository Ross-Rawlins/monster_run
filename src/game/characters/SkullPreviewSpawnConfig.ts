import { createSurfaceSpawnConfig } from './definitions/CharacterSpawnDefinition'

/**
 * Single-area spawn config used to preview skull animations on the runner map.
 */
export const SKULL_PREVIEW_SPAWN_CONFIG = createSurfaceSpawnConfig({
  minSpawnChunkIndex: 0,
  spawnChancePerCell: 1,
  maxPerChunk: 1,
  minHorizontalSpacingTiles: 99,
  minSurfaceWidthTiles: 2,
  surfaces: ['ground_top'],
})
