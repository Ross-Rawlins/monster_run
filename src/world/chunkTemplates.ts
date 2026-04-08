/**
 * Chunk templates for the graveyard infinite runner.
 *
 * Each template describes the layout of one chunk section — gaps,
 * platforms, and decorations.  The ChunkBuilder reads these to place tiles.
 *
 * ── Adding a new template ────────────────────────────────────────────────
 *   1. Add an entry to CHUNK_TEMPLATES.
 *   2. Set `weight` (higher = more frequent) and `minChunk` (gates it behind
 *      a minimum distance so early chunks stay easy).
 *   3. Describe `gaps` and `platforms` in tile units.
 *      The chunk grid is CHUNK_WIDTH_TILES (20) tiles wide.
 *   4. List `decorations` with atlas frame names from objects.json.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { ChunkTemplate } from './types'
import { pickWeighted } from './utils/weightedSelection'

export const CHUNK_TEMPLATES: readonly ChunkTemplate[] = [
  // ── flat_open ──────────────────────────────────────────────────────────
  // Gentle opening section — full ground, no gaps, minimal decoration.
  {
    id: 'flat_open',
    weight: 35,
    minChunk: 0,
    biome: 'graveyard',
    gaps: [],
    platforms: [],
    decorations: [
      { tileCol: 4, frame: 'Objects_32x32_01.png', depth: 15 },
      { tileCol: 14, frame: 'Objects_32x32_01.png', depth: 15 },
    ],
  },

  // ── flat_decorated ─────────────────────────────────────────────────────
  // Flat ground with extra graveyard props.
  {
    id: 'flat_decorated',
    weight: 20,
    minChunk: 0,
    biome: 'graveyard',
    gaps: [],
    platforms: [],
    decorations: [
      { tileCol: 2, frame: 'Objects_32x32_01.png', depth: 15 },
      { tileCol: 8, frame: 'Objects_48x48_01.png', depth: 15 },
      { tileCol: 16, frame: 'Objects_32x32_01.png', depth: 15 },
    ],
  },

  // ── platform_run ───────────────────────────────────────────────────────
  // One elevated platform — introduces platform jumping.
  {
    id: 'platform_run',
    weight: 25,
    minChunk: 2,
    biome: 'graveyard',
    gaps: [],
    platforms: [
      { startTile: 6, widthTiles: 5, tilesAboveGround: 3 },
    ],
    decorations: [
      { tileCol: 3, frame: 'Objects_32x32_01.png', depth: 15 },
    ],
  },

  // ── gap_run ────────────────────────────────────────────────────────────
  // Ground with a single gap — first introduction of pit avoidance.
  {
    id: 'gap_run',
    weight: 15,
    minChunk: 4,
    biome: 'graveyard',
    gaps: [
      { startTile: 7, widthTiles: 3 },
    ],
    platforms: [],
    decorations: [],
  },

  // ── gap_platform ───────────────────────────────────────────────────────
  // Gap AND a platform — player can use the platform to bridge the gap.
  {
    id: 'gap_platform',
    weight: 10,
    minChunk: 6,
    biome: 'graveyard',
    gaps: [
      { startTile: 8, widthTiles: 4 },
    ],
    platforms: [
      { startTile: 9, widthTiles: 3, tilesAboveGround: 3 },
    ],
    decorations: [],
  },

  // ── twin_gap ───────────────────────────────────────────────────────────
  // Two gaps — forces quick decisions.
  {
    id: 'twin_gap',
    weight: 8,
    minChunk: 8,
    biome: 'graveyard',
    gaps: [
      { startTile: 4, widthTiles: 3 },
      { startTile: 12, widthTiles: 3 },
    ],
    platforms: [],
    decorations: [],
  },

  // ── twin_platform ──────────────────────────────────────────────────────
  // Two platforms at different heights — vertical navigation challenge.
  {
    id: 'twin_platform',
    weight: 8,
    minChunk: 5,
    biome: 'graveyard',
    gaps: [],
    platforms: [
      { startTile: 2, widthTiles: 4, tilesAboveGround: 2 },
      { startTile: 12, widthTiles: 4, tilesAboveGround: 4 },
    ],
    decorations: [
      { tileCol: 17, frame: 'Objects_48x48_01.png', depth: 15 },
    ],
  },
]

// ── Weighted random picker ────────────────────────────────────────────────

/**
 * Picks a random ChunkTemplate using weighted probability.
 * Templates with a `minChunk` greater than `chunksGenerated` are excluded.
 *
 * @param chunksGenerated  How many chunks have been spawned so far.
 */
export function pickTemplate(chunksGenerated: number): ChunkTemplate {
  const eligible = CHUNK_TEMPLATES.filter(
    (t) => chunksGenerated >= t.minChunk
  )

  return pickWeighted(eligible, (template) => template.weight)
}
