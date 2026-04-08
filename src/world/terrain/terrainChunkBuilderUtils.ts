import type { TerrainDifficultyParams } from './types/terrainDifficultyTypes'
import type {
  TerrainGeneratorConfig,
  TerrainPlatformSpec,
} from './types/terrainGeneratorTypes'
import type {
  TerrainChunkTemplate,
  TerrainTemplatePlatformLayout,
} from './types/terrainTemplateTypes'
import type { TerrainRandom } from './terrainRandom'

export function resolveMainWidth(
  template: TerrainChunkTemplate,
  widthPenaltyTiles: number,
  config: TerrainGeneratorConfig,
  random: TerrainRandom
): number {
  const rolledWidth = random.randomInRange(template.widthRange, [10, 14])

  return Math.max(
    5,
    Math.min(config.chunkWidthTiles, rolledWidth - widthPenaltyTiles)
  )
}

export function resolveEntryGap(
  template: TerrainChunkTemplate,
  gapTilesBonus: number,
  random: TerrainRandom
): number {
  const baseGap = random.randomInRange(template.gapRange, [0, 2])

  if (template.archetype === 'gap' || template.archetype === 'floating-chain') {
    return baseGap + gapTilesBonus
  }

  if (template.archetype === 'step-down') {
    return baseGap + Math.min(1, gapTilesBonus)
  }

  return baseGap
}

export function resolveNextRow(
  previousRow: number,
  template: TerrainChunkTemplate,
  difficulty: TerrainDifficultyParams,
  config: TerrainGeneratorConfig,
  random: TerrainRandom
): number {
  switch (template.archetype) {
    case 'step-up': {
      return (
        previousRow -
        resolveStepDistance(
          random,
          template.rowDeltaRange,
          Math.min(
            config.maxUpStepTiles + difficulty.verticalStepBonus,
            previousRow - config.minSurfaceRow
          )
        )
      )
    }

    case 'step-down': {
      return (
        previousRow +
        resolveStepDistance(
          random,
          template.rowDeltaRange,
          Math.min(
            config.maxDownStepTiles + difficulty.verticalStepBonus,
            config.maxSurfaceRow - previousRow
          )
        )
      )
    }

    case 'recovery': {
      const direction = Math.sign(config.baselineSurfaceRow - previousRow)

      if (direction === 0) {
        return previousRow
      }

      const rolledStep = random.randomInRange(template.rowDeltaRange, [1, 2])
      const step = Math.max(1, rolledStep + difficulty.recoveryStepTiles - 1)

      return clampTerrainRow(previousRow + direction * step, config)
    }

    case 'flat':
    case 'gap':
    case 'floating-chain':
    default: {
      const rowDelta = random.randomInRange(template.rowDeltaRange, [0, 0])
      return clampTerrainRow(previousRow + rowDelta, config)
    }
  }
}

export function createFloatingPlatform(
  template: TerrainChunkTemplate,
  widthTiles: number,
  localTileX: number,
  nextRow: number,
  maxStartOffset: number,
  difficulty: TerrainDifficultyParams,
  config: TerrainGeneratorConfig,
  random: TerrainRandom
): TerrainPlatformSpec | null {
  const floatingChance =
    (template.floatingPlatformChance ?? 0) +
    difficulty.floatingPlatformChanceBonus

  if (
    (template.archetype !== 'floating-chain' &&
      random.nextFloat() >= floatingChance) ||
    widthTiles < 6
  ) {
    return null
  }

  const floatingWidth = random.randomInRange(
    template.floatingWidthRange,
    [2, 3]
  )
  const floatingOffset = random.randomInRange(
    template.floatingHeightRange,
    [2, 3]
  )
  const floatingRow = clampTerrainRow(nextRow - floatingOffset, config)
  const floatingStartMin = Math.min(maxStartOffset, Math.max(0, localTileX + 1))
  const floatingStartMax = Math.max(
    floatingStartMin,
    Math.min(
      config.chunkWidthTiles - floatingWidth,
      localTileX + widthTiles - floatingWidth
    )
  )

  return {
    localTileX: random.randomInt(floatingStartMin, floatingStartMax),
    topRow: floatingRow,
    widthTiles: Math.min(floatingWidth, config.chunkWidthTiles),
    bodyDepthTiles: 2,
    role: 'floating',
  }
}

export function toPlatformSpec(
  platform: TerrainTemplatePlatformLayout,
  config: TerrainGeneratorConfig
): TerrainPlatformSpec {
  const topRow = clampTerrainRow(platform.topRow, config)

  return {
    localTileX: platform.localTileX,
    topRow,
    widthTiles: platform.widthTiles,
    bodyDepthTiles:
      platform.bodyDepthTiles ??
      (platform.role === 'floating' ? 2 : getBodyDepthTiles(topRow, config)),
    role: platform.role,
  }
}

export function clampTerrainRow(
  row: number,
  config: TerrainGeneratorConfig
): number {
  return Math.max(config.minSurfaceRow, Math.min(config.maxSurfaceRow, row))
}

export function getBodyDepthTiles(
  topRow: number,
  config: TerrainGeneratorConfig
): number {
  return Math.max(2, config.playfieldBottomRow - topRow)
}

function resolveStepDistance(
  random: TerrainRandom,
  rowDeltaRange: readonly [number, number] | undefined,
  maxAllowedStep: number
): number {
  const rolledStep = random.randomInRange(rowDeltaRange, [1, 2])

  return Math.max(1, Math.min(rolledStep, Math.max(1, maxAllowedStep)))
}
