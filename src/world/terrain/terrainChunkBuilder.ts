import { getTerrainDifficultyParams } from './terrainDifficultyScale'
import {
  OPENING_TERRAIN_CHUNK_TEMPLATES,
  TerrainChunkTemplate,
} from './terrainChunkTemplates'
import {
  TerrainChunkSpec,
  TerrainGeneratorConfig,
  TerrainPlatformSpec,
} from './types/terrainGeneratorTypes'
import { TerrainRandom } from './terrainRandom'
import {
  clampTerrainRow,
  createFloatingPlatform,
  getBodyDepthTiles,
  resolveEntryGap,
  resolveMainWidth,
  resolveNextRow,
  toPlatformSpec,
} from './terrainChunkBuilderUtils'

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

  const floatingPlatform = createFloatingPlatform(
    template,
    widthTiles,
    localTileX,
    nextRow,
    maxStartOffset,
    difficulty,
    config,
    random
  )

  if (floatingPlatform) {
    platforms.push(floatingPlatform)
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

  return clampTerrainRow(
    matchingPlatform?.topRow ?? openingTemplate.explicitPlatforms[0].topRow,
    config
  )
}
