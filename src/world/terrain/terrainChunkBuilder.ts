import { getTerrainDifficultyParams } from './terrainDifficultyScale'
import {
  OPENING_TERRAIN_CHUNK_TEMPLATES,
  TerrainChunkTemplate,
  TerrainTemplatePlatformLayout,
} from './terrainChunkTemplates'
import {
  TerrainChunkSpec,
  TerrainGeneratorConfig,
  TerrainPlatformSpec,
} from './terrainGeneratorTypes'
import { TerrainRandom } from './terrainRandom'

export function createOpeningChunk(
  chunkIndex: number,
  config: TerrainGeneratorConfig
): TerrainChunkSpec {
  const template = OPENING_TERRAIN_CHUNK_TEMPLATES[chunkIndex]
  const entryRow =
    chunkIndex === 0
      ? config.baselineSurfaceRow
      : (OPENING_TERRAIN_CHUNK_TEMPLATES[chunkIndex - 1].explicitExitRow ??
        config.baselineSurfaceRow)

  return {
    chunkIndex,
    startTileX: chunkIndex * config.chunkWidthTiles,
    templateId: template.id,
    biome: template.biome,
    archetype: template.archetype,
    entryRow,
    exitRow: template.explicitExitRow ?? entryRow,
    platforms: (template.explicitPlatforms ?? []).map((platform) =>
      toPlatformSpec(platform, config)
    ),
  }
}

export function buildChunkFromTemplate(
  chunkIndex: number,
  previousRow: number,
  template: TerrainChunkTemplate,
  config: TerrainGeneratorConfig,
  random: TerrainRandom
): TerrainChunkSpec {
  const difficulty = getTerrainDifficultyParams(chunkIndex)
  const widthTiles = resolveMainWidth(
    template,
    difficulty.widthPenaltyTiles,
    config,
    random
  )
  const maxStartOffset = Math.max(0, config.chunkWidthTiles - widthTiles)
  const gapTiles = resolveEntryGap(template, difficulty.gapTilesBonus, random)
  const localTileX = Math.min(gapTiles, maxStartOffset)
  const nextRow = resolveNextRow(
    previousRow,
    template,
    difficulty,
    config,
    random
  )

  const platforms: TerrainPlatformSpec[] = [
    {
      localTileX,
      topRow: nextRow,
      widthTiles,
      bodyDepthTiles: getBodyDepthTiles(nextRow, config),
      role: 'main',
    },
  ]

  const floatingChance =
    (template.floatingPlatformChance ?? 0) +
    difficulty.floatingPlatformChanceBonus

  if (
    (template.archetype === 'floating-chain' ||
      random.nextFloat() < floatingChance) &&
    widthTiles >= 6
  ) {
    const floatingWidth = random.randomInRange(
      template.floatingWidthRange,
      [2, 3]
    )
    const floatingOffset = random.randomInRange(
      template.floatingHeightRange,
      [2, 3]
    )
    const floatingRow = clampRow(nextRow - floatingOffset, config)
    const floatingStartMin = Math.min(
      maxStartOffset,
      Math.max(0, localTileX + 1)
    )
    const floatingStartMax = Math.max(
      floatingStartMin,
      Math.min(
        config.chunkWidthTiles - floatingWidth,
        localTileX + widthTiles - floatingWidth
      )
    )

    platforms.push({
      localTileX: random.randomInt(floatingStartMin, floatingStartMax),
      topRow: floatingRow,
      widthTiles: Math.min(floatingWidth, config.chunkWidthTiles),
      bodyDepthTiles: 2,
      role: 'floating',
    })
  }

  return {
    chunkIndex,
    startTileX: chunkIndex * config.chunkWidthTiles,
    templateId: template.id,
    biome: template.biome,
    archetype: template.archetype,
    entryRow: previousRow,
    exitRow: nextRow,
    platforms: platforms.filter(
      (platform) =>
        platform.widthTiles > 0 && platform.localTileX < config.chunkWidthTiles
    ),
  }
}

export function resolveOpeningSpawnSurfaceRow(
  config: TerrainGeneratorConfig
): number {
  const openingTemplate = OPENING_TERRAIN_CHUNK_TEMPLATES[0]

  if (!openingTemplate?.explicitPlatforms?.length) {
    return config.baselineSurfaceRow
  }

  const spawnTileX = Math.floor(config.chunkWidthTiles * 0.4)
  const matchingPlatform = openingTemplate.explicitPlatforms.find(
    (platform) =>
      platform.localTileX <= spawnTileX &&
      platform.localTileX + platform.widthTiles > spawnTileX &&
      platform.role === 'main'
  )

  return clampRow(
    matchingPlatform?.topRow ?? openingTemplate.explicitPlatforms[0].topRow,
    config
  )
}

function resolveMainWidth(
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

function resolveEntryGap(
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

function resolveNextRow(
  previousRow: number,
  template: TerrainChunkTemplate,
  difficulty: ReturnType<typeof getTerrainDifficultyParams>,
  config: TerrainGeneratorConfig,
  random: TerrainRandom
): number {
  switch (template.archetype) {
    case 'step-up': {
      const rolledStep = random.randomInRange(template.rowDeltaRange, [1, 2])
      const maxAllowedStep = Math.min(
        config.maxUpStepTiles + difficulty.verticalStepBonus,
        previousRow - config.minSurfaceRow
      )
      const step = Math.max(
        1,
        Math.min(rolledStep, Math.max(1, maxAllowedStep))
      )
      return clampRow(previousRow - step, config)
    }

    case 'step-down': {
      const rolledStep = random.randomInRange(template.rowDeltaRange, [1, 2])
      const maxAllowedStep = Math.min(
        config.maxDownStepTiles + difficulty.verticalStepBonus,
        config.maxSurfaceRow - previousRow
      )
      const step = Math.max(
        1,
        Math.min(rolledStep, Math.max(1, maxAllowedStep))
      )
      return clampRow(previousRow + step, config)
    }

    case 'recovery': {
      const direction = Math.sign(config.baselineSurfaceRow - previousRow)

      if (direction === 0) {
        return previousRow
      }

      const rolledStep = random.randomInRange(template.rowDeltaRange, [1, 2])
      const step = Math.max(1, rolledStep + difficulty.recoveryStepTiles - 1)

      return clampRow(previousRow + direction * step, config)
    }

    case 'flat':
    case 'gap':
    case 'floating-chain':
    default: {
      const rowDelta = random.randomInRange(template.rowDeltaRange, [0, 0])
      return clampRow(previousRow + rowDelta, config)
    }
  }
}

function toPlatformSpec(
  platform: TerrainTemplatePlatformLayout,
  config: TerrainGeneratorConfig
): TerrainPlatformSpec {
  const topRow = clampRow(platform.topRow, config)

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

function clampRow(row: number, config: TerrainGeneratorConfig): number {
  return Math.max(config.minSurfaceRow, Math.min(config.maxSurfaceRow, row))
}

function getBodyDepthTiles(
  topRow: number,
  config: TerrainGeneratorConfig
): number {
  return Math.max(2, config.playfieldBottomRow - topRow)
}
