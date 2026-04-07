import { TerrainBiome } from './terrainChunkTemplates'
import {
  TerrainBiomeFrameMap,
  TerrainNeighbourContext,
  TerrainSolidGrid,
  TerrainTileRule,
} from './types/terrainTileRuleTypes'

export type {
  TerrainBiomeFrameMap,
  TerrainNeighbourContext,
  TerrainSolidGrid,
  TerrainTileRule,
} from './types/terrainTileRuleTypes'

const TERRAIN_BIOME_FRAMES: Record<TerrainBiome, TerrainBiomeFrameMap> = {
  graveyard: {
    surfaceSingle: ['Tiles_Ground_Seperated_21.png'],
    surfaceLeft: [
      'Tiles_Ground_Seperated_17.png',
      'Tiles_Ground_Seperated_21.png',
    ],
    surfaceMid: [
      'Tiles_Ground_Seperated_18.png',
      'Tiles_Ground_Seperated_19.png',
      'Tiles_Ground_Seperated_22.png',
      'Tiles_Ground_Seperated_23.png',
    ],
    surfaceRight: [
      'Tiles_Ground_Seperated_20.png',
      'Tiles_Ground_Seperated_24.png',
    ],
    wallLeft: [
      'Tiles_Ground_Seperated_25.png',
      'Tiles_Ground_Seperated_29.png',
    ],
    wallRight: [
      'Tiles_Ground_Seperated_28.png',
      'Tiles_Ground_Seperated_32.png',
    ],
    fill: [
      'Tiles_Ground_Seperated_29.png',
      'Tiles_Ground_Seperated_30.png',
      'Tiles_Ground_Seperated_31.png',
      'Tiles_Ground_Seperated_32.png',
      'Tiles_Ground_Seperated_33.png',
      'Tiles_Ground_Seperated_34.png',
      'Tiles_Ground_Seperated_35.png',
      'Tiles_Ground_Seperated_36.png',
    ],
    undersideLeft: [
      'Tiles_Ground_Seperated_74.png',
      'Tiles_Ground_Seperated_77.png',
    ],
    undersideMid: [
      'Tiles_Ground_Seperated_79.png',
      'Tiles_Ground_Seperated_80.png',
    ],
    undersideRight: [
      'Tiles_Ground_Seperated_81.png',
      'Tiles_Ground_Seperated_78.png',
    ],
  },
}

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
