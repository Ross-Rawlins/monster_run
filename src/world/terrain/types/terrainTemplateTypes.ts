export type TerrainArchetype =
  | 'flat'
  | 'step-up'
  | 'step-down'
  | 'gap'
  | 'recovery'
  | 'floating-chain'

export type TerrainBiome = 'graveyard'

export interface TerrainTemplatePlatformLayout {
  localTileX: number
  topRow: number
  widthTiles: number
  role: 'main' | 'floating'
  bodyDepthTiles?: number
}

export interface TerrainChunkTemplate {
  id: string
  biome: TerrainBiome
  archetype: TerrainArchetype
  weight: number
  minChunk: number
  widthRange?: readonly [number, number]
  gapRange?: readonly [number, number]
  rowDeltaRange?: readonly [number, number]
  floatingPlatformChance?: number
  floatingWidthRange?: readonly [number, number]
  floatingHeightRange?: readonly [number, number]
  explicitPlatforms?: readonly TerrainTemplatePlatformLayout[]
  explicitExitRow?: number
}
