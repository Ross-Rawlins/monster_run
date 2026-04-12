import { GROUND_GENERATION_CONSTRAINTS } from './GroundRules'
import { Tile } from '../TileTypes'
import { randomInt } from '../generators/GenerationMath'

interface GroundGeneratorOptions {
  width: number
  height: number
  random: () => number
}

export class GroundGenerator {
  private readonly width: number
  private readonly height: number
  private readonly random: () => number

  constructor(options: GroundGeneratorOptions) {
    this.width = options.width
    this.height = options.height
    this.random = options.random
  }

  public placeGround(tiles: Tile[][], seededLeftColumn: Tile[] | null): void {
    let x = 0
    let currentHeight =
      this.resolveSeededGroundHeight(seededLeftColumn) ??
      randomInt(
        GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles,
        GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles,
        this.random
      )
    let lastRunType: 'ground' | 'gap' | null = null

    while (x < this.width) {
      const remaining = this.width - x

      if (remaining < GROUND_GENERATION_CONSTRAINTS.minSegmentLength) {
        if (lastRunType === 'gap') {
          // Extend the previous gap so it cannot end up as a 1-column gap.
          x = this.width
        } else {
          // Extend current ground run so it cannot end up as a 1-column ground segment.
          for (let col = x; col < this.width; col += 1) {
            this.paintGroundColumn(tiles, col, currentHeight)
          }
          x = this.width
        }
        break
      }

      const canPlaceGap =
        x >= GROUND_GENERATION_CONSTRAINTS.minimumStartingSolidColumns &&
        remaining >= GROUND_GENERATION_CONSTRAINTS.minGapSize
      const leavesRoomForGroundAfterGap =
        remaining - GROUND_GENERATION_CONSTRAINTS.minGapSize >=
        GROUND_GENERATION_CONSTRAINTS.minSegmentLength
      const canEndChunkWithValidGap =
        remaining >= GROUND_GENERATION_CONSTRAINTS.minGapSize &&
        remaining <= GROUND_GENERATION_CONSTRAINTS.maxGapSize
      const shouldPlaceGap =
        canPlaceGap &&
        (leavesRoomForGroundAfterGap || canEndChunkWithValidGap) &&
        this.random() < GROUND_GENERATION_CONSTRAINTS.gapChancePerSegment

      if (shouldPlaceGap) {
        const maxGapWidth = Math.min(
          GROUND_GENERATION_CONSTRAINTS.maxGapSize,
          remaining
        )
        const gapWidth = randomInt(
          GROUND_GENERATION_CONSTRAINTS.minGapSize,
          maxGapWidth,
          this.random
        )
        x += gapWidth
        lastRunType = 'gap'
        continue
      }

      const maxSegmentWidth = Math.min(
        GROUND_GENERATION_CONSTRAINTS.maxSegmentLength,
        remaining
      )
      const segmentLength = randomInt(
        GROUND_GENERATION_CONSTRAINTS.minSegmentLength,
        maxSegmentWidth,
        this.random
      )

      const nextHeight = this.buildNextHeight(currentHeight)

      for (let i = 0; i < segmentLength; i += 1) {
        const t = segmentLength === 1 ? 1 : i / (segmentLength - 1)
        const interpolatedHeight = Math.round(
          currentHeight + (nextHeight - currentHeight) * t
        )
        this.paintGroundColumn(tiles, x + i, interpolatedHeight)
      }

      x += segmentLength
      currentHeight = nextHeight
      lastRunType = 'ground'
    }
  }

  private buildNextHeight(currentHeight: number): number {
    const stepDelta = randomInt(
      0,
      GROUND_GENERATION_CONSTRAINTS.maxHeightStepDeltaRows,
      this.random
    )
    const direction = this.random() < 0.5 ? -1 : 1
    const next = currentHeight + stepDelta * direction

    return Math.max(
      GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles,
      Math.min(next, GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles)
    )
  }

  private resolveSeededGroundHeight(
    seededLeftColumn: Tile[] | null
  ): number | null {
    if (!seededLeftColumn) {
      return null
    }

    let height = 0
    for (let row = this.height - 1; row >= 0; row -= 1) {
      if (seededLeftColumn[row] !== Tile.GROUND) {
        break
      }
      height += 1
    }

    if (height < GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles) {
      return null
    }

    return Math.min(height, GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles)
  }

  private paintGroundColumn(
    tiles: Tile[][],
    column: number,
    heightTiles: number
  ): void {
    const clampedHeight = Math.max(
      GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles,
      Math.min(heightTiles, GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles)
    )

    const startRow = this.height - clampedHeight
    for (let row = startRow; row < this.height; row += 1) {
      tiles[row][column] = Tile.GROUND
    }
  }
}
