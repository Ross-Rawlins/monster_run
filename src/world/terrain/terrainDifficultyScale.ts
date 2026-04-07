import { TerrainDifficultyParams } from './types/terrainDifficultyTypes'

export type { TerrainDifficultyParams } from './types/terrainDifficultyTypes'

export function getTerrainDifficultyParams(
  chunkIndex: number
): TerrainDifficultyParams {
  const t = Math.min(Math.max(chunkIndex, 0) / 30, 1)

  return {
    gapTilesBonus: Math.round(t * 2),
    widthPenaltyTiles: Math.round(t * 2),
    floatingPlatformChanceBonus: t * 0.18,
    verticalStepBonus: Math.round(t * 2),
    recoveryStepTiles: 1 + Math.round(t),
  }
}
