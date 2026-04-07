import { TerrainBiome } from './terrainTemplateTypes'

export type TerrainSolidGrid = boolean[][]

export interface TerrainNeighbourContext {
  self: boolean
  above: boolean
  below: boolean
  left: boolean
  right: boolean
  variantSeed: number
  biome: TerrainBiome
}

export interface TerrainBiomeFrameMap {
  surfaceSingle: string[]
  surfaceLeft: string[]
  surfaceMid: string[]
  surfaceRight: string[]
  wallLeft: string[]
  wallRight: string[]
  fill: string[]
  undersideLeft: string[]
  undersideMid: string[]
  undersideRight: string[]
}

export interface TerrainTileRule {
  name: string
  condition: (context: TerrainNeighbourContext) => boolean
  selectFrames: (frames: TerrainBiomeFrameMap) => string[]
}
