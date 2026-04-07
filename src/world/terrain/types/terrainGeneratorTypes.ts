import { TerrainArchetype, TerrainBiome } from './terrainTemplateTypes'

export interface TerrainPlatformSpec {
  localTileX: number
  topRow: number
  widthTiles: number
  bodyDepthTiles: number
  role: 'main' | 'floating'
}

export interface TerrainChunkSpec {
  chunkIndex: number
  startTileX: number
  templateId: string
  biome: TerrainBiome
  archetype: TerrainArchetype
  entryRow: number
  exitRow: number
  platforms: TerrainPlatformSpec[]
}

export interface TerrainGeneratorConfig {
  chunkWidthTiles: number
  minSurfaceRow: number
  maxSurfaceRow: number
  baselineSurfaceRow: number
  playfieldBottomRow: number
  maxUpStepTiles: number
  maxDownStepTiles: number
  maxGapTiles: number
}
