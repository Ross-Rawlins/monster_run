/**
 * Difficulty scaling for the infinite runner.
 *
 * Pass the running chunk index into `getDifficultyParams()` to receive
 * a set of tunable parameters that ramp up gradually.  The ramp is linear
 * from chunk 0 to `RAMP_OVER_CHUNKS`, then clamped.
 *
 * Hook these values into the template picker or ChunkBuilder to apply them:
 *   – `scrollSpeedMultiplier` → multiply against base scroll speeds in
 *     InfiniteRunnerScene.movementConfig.
 *   – `minGapTiles` / `maxGapTiles` → override template gap widths when
 *     procedurally generating gaps (future feature).
 *   – `platformCount` → target number of platforms per chunk.
 *   – `enemyDensity` → probability an eligible tile spawns an enemy.
 */

import type { DifficultyParams } from './types'

/** The chunk index at which the difficulty curve fully peaks. */
const RAMP_OVER_CHUNKS = 30

/**
 * Returns difficulty parameters scaled linearly from chunk 0 to
 * {@link RAMP_OVER_CHUNKS}.
 */
export function getDifficultyParams(chunkIndex: number): DifficultyParams {
  const t = Math.min(chunkIndex / RAMP_OVER_CHUNKS, 1)

  return {
    minGapTiles: Math.round(2 + t * 3),         // 2 → 5 tiles
    maxGapTiles: Math.round(4 + t * 4),          // 4 → 8 tiles
    enemyDensity: 0.05 + t * 0.3,               // 5% → 35%
    platformCount: Math.round(3 - t * 1.5),     // 3 → 1 platforms
    scrollSpeedMultiplier: 1 + t * 0.5,         // 1× → 1.5×
  }
}
