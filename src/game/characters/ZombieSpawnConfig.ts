import { createSurfaceSpawnConfig } from './definitions/CharacterSpawnDefinition'

/**
 * Configuration for zombie character spawning in the game world.
 *
 * Zombies spawn on ground-top and platform-top surfaces starting from
 * a minimum chunk index. Each eligible surface cell rolls independently
 * against spawnChancePerCell, capped by maxPerChunk.
 */
export const ZOMBIE_SPAWN_CONFIG = createSurfaceSpawnConfig({
  /**
   * Earliest chunk index at which zombies can spawn.
   * The first few chunks are safe — enemies appear once the player has scrolled
   * far enough into the world.
   */
  minSpawnChunkIndex: 0,

  /**
   * Per-cell probability that an eligible surface tile produces a zombie.
   * Raised for visibility testing; lower to 0.11 once spawn is confirmed.
   */
  spawnChancePerCell: 1,

  /** Hard cap on zombies placed in a single chunk. */
  maxPerChunk: 2,

  /**
   * Minimum horizontal distance (in tiles) between two zombie spawn points
   * in the same chunk.
   */
  minHorizontalSpacingTiles: 6,

  /**
   * Minimum platform width in tiles for a zombie to be placed on it.
   * Prevents spawns on very narrow ledges where patrol would be trivial.
   */
  minSurfaceWidthTiles: 3,
  surfaces: ['ground_top'],
})
