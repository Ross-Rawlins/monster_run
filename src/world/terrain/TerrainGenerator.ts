import { OPENING_TERRAIN_CHUNK_TEMPLATES } from './terrainChunkTemplates'
import {
  buildChunkFromTemplate,
  createOpeningChunk,
  resolveOpeningSpawnSurfaceRow,
} from './terrainChunkBuilder'
import {
  TerrainChunkSpec,
  TerrainGeneratorConfig,
} from './types/terrainGeneratorTypes'
import { TerrainRandom } from './terrainRandom'
import { pickTerrainTemplate } from './terrainTemplateSelection'

export type {
  TerrainChunkSpec,
  TerrainGeneratorConfig,
  TerrainPlatformSpec,
} from './types/terrainGeneratorTypes'

interface GeneratorState {
  lastExitRow: number
}

export class TerrainGenerator {
  private readonly chunks = new Map<number, TerrainChunkSpec>()

  private readonly state: GeneratorState

  private highestChunkIndex = -1

  private readonly random: TerrainRandom

  private readonly spawnSurfaceRow: number

  constructor(
    private readonly config: TerrainGeneratorConfig,
    seed: number = Date.now()
  ) {
    this.state = {
      lastExitRow: config.baselineSurfaceRow,
    }

    this.spawnSurfaceRow = resolveOpeningSpawnSurfaceRow(config)
    this.random = new TerrainRandom(seed)
  }

  public reset(seed: number): void {
    this.chunks.clear()
    this.highestChunkIndex = -1
    this.state.lastExitRow = this.config.baselineSurfaceRow
    this.random.setSeed(seed)
  }

  public getChunk(chunkIndex: number): TerrainChunkSpec {
    while (this.highestChunkIndex < chunkIndex) {
      const nextChunkIndex = this.highestChunkIndex + 1
      const nextChunk = this.buildChunk(nextChunkIndex)

      this.chunks.set(nextChunkIndex, nextChunk)
      this.highestChunkIndex = nextChunkIndex
      this.state.lastExitRow = nextChunk.exitRow
    }

    const chunk = this.chunks.get(chunkIndex)

    if (!chunk) {
      throw new Error(`Missing terrain chunk ${chunkIndex}`)
    }

    return chunk
  }

  public getSpawnSurfaceY(worldTileSize: number): number {
    return (
      (this.config.playfieldBottomRow - this.spawnSurfaceRow) * worldTileSize
    )
  }

  private buildChunk(chunkIndex: number): TerrainChunkSpec {
    if (chunkIndex < OPENING_TERRAIN_CHUNK_TEMPLATES.length) {
      return createOpeningChunk(chunkIndex, this.config)
    }

    const previousRow = this.state.lastExitRow

    return buildChunkFromTemplate(
      chunkIndex,
      previousRow,
      pickTerrainTemplate(chunkIndex, () => this.random.nextFloat()),
      this.config,
      this.random
    )
  }
}
