import { TERRAIN_BIOME_FRAMES } from './terrainBiomeFrames'
import type {
  TerrainNeighbourContext,
  TerrainSolidGrid,
  TerrainTileRule,
} from './types/terrainTileRuleTypes'
import type { TerrainBiome } from './types/terrainTemplateTypes'

export type {
  TerrainBiomeFrameMap,
  TerrainNeighbourContext,
  TerrainSolidGrid,
  TerrainTileRule,
} from './types/terrainTileRuleTypes'

const TERRAIN_TILE_RULES: readonly TerrainTileRule[] = [
  {
    name: 'surface_single',
    condition: ({ self, above, left, right }) =>
      self && !above && !left && !right,
    selectFrames: (frames) => frames.surfaceSingle,
  },
  {
    name: 'surface_left',
    condition: ({ self, above, left }) => self && !above && !left,
    selectFrames: (frames) => frames.surfaceLeft,
  },
  {
    name: 'surface_right',
    condition: ({ self, above, right }) => self && !above && !right,
    selectFrames: (frames) => frames.surfaceRight,
  },
  {
    name: 'surface_mid',
    condition: ({ self, above }) => self && !above,
    selectFrames: (frames) => frames.surfaceMid,
  },
  {
    name: 'underside_left',
    condition: ({ self, above, below, left }) =>
      self && above && !below && !left,
    selectFrames: (frames) => frames.undersideLeft,
  },
  {
    name: 'underside_right',
    condition: ({ self, above, below, right }) =>
      self && above && !below && !right,
    selectFrames: (frames) => frames.undersideRight,
  },
  {
    name: 'underside_mid',
    condition: ({ self, above, below }) => self && above && !below,
    selectFrames: (frames) => frames.undersideMid,
  },
  {
    name: 'wall_left',
    condition: ({ self, left }) => self && !left,
    selectFrames: (frames) => frames.wallLeft,
  },
  {
    name: 'wall_right',
    condition: ({ self, right }) => self && !right,
    selectFrames: (frames) => frames.wallRight,
  },
  {
    name: 'fill',
    condition: ({ self }) => self,
    selectFrames: (frames) => frames.fill,
  },
] as const

export function resolveTerrainFrame(
  grid: TerrainSolidGrid,
  col: number,
  row: number,
  biome: TerrainBiome,
  variantSeed: number
): string {
  const context: TerrainNeighbourContext = {
    self: hasSolidTile(grid, col, row),
    above: hasSolidTile(grid, col, row - 1),
    below: hasSolidTile(grid, col, row + 1),
    left: hasSolidTile(grid, col - 1, row),
    right: hasSolidTile(grid, col + 1, row),
    variantSeed,
    biome,
  }

  const biomeFrames = TERRAIN_BIOME_FRAMES[biome]

  for (const rule of TERRAIN_TILE_RULES) {
    if (rule.condition(context)) {
      const frames = rule.selectFrames(biomeFrames)
      return frames[Math.abs(context.variantSeed) % frames.length]
    }
  }

  return biomeFrames.fill[0]
}

function hasSolidTile(
  grid: TerrainSolidGrid,
  col: number,
  row: number
): boolean {
  return grid[row]?.[col] === true
}
