import { createSurfaceSpawnConfig } from './definitions/CharacterSpawnDefinition'

/**
 * Configuration for skeleton character spawning in the game world.
 *
 * Skeletons spawn at the right edge of each new chunk — off-screen to the
 * right of the current camera view — so they are already present and walking
 * left when the player scrolls into that area.
 */
export const SKELETON_SPAWN_CONFIG = createSurfaceSpawnConfig({
  /** Debug mode: allow immediate visibility from the first chunk. */
  minSpawnChunkIndex: 0,

  /** One skeleton per eligible right-edge ground cell. */
  spawnChancePerCell: 1,

  /** Maximum skeletons introduced per chunk. */
  maxPerChunk: 1,

  minHorizontalSpacingTiles: 4,

  /** Right-edge ground must be at least 2 tiles wide. */
  minSurfaceWidthTiles: 2,

  surfaces: ['ground_top'],
})
